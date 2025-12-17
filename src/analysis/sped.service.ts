import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import { parseRegistro0000 } from './parsers/registro-0000.parser';
import { parseRegistro0200 } from './parsers/registro-0200.parser';
import { parseRegistroC100 } from './parsers/registro-c100.parser';
import { parseRegistroC170 } from './parsers/registro-c170.parser';
import { Registro0200, Registro0400, RegistroC100, RegistroC170, RegistroC190 } from './parsers/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnalisesDisponiveis } from './analisesSped/analises-disponiveis';
import { parseRegistroC190 } from './parsers/registro-c190.parser';
import { getOrCreateAnalysisType } from './utils/getOrCreateAnalysisType';
import { ensureAnalysisFields } from './utils/ensureAnalysisFields';
import { AnalysisDataType } from '@prisma/client';
import { parseRegistro0400 } from './parsers/registro-0400.parser';

type ListSpedArquivosArgs = {
  lojas?: number[];
  dataInicial?: string; // YYYY-MM-DD
  dataFinal?: string;   // YYYY-MM-DD
  page?: number;
  pageSize?: number;
};

@Injectable()
export class SpedService {
  constructor(private prisma: PrismaService) {}
  // Detecta AnalysisDataType com base no valor
  private detectDataType(v: any): 'string' | 'int' | 'decimal' | 'boolean' | 'date' | 'datetime' {
    if (v === null || v === undefined) return 'string';
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'decimal';
    if (v instanceof Date) return (v.getUTCHours() || v.getUTCMinutes() || v.getUTCSeconds()) ? 'datetime' : 'date';
    if (typeof v === 'string') {
      const asNum = Number(v);
      if (!Number.isNaN(asNum)) return Number.isInteger(asNum) ? 'int' : 'decimal';
      const asDate = new Date(v);
      if (!isNaN(asDate.getTime())) return (asDate.getUTCHours() || asDate.getUTCMinutes() || asDate.getUTCSeconds()) ? 'datetime' : 'date';
    }
    return 'string';
  }

  // Constrói definições de campos a partir dos erros (fallback se a análise não declarar fields)
  private buildFieldDefsFromErrors(erros: any[]): Array<{ name: string; description: string; order: number; dataType: any }> {
    const preferred = ['cfop','erro','chave','numDoc','codItem','tipoItem','cstICMS','codPart'];
    const keys = new Set<string>();
    for (const e of erros || []) for (const k of Object.keys(e || {})) keys.add(k);
    const ordered = [
      ...preferred.filter(k => keys.has(k)),
      ...Array.from(keys).filter(k => !preferred.includes(k)).sort()
    ];
    const pickSample = (name: string) => {
      for (const e of erros || []) if (e && name in e) return (e as any)[name];
      return null;
    };
    return ordered.map((name, i) => ({
      name,
      description: name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\s+/g, ' ').trim(),
      order: i,
      dataType: this.detectDataType(pickSample(name)),
    }));
  }

  private firstDayOfMonthUTC(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  /**
   * Processa um arquivo SPED linha por linha,
   * executa as análises disponíveis e salva os resultados no banco.
   */
  async processarArquivo(filePath: string, fileName: string, userId: number): Promise<any> {
    const arquivo = await this.prisma.arquivoAnalise.create({
      data: {
        arquivoNome: fileName,
        mesRef: new Date(),
        userId: userId,
        storeId: 0,
        statusAnaliseId: 2, // Carregando...
      },
    });

    try {
      // Cria um stream para leitura do arquivo linha a linha
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      // Mapa que agrupa C100 e seus respectivos C170
      const notas = new Map<string, { c100: RegistroC100; itens: RegistroC170[]; resumosC190: RegistroC190[] }>();
      let chaveAtual: string | null = null;
      let cnpjLoja: string | null = null;
      let dtFin: string | null = null;

      const itens0200 = new Map<string, Registro0200>();
      const R0400 = new Map<string, Registro0400>()

      const modelosValidos = ['01', '1B', '04', '55', '65']; // Modelos permitidos para análise

      // Leitura do arquivo linha por linha
      for await (const line of rl) {
        const tipo = line.split('|')[1];

        // Captura o CNPJ da loja (registro 0000)
        if (tipo === '0000') {
          const { CNPJ, DT_FIN } = parseRegistro0000(line);
          cnpjLoja = CNPJ;
          dtFin = DT_FIN;
        }

        // Registro 0200: itens
        if (tipo === '0200') {
          const r0200 = parseRegistro0200(line);
          itens0200.set(r0200.COD_ITEM, r0200);
        }

        // Registro 0400:  TABELA DE NATUREZA DA OPERAÇÃO/PRESTAÇÃO
        if(tipo === '0400') {
          const r0400 = parseRegistro0400(line);
          R0400.set(r0400.COD_NAT, r0400)
        }

        // Registro C100: inicia uma nova nota
        if (tipo === 'C100') {
          const c100 = parseRegistroC100(line);

          // Ignora modelos que não estão na lista
          if (!modelosValidos.includes(c100.COD_MOD)) {
            chaveAtual = null;
            continue;
          }

          chaveAtual = c100.CHV_NFE;
          notas.set(chaveAtual, { c100, itens: [], resumosC190: [] });
        }

        // Registro C170: adiciona item à nota corrente
        if (tipo === 'C170' && chaveAtual) {
          const c170 = parseRegistroC170(line, chaveAtual);
          notas.get(chaveAtual)?.itens.push(c170);
        }

        // Registro C190: adiciona o resumo à nota corrente
        if (tipo === 'C190' && chaveAtual) {
          const c190 = parseRegistroC190(line, chaveAtual)
          notas.get(chaveAtual)?.resumosC190.push(c190)
        }
      }

      // Garante que o CNPJ foi encontrado
      if (!cnpjLoja) {
        throw new Error('CNPJ não encontrado no registro 0000.');
      }

      // Busca a loja correspondente no banco
      const store = await this.prisma.store.findUnique({
        where: { cnpj: cnpjLoja },
      });

      if (!store) {
        throw new Error(`Loja com CNPJ ${cnpjLoja} não encontrada.`);
      }

      const resultados: any[] = [];

      // Executa todas as análises definidas em AnalisesDisponiveis
      for (const analise of AnalisesDisponiveis) {
        // Garante que o tipo de análise existe no banco
        const tipo = await getOrCreateAnalysisType(this.prisma, {code: analise.code, description: analise.description, groupName: analise.groupName});
        await ensureAnalysisFields(this.prisma, tipo.id, analise.fields.map((field) => {return {key: field.name, label: field.description, dataType: field.dataType as AnalysisDataType, order: field.order}}))
        
        // Executa a análise passando todas as notas lidas
        const erros = analise.execute(notas, itens0200, R0400);

        // Salva o resultado da análise no banco
        // Cache unificado: grava em AnalysisResult (granularity: 'month')
        try {
          const arq = await this.prisma.arquivoAnalise.findUnique({ where: { id: arquivo.id }, select: { storeId: true, mesRef: true } });
          const storeId = arq?.storeId ?? null;
          const bucket = arq?.mesRef ? this.firstDayOfMonthUTC(new Date(arq.mesRef)) : new Date();

          const fieldDefs = (analise as any)?.fields && (analise as any).fields.length ? (analise as any).fields : this.buildFieldDefsFromErrors(erros);
          
          await this.prisma.analysisResult.create({
            data: {
              analysisTypeId: tipo.id,
              storeId,              // se aplicável
              bucket, // 1º dia do mês 00:00Z
              granularity: 'month',
              data: { fields: fieldDefs, errors: erros, summary: { totalNotas: notas.size, notasComErro: tipo.groupName === 'Relatórios SPED' ? 0 : erros.length } },  // seu payload { fields, errors, summary }
              sourceStart: arq?.mesRef ? this.firstDayOfMonthUTC(new Date(arq.mesRef)) : null,
              sourceEnd: arq?.mesRef ? new Date(Date.UTC(new Date(arq.mesRef).getUTCFullYear(), new Date(arq.mesRef).getUTCMonth()+1, 0, 23,59,59)) : null,
              arquivoAnaliseId: arquivo.id,
            },
          });
        } catch {}
      
        // Adiciona ao resumo de resultados
        resultados.push({
          tipo: analise.code,
          descricao: analise.description,
          totalNotas: notas.size,
          notasComErro: erros.length,
        });
      }

       await this.prisma.arquivoAnalise.update({
        where: { 
          id: arquivo.id },
        data: { 
          mesRef: new Date(dtFin.slice(4, 8) + '-' + dtFin.slice(2, 4) + '-' + dtFin.slice(0, 2)),
          storeId: store.id,
          statusAnaliseId: 1 
        }, // Processo Finalizado
      });

      // Retorna um resumo com os dados da loja e resultados das análises
      return {
        loja: store.storeName,
        totalAnalises: resultados.length,
        resultados,
      };
    } catch (error) {
      await this.prisma.arquivoAnalise.update({
        where: { id: arquivo.id },
        data: { statusAnaliseId: 0 }, // Erro
      });
      throw error;
    }
  }

  async getArquivoAnalise(args: ListSpedArquivosArgs) {
    const { lojas, dataInicial, dataFinal } = args;
    const page = Math.max(1, args.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 20));

    // monta filtro
    const where = {
      ...(lojas && lojas.length ? { storeId: { in: lojas } } : {}),
      ...(dataInicial || dataFinal
        ? {
            mesRef: {
              gte: dataInicial ? new Date(`${dataInicial}T00:00:00.000Z`) : undefined,
              lte: dataFinal ? new Date(`${dataFinal}T23:59:59.999Z`) : undefined,
            },
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.arquivoAnalise.count({ where }),
      this.prisma.arquivoAnalise.findMany({
        where,
        orderBy: { dataImportacao: 'desc' },
        include: {
          user: { select: { name: true } },
          store: { select: { storeName: true } },
          statusAnalise: { select: { descricao: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  getSpedAnalise(arquivoAnaliseId: number) {
    return this.prisma.analysisResult.findMany({
      where: { arquivoAnaliseId, granularity: 'month' },
      include: { analysisType: { select: { code: true, description: true, groupName: true } } }
    });
  }
}