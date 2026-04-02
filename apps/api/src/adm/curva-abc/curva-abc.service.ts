import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { PgService } from "src/db/pg/pg.service";
import { PrismaService } from "src/db/prisma/prisma.service";
import { CurvaAbcQueryDto } from "./dto/curva-abc.query.dto";

type CurvaAbcRow = {
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

type CurvaAbcQueryParams = [
  string,
  string,
  number[],
  number | null,
  number | null,
];

const PERMISSION_CODE = "curva-abc:consultar";

const CURVA_ABC_QUERY = `
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
    AND ($4::int IS NULL OR produto.mercadologico1 = $4::int)
    AND ($5::int IS NULL OR produto.mercadologico2 = $5::int)
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
    this.validateDateRange(dto.initialDate, dto.finalDate);
    const storeIds = this.normalizeStoreIds(dto.storeId);
    await this.assertStorePermission(userId, storeIds);

    const params: CurvaAbcQueryParams = [
      dto.initialDate,
      dto.finalDate,
      storeIds,
      dto.mercadologico1 ?? null,
      dto.mercadologico2 ?? null,
    ];

    try {
      const { rows } = await this.pg.query<CurvaAbcRow, CurvaAbcQueryParams>(
        CURVA_ABC_QUERY,
        params,
      );
      return rows;
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

  private normalizeStoreIds(storeIds: number[]) {
    return [...new Set(storeIds)];
  }

  private validateDateRange(initialDate: string, finalDate: string) {
    const start = this.parseDateOnly(initialDate);
    const end = this.parseDateOnly(finalDate);

    if (start.getTime() > end.getTime()) {
      throw new BadRequestException(
        "initialDate nao pode ser maior que finalDate.",
      );
    }
  }

  private parseDateOnly(value: string): Date {
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

  private async assertStorePermission(userId: number, storeIds: number[]) {
    if (userId === 0) {
      return;
    }

    if (!Number.isInteger(userId) || userId < 0) {
      throw new ForbiddenException("Usuario invalido.");
    }

    const grants = await this.prisma.userPermission.findMany({
      where: {
        userId,
        permission: { code: PERMISSION_CODE },
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
