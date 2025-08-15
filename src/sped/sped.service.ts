import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as readline from 'readline';
import { parseRegistro0000 } from './parsers/registro-0000.parser';
import { parseRegistro0200 } from './parsers/registro-0200.parser';
import { parseRegistroC100 } from './parsers/registro-c100.parser';
import { parseRegistroC170 } from './parsers/registro-c170.parser';
import { Registro0200, RegistroC100, RegistroC170, RegistroC190 } from './parsers/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnalisesDisponiveis } from './analises-disponiveis';
import { parseRegistroC190 } from './parsers/registro-c190.parser';

@Injectable()
export class SpedService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica se o tipo de análise existe no banco.
   * Caso não exista, cria com base no código e descrição fornecidos.
   */
  private async getOrCreateAnalysisType(code: string, description: string, groupName: string) {
    return await this.prisma.analysisType.upsert({
      where: { code },
      update: {}, // Nenhuma atualização é feita se já existir
      create: { code, description, groupName }, // Cria se não existir
    });
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
        const tipo = await this.getOrCreateAnalysisType(analise.code, analise.description, analise.groupName);

        // Executa a análise passando todas as notas lidas
        const erros = analise.execute(notas, itens0200);

        // Salva o resultado da análise no banco
        await this.prisma.spedAnalise.create({
          data: {
            resultadoJson: {
              totalNotas: notas.size,
              notasComErro: erros.length,
              erros,
            },
            analysisTypeId: tipo.id,
            arquivoAnaliseId: arquivo.id, // 🔹 vincula ao ArquivoAnalise
          },
        });

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

  getAllArquivoAnalise() {
    return this.prisma.arquivoAnalise.findMany(
      {
        include: {
                    user: {select: {name: true}}, 
                    store: {select: {storeName: true}}, 
                    statusAnalise: {select: {descricao: true}}
                  },
        orderBy: {dataImportacao: 'desc'}
      }
    )
  }

  getSpedAnalise(arquivoAnaliseId: number) {
    return this.prisma.spedAnalise.findMany(
      {
        where: {arquivoAnaliseId}, 
        include: {analysisType: {select: {code: true, description: true, groupName: true}}}
      }
    )
  }
}
