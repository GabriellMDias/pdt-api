import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "src/db/prisma/prisma.service";
import { PgService } from "src/db/pg/pg.service";
import { VendaDiaDQueryDto, VendaDiaDViewType } from "./dto/venda-dia-d.query.dto";

type VendaDiaDBaseRow = {
  qtd_cupom: number;
  qtd_cliente: number;
  total_venda: number;
  total_desconto: number;
};

type VendaDiaDTotalRow = VendaDiaDBaseRow;
type VendaDiaDDailyRow = VendaDiaDBaseRow & { data: string };
type VendaDiaDMonthlyRow = VendaDiaDBaseRow & { mes: string };
type VendaDiaDPeriodRow = VendaDiaDBaseRow & { periodo: string };

const PERMISSION_CODE = "venda-dia-d:consultar";

const TOTAL_QUERY = `
WITH proms AS (
  SELECT p.id
  FROM promocao p
  JOIN promocaotipoclubevantagem ptcv
    ON ptcv.id_promocao = p.id
  WHERE p.somenteclubevantagens = true
    AND ptcv.id_tipoclubevantagem IN (1)
)
SELECT
  COUNT(DISTINCT v.id) AS qtd_cupom,
  COUNT(DISTINCT v.id_clientepreferencial) AS qtd_cliente,
  COALESCE(SUM(vi.valortotal), 0) AS total_venda,
  COALESCE(SUM(vi.valordesconto), 0) AS total_desconto
FROM pdv.venda v
JOIN pdv.vendaitem vi
  ON vi.id_venda = v.id
JOIN pdv.vendapromocao vp
  ON vp.id_venda = v.id
JOIN proms p
  ON p.id = vp.id_promocao
WHERE v.cancelado = false
  AND vi.cancelado = false
  AND v.data >= $1::date
  AND v.data < ($2::date + INTERVAL '1 day')
  AND v.id_loja = ANY($3::int[]);
`;

const DAILY_QUERY = `
WITH proms AS (
  SELECT p.id
  FROM promocao p
  JOIN promocaotipoclubevantagem ptcv
    ON ptcv.id_promocao = p.id
  WHERE p.somenteclubevantagens = true
    AND ptcv.id_tipoclubevantagem IN (1)
)
SELECT
  v.data::date AS data,
  COUNT(DISTINCT v.id) AS qtd_cupom,
  COUNT(DISTINCT v.id_clientepreferencial) AS qtd_cliente,
  COALESCE(SUM(vi.valortotal), 0) AS total_venda,
  COALESCE(SUM(vi.valordesconto), 0) AS total_desconto
FROM pdv.venda v
JOIN pdv.vendaitem vi
  ON vi.id_venda = v.id
JOIN pdv.vendapromocao vp
  ON vp.id_venda = v.id
JOIN proms p
  ON p.id = vp.id_promocao
WHERE v.cancelado = false
  AND vi.cancelado = false
  AND v.data >= $1::date
  AND v.data < ($2::date + INTERVAL '1 day')
  AND v.id_loja = ANY($3::int[])
GROUP BY v.data::date
ORDER BY v.data::date;
`;

const MONTHLY_QUERY = `
WITH proms AS (
  SELECT p.id
  FROM promocao p
  JOIN promocaotipoclubevantagem ptcv
    ON ptcv.id_promocao = p.id
  WHERE p.somenteclubevantagens = true
    AND ptcv.id_tipoclubevantagem IN (1)
)
SELECT
  DATE_TRUNC('month', v.data)::date AS mes,
  COUNT(DISTINCT v.id) AS qtd_cupom,
  COUNT(DISTINCT v.id_clientepreferencial) AS qtd_cliente,
  COALESCE(SUM(vi.valortotal), 0) AS total_venda,
  COALESCE(SUM(vi.valordesconto), 0) AS total_desconto
FROM pdv.venda v
JOIN pdv.vendaitem vi
  ON vi.id_venda = v.id
JOIN pdv.vendapromocao vp
  ON vp.id_venda = v.id
JOIN proms p
  ON p.id = vp.id_promocao
WHERE v.cancelado = false
  AND vi.cancelado = false
  AND v.data >= $1::date
  AND v.data < ($2::date + INTERVAL '1 day')
  AND v.id_loja = ANY($3::int[])
GROUP BY DATE_TRUNC('month', v.data)::date
ORDER BY DATE_TRUNC('month', v.data)::date;
`;

const PERIOD_QUERY = `
WITH proms AS (
  SELECT p.id
  FROM promocao p
  JOIN promocaotipoclubevantagem ptcv
    ON ptcv.id_promocao = p.id
  WHERE p.somenteclubevantagens = true
    AND ptcv.id_tipoclubevantagem IN (1)
),
dias AS (
  SELECT DISTINCT v.data::date AS data
  FROM pdv.venda v
  JOIN pdv.vendapromocao vp
    ON vp.id_venda = v.id
  JOIN proms p
    ON p.id = vp.id_promocao
  WHERE v.cancelado = false
    AND v.data >= $1::date
    AND v.data < ($2::date + INTERVAL '1 day')
    AND v.id_loja = ANY($3::int[])
),
dias_grupos AS (
  SELECT
    data,
    data - ROW_NUMBER() OVER (ORDER BY data)::int AS grp
  FROM dias
),
periodos AS (
  SELECT
    grp,
    MIN(data) AS dt_ini,
    MAX(data) AS dt_fim
  FROM dias_grupos
  GROUP BY grp
)
SELECT
  TO_CHAR(p.dt_ini, 'DD/MM/YYYY') || ' a ' || TO_CHAR(p.dt_fim, 'DD/MM/YYYY') AS periodo,
  COUNT(DISTINCT v.id) AS qtd_cupom,
  COUNT(DISTINCT v.id_clientepreferencial) AS qtd_cliente,
  COALESCE(SUM(vi.valortotal), 0) AS total_venda,
  COALESCE(SUM(vi.valordesconto), 0) AS total_desconto
FROM periodos p
JOIN pdv.venda v
  ON v.data::date BETWEEN p.dt_ini AND p.dt_fim
JOIN pdv.vendaitem vi
  ON vi.id_venda = v.id
JOIN pdv.vendapromocao vp
  ON vp.id_venda = v.id
JOIN proms pr
  ON pr.id = vp.id_promocao
WHERE v.cancelado = false
  AND vi.cancelado = false
  AND v.data >= $1::date
  AND v.data < ($2::date + INTERVAL '1 day')
  AND v.id_loja = ANY($3::int[])
GROUP BY p.grp, p.dt_ini, p.dt_fim
ORDER BY p.dt_ini;
`;

@Injectable()
export class VendaDiaDService {
  constructor(
    private readonly pg: PgService,
    private readonly prisma: PrismaService,
  ) {}

  async run(userId: number, dto: VendaDiaDQueryDto) {
    this.validateDateRange(dto.initialDate, dto.finalDate);
    const storeIds = this.normalizeStoreIds(dto.storeId);
    await this.assertStorePermission(userId, storeIds);

    const params: [string, string, number[]] = [dto.initialDate, dto.finalDate, storeIds];

    try {
      if (dto.viewType === VendaDiaDViewType.Total) {
        const { rows } = await this.pg.query<VendaDiaDTotalRow, [string, string, number[]]>(
          TOTAL_QUERY,
          params,
        );
        return rows;
      }

      if (dto.viewType === VendaDiaDViewType.Diario) {
        const { rows } = await this.pg.query<VendaDiaDDailyRow, [string, string, number[]]>(
          DAILY_QUERY,
          params,
        );
        return rows;
      }

      if (dto.viewType === VendaDiaDViewType.Mensal) {
        const { rows } = await this.pg.query<VendaDiaDMonthlyRow, [string, string, number[]]>(
          MONTHLY_QUERY,
          params,
        );
        return rows;
      }

      const { rows } = await this.pg.query<VendaDiaDPeriodRow, [string, string, number[]]>(
        PERIOD_QUERY,
        params,
      );
      return rows;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      console.error("Database query failed at venda dia d report:", error);
      throw new InternalServerErrorException(
        "Falha ao gerar relatorio Venda Dia D. Tente novamente mais tarde.",
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
      throw new BadRequestException("initialDate nao pode ser maior que finalDate.");
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

    const deniedStores = storeIds.filter((storeId) => !allowedStores.has(storeId));
    if (deniedStores.length > 0) {
      throw new ForbiddenException(
        `Voce nao tem permissao para consultar as lojas: ${deniedStores.join(", ")}.`,
      );
    }
  }
}
