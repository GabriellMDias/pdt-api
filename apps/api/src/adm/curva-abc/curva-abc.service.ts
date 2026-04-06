import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { PgService } from "src/db/pg/pg.service";
import { PrismaService } from "src/db/prisma/prisma.service";
import { CurvaAbcQueryDto } from "./dto/curva-abc.query.dto";

type LinhaCurvaAbc = {
  id_produto: number;
  descricao: string;
  quantidade: number;
  venda: number;
  lucro: number;
  mercadologico1: number | null;
  mercadologico1_descricao: string | null;
  mercadologico2: number | null;
  mercadologico2_descricao: string | null;
};

type ClasseCurvaAbc = "A" | "B" | "C";

type CampoCurvaAbc = "quantidade" | "venda" | "lucro";

type ParMercadologico = {
  mercadologico1: number;
  mercadologico2: number;
};

type LinhaCurvaAbcClassificada = LinhaCurvaAbc & {
  curva_abc_volume_mercadologico1: ClasseCurvaAbc;
  curva_abc_venda_mercadologico1: ClasseCurvaAbc;
  curva_abc_lucro_mercadologico1: ClasseCurvaAbc;
  curva_abc_volume_mercadologico2: ClasseCurvaAbc;
  curva_abc_venda_mercadologico2: ClasseCurvaAbc;
  curva_abc_lucro_mercadologico2: ClasseCurvaAbc;
};

type ResultadoClassificacaoCurvaAbc = Pick<
  LinhaCurvaAbcClassificada,
  | "curva_abc_volume_mercadologico1"
  | "curva_abc_venda_mercadologico1"
  | "curva_abc_lucro_mercadologico1"
  | "curva_abc_volume_mercadologico2"
  | "curva_abc_venda_mercadologico2"
  | "curva_abc_lucro_mercadologico2"
>;

type ConfiguracaoClassificacaoCurvaAbc = {
  campo: CampoCurvaAbc;
  propriedade: keyof ResultadoClassificacaoCurvaAbc;
};

type ParametrosConsultaCurvaAbc = [string, string, number[], string[] | null];

const CODIGO_PERMISSAO = "curva-abc:consultar";
const CONFIGURACOES_CLASSIFICACAO_MERCADOLOGICO1: readonly ConfiguracaoClassificacaoCurvaAbc[] =
  [
    {
      campo: "quantidade",
      propriedade: "curva_abc_volume_mercadologico1",
    },
    {
      campo: "venda",
      propriedade: "curva_abc_venda_mercadologico1",
    },
    {
      campo: "lucro",
      propriedade: "curva_abc_lucro_mercadologico1",
    },
  ];
const CONFIGURACOES_CLASSIFICACAO_MERCADOLOGICO2: readonly ConfiguracaoClassificacaoCurvaAbc[] =
  [
    {
      campo: "quantidade",
      propriedade: "curva_abc_volume_mercadologico2",
    },
    {
      campo: "venda",
      propriedade: "curva_abc_venda_mercadologico2",
    },
    {
      campo: "lucro",
      propriedade: "curva_abc_lucro_mercadologico2",
    },
  ];

const CONSULTA_CURVA_ABC = `
SELECT
  venda.id_produto,
  venda.descricaocompleta AS descricao,
  SUM(venda.quantidade) AS quantidade,
  ROUND(SUM(venda.valortotal), 4) AS venda,
  COALESCE(
    ROUND(SUM(venda.valortotal), 4)
    - ROUND(SUM(venda.quantidade * venda.customediosemimposto), 4)
    - ROUND(SUM(venda.valortotal * (venda.icmsdebito / 100)), 4)
    - ROUND(
        SUM(
          CASE
            WHEN a.situacaotributaria = 0 OR a.situacaotributaria = 20
              THEN (
                (venda.valortotal - (venda.valortotal * (venda.icmsdebito / 100)))
                * (venda.piscofins / 100)
              )
            ELSE (venda.valortotal * (venda.piscofins / 100))
          END
        ),
        4
      )
    - ROUND(SUM(venda.valortotal * (venda.operacional / 100)), 4)
    - ROUND(SUM(venda.valortotal * (0.0 / 100)), 4),
    0
  ) AS lucro,
  venda.mercadologico1,
  venda.mercadologico1_descricao,
  venda.mercadologico2,
  venda.mercadologico2_descricao
FROM (
  SELECT
    venda.id,
    venda.data,
    venda.id_produto,
    venda.quantidade,
    venda.custocomimposto,
    venda.valortotal,
    venda.icmsdebito,
    venda.icmscredito,
    venda.piscofinscredito,
    venda.piscofins,
    venda.operacional,
    SUM(sellout.valor) AS valorsellout,
    venda.custosemimposto,
    venda.precovenda,
    venda.customediocomimposto,
    venda.customediosemimposto,
    comprador.id AS id_comprador,
    venda.id_loja,
    loja.descricao AS loja,
    produto.mercadologico1,
    produto.mercadologico2,
    produto.mercadologico3,
    produto.mercadologico4,
    produto.mercadologico5,
    mercadologico.descricao AS mercadologico1_descricao,
    mercadologico2.descricao AS mercadologico2_descricao,
    comprador.nome AS comprador,
    produto.id_fornecedorfabricante,
    fornecedor.razaosocial AS fornecedor,
    produto.descricaocompleta,
    produto.id_tipoembalagem
  FROM venda
  INNER JOIN produto
    ON venda.id_produto = produto.id
  INNER JOIN mercadologico
    ON mercadologico.mercadologico1 = produto.mercadologico1
    AND mercadologico.nivel = 1
  INNER JOIN mercadologico AS mercadologico2
    ON mercadologico2.mercadologico1 = produto.mercadologico1
    AND mercadologico2.mercadologico2 = produto.mercadologico2
    AND mercadologico2.nivel = 2
  INNER JOIN comprador
    ON comprador.id = venda.id_comprador
  INNER JOIN loja
    ON loja.id = venda.id_loja
  INNER JOIN fornecedor
    ON fornecedor.id = produto.id_fornecedorfabricante
  LEFT JOIN (
    SELECT
      SUM(vsoi.valor) AS valor,
      vsoi.id_produto,
      vso.datainicio,
      vso.datatermino,
      vsol.id_loja
    FROM verbaselloutitem vsoi
    LEFT JOIN verbasellout vso
      ON vso.id = vsoi.id_verbasellout
    LEFT JOIN verbaselloutloja vsol
      ON vso.id = vsol.id_verbasellout
    GROUP BY
      vsoi.id_produto,
      vso.datainicio,
      vso.datatermino,
      vsol.id_loja
  ) AS sellout
    ON venda.id_produto = sellout.id_produto
    AND venda.data BETWEEN sellout.datainicio AND sellout.datatermino
    AND venda.id_loja = sellout.id_loja
  WHERE venda.id_loja = ANY($3::int[])
    AND venda.data >= $1::date
    AND venda.data < ($2::date + INTERVAL '1 day')
    AND venda.quantidade > 0
    AND (
      $4::text[] IS NULL
      OR CONCAT(produto.mercadologico1, ':', produto.mercadologico2) = ANY($4::text[])
    )
  GROUP BY
    venda.id,
    venda.data,
    venda.id_produto,
    venda.quantidade,
    venda.custocomimposto,
    venda.valortotal,
    venda.icmsdebito,
    venda.icmscredito,
    venda.piscofinscredito,
    venda.piscofins,
    venda.operacional,
    venda.custosemimposto,
    venda.precovenda,
    venda.customediocomimposto,
    venda.customediosemimposto,
    comprador.id,
    venda.id_loja,
    loja.descricao,
    produto.mercadologico1,
    produto.mercadologico2,
    produto.mercadologico3,
    produto.mercadologico4,
    produto.mercadologico5,
    mercadologico.descricao,
    mercadologico2.descricao,
    comprador.nome,
    produto.id_fornecedorfabricante,
    fornecedor.razaosocial,
    produto.descricaocompleta,
    produto.id_tipoembalagem
) AS venda
INNER JOIN loja AS l
  ON l.id = venda.id_loja
INNER JOIN fornecedor AS fl
  ON fl.id = l.id_fornecedor
INNER JOIN produtoaliquota AS pa
  ON pa.id_produto = venda.id_produto
  AND pa.id_estado = fl.id_estado
INNER JOIN aliquota AS a
  ON a.id = pa.id_aliquotaconsumidor
GROUP BY
  venda.id_produto,
  venda.descricaocompleta,
  venda.mercadologico1,
  venda.mercadologico2,
  venda.mercadologico1_descricao,
  venda.mercadologico2_descricao
ORDER BY venda.descricaocompleta;
`;

@Injectable()
export class CurvaAbcService {
  constructor(
    private readonly pg: PgService,
    private readonly prisma: PrismaService,
  ) {}

  async run(userId: number, dto: CurvaAbcQueryDto) {
    this.validarIntervaloDatas(dto.initialDate, dto.finalDate);
    const idsLoja = this.normalizarIdsLoja(dto.storeId);
    const paresMercadologicos = this.normalizarParesMercadologicos(
      dto.mercadologicoPair,
    );
    await this.validarPermissaoLojas(userId, idsLoja);

    const parametros: ParametrosConsultaCurvaAbc = [
      dto.initialDate,
      dto.finalDate,
      idsLoja,
      paresMercadologicos,
    ];

    try {
      const { rows } = await this.pg.query<
        LinhaCurvaAbc,
        ParametrosConsultaCurvaAbc
      >(CONSULTA_CURVA_ABC, parametros);

      return this.adicionarClassificacoesCurvaAbc(rows);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error("Database query failed at curva abc report:", error);
      throw new InternalServerErrorException(
        "Falha ao gerar relatorio Curva ABC. Tente novamente mais tarde.",
      );
    }
  }

  private adicionarClassificacoesCurvaAbc(
    linhas: LinhaCurvaAbc[],
  ): LinhaCurvaAbcClassificada[] {
    const classificacoesPorLinha = new Map<
      LinhaCurvaAbc,
      ResultadoClassificacaoCurvaAbc
    >(linhas.map((linha) => [linha, {} as ResultadoClassificacaoCurvaAbc]));

    const gruposMercadologico1 = this.agruparLinhas(
      linhas,
      this.obterChaveMercadologico1,
    );
    const gruposMercadologico2 = this.agruparLinhas(
      linhas,
      this.obterChaveMercadologico2,
    );

    this.aplicarClassificacoesPorGrupo(
      gruposMercadologico1,
      CONFIGURACOES_CLASSIFICACAO_MERCADOLOGICO1,
      classificacoesPorLinha,
    );
    this.aplicarClassificacoesPorGrupo(
      gruposMercadologico2,
      CONFIGURACOES_CLASSIFICACAO_MERCADOLOGICO2,
      classificacoesPorLinha,
    );

    return linhas.map((linha) => ({
      ...linha,
      ...classificacoesPorLinha.get(linha)!,
    }));
  }

  private aplicarClassificacoesPorGrupo(
    grupos: Map<string, LinhaCurvaAbc[]>,
    configuracoes: readonly ConfiguracaoClassificacaoCurvaAbc[],
    classificacoesPorLinha: Map<LinhaCurvaAbc, ResultadoClassificacaoCurvaAbc>,
  ) {
    for (const linhasGrupo of grupos.values()) {
      for (const configuracao of configuracoes) {
        const classificacoesDoGrupo = this.classificarGrupoPorCampo(
          linhasGrupo,
          configuracao.campo,
        );

        for (const [linha, classe] of classificacoesDoGrupo) {
          classificacoesPorLinha.get(linha)![configuracao.propriedade] = classe;
        }
      }
    }
  }

  private classificarGrupoPorCampo(
    linhasGrupo: LinhaCurvaAbc[],
    campo: CampoCurvaAbc,
  ): Map<LinhaCurvaAbc, ClasseCurvaAbc> {
    const classificacoesPorLinha = new Map<LinhaCurvaAbc, ClasseCurvaAbc>();
    const totalGrupo = linhasGrupo.reduce(
      (total, linha) => total + linha[campo],
      0,
    );

    const linhasOrdenadas = [...linhasGrupo].sort(
      (linhaAtual, proximaLinha) => proximaLinha[campo] - linhaAtual[campo],
    );

    let indiceAtual = 0;
    let acumuladoGrupo = 0;

    while (indiceAtual < linhasOrdenadas.length) {
      const valorAtual = linhasOrdenadas[indiceAtual][campo];
      let indiceFinalFaixa = indiceAtual;
      let somaFaixa = 0;

      while (
        indiceFinalFaixa < linhasOrdenadas.length &&
        linhasOrdenadas[indiceFinalFaixa][campo] === valorAtual
      ) {
        somaFaixa += linhasOrdenadas[indiceFinalFaixa][campo];
        indiceFinalFaixa += 1;
      }

      acumuladoGrupo += somaFaixa;
      const classe = this.classificarRazaoAbc(acumuladoGrupo / totalGrupo);

      for (
        let indiceFaixa = indiceAtual;
        indiceFaixa < indiceFinalFaixa;
        indiceFaixa += 1
      ) {
        classificacoesPorLinha.set(linhasOrdenadas[indiceFaixa], classe);
      }

      indiceAtual = indiceFinalFaixa;
    }

    return classificacoesPorLinha;
  }

  private classificarRazaoAbc(razaoAcumulada: number): ClasseCurvaAbc {
    if (razaoAcumulada <= 0.5) {
      return "A";
    }

    if (razaoAcumulada <= 0.75) {
      return "B";
    }

    return "C";
  }

  private agruparLinhas(
    linhas: LinhaCurvaAbc[],
    obterChave: (linha: LinhaCurvaAbc) => string,
  ) {
    const grupos = new Map<string, LinhaCurvaAbc[]>();

    for (const linha of linhas) {
      const chaveGrupo = obterChave(linha);
      const linhasGrupo = grupos.get(chaveGrupo);
      if (linhasGrupo) {
        linhasGrupo.push(linha);
        continue;
      }

      grupos.set(chaveGrupo, [linha]);
    }

    return grupos;
  }

  private obterChaveMercadologico1(linha: LinhaCurvaAbc) {
    return String(linha.mercadologico1);
  }

  private obterChaveMercadologico2(linha: LinhaCurvaAbc) {
    return `${linha.mercadologico1}:${linha.mercadologico2}`;
  }

  private normalizarIdsLoja(storeIds: number[]) {
    return [...new Set(storeIds)];
  }

  private normalizarParesMercadologicos(pares?: string[]) {
    if (!pares?.length) {
      return null;
    }

    const paresNormalizados = new Set(
      pares.map((par) => this.serializarParMercadologico(par)),
    );

    return Array.from(paresNormalizados).sort((atual, proximo) =>
      atual.localeCompare(proximo, "pt-BR"),
    );
  }

  private serializarParMercadologico(par: string) {
    const parMercadologico = this.parseParMercadologico(par);
    return `${parMercadologico.mercadologico1}:${parMercadologico.mercadologico2}`;
  }

  private parseParMercadologico(par: string): ParMercadologico {
    const match = /^(\d+):(\d+)$/.exec(String(par).trim());
    if (!match) {
      throw new BadRequestException(
        "mercadologicoPair deve estar no formato mercadologico1:mercadologico2.",
      );
    }

    return {
      mercadologico1: Number(match[1]),
      mercadologico2: Number(match[2]),
    };
  }

  private validarIntervaloDatas(initialDate: string, finalDate: string) {
    const dataInicial = this.parseDataSomente(initialDate);
    const dataFinal = this.parseDataSomente(finalDate);

    if (dataInicial.getTime() > dataFinal.getTime()) {
      throw new BadRequestException(
        "initialDate nao pode ser maior que finalDate.",
      );
    }
  }

  private parseDataSomente(value: string): Date {
    const datePart = String(value).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!match) {
      throw new BadRequestException("Datas devem estar no formato YYYY-MM-DD.");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException("Data invalida.");
    }

    return parsed;
  }

  private async validarPermissaoLojas(userId: number, storeIds: number[]) {
    if (userId === 0) {
      return;
    }

    if (!Number.isInteger(userId) || userId < 0) {
      throw new ForbiddenException("Usuario invalido.");
    }

    const grants = await this.prisma.userPermission.findMany({
      where: {
        userId,
        permission: { code: CODIGO_PERMISSAO },
      },
      select: { storeId: true },
    });

    if (grants.some((grant) => grant.storeId === null)) {
      return;
    }

    const allowedStores = new Set(
      grants
        .map((grant) => grant.storeId)
        .filter((storeId): storeId is number => typeof storeId === "number"),
    );

    const deniedStores = storeIds.filter(
      (storeId) => !allowedStores.has(storeId),
    );
    if (deniedStores.length > 0) {
      throw new ForbiddenException(
        `Voce nao tem permissao para consultar as lojas: ${deniedStores.join(", ")}.`,
      );
    }
  }
}
