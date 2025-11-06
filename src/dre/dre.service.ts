import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PgService } from 'src/pg/pg.service';
import { GetStoresSalesQueryDto } from './dto/get-store-sales.query.dto'
import { StoreSale } from './entities/store-sales.entity';
import { GetCostCenterSalesQueryDto } from './dto/get-cost-center-sales.query.dto';
import { CostCenterSale } from './entities/cost-center-sales.entity';
import { GetCouponReturnQueryDto } from './dto/get-coupon-return.query.dto';
import { CouponReturn } from './entities/get-coupon-return.entity';
import { GetPackagingCostQueryDto } from './dto/get-packaging-cost.query.dto';
import { PackagingCost } from './entities/get-packaging-cost.entity';
import { GetLossAndConsumptionQueryDto } from './dto/get-loss-and-consumption.query.dto';
import { LossAndComsumption } from './entities/get-loss-and-comsumption.entity';
import { GetCommercialRevenueQueryDto } from './dto/get-commercial-revenue.query.dto';
import { CommercialRevenue } from './entities/get-commercial-revenue.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetConsolidatedDreQueryDto } from './dto/get-consolidated-dre.query.dto';
import { ParametersService } from 'src/parameters/parameters.service';
import { GetNotConsolidatedDreQueryDto } from './dto/get-not-consolidated-dre.dto';
import { UpdateMonthlyResultDto } from './dto/update-monthly-result.dto';
import { CreateMonthlyResultDto } from './dto/create-monthly-result.dto';

const METRICS: (keyof DRE)[] = [
  'recBruta','devolucao','imposto','custo','embalagem',
  'quebra','recCom','despesaPessoal','despesaOperacional'
];

const EPS = 1e-6;
const nearZero = (n: number) => Math.abs(n) < EPS;
const isAllZero = (d: DRE) => METRICS.every(k => nearZero(d[k]));
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class DreService {
  constructor(private pg: PgService, private prisma: PrismaService, private parameters: ParametersService){}

  /* ======================= Helpers de data e soma ======================= */
  private parseDateOnly(input: string | Date): Date {
    if (input instanceof Date) {
      // garante meia-noite local
      return new Date(input.getFullYear(), input.getMonth(), input.getDate());
    }
    // aceita só a parte Y-M-D, mesmo se vier com time: 'YYYY-MM-DDTHH:mm...'
    const s = String(input).slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) {
      throw new Error(`Invalid date format: "${input}". Use YYYY-MM-DD.`);
    }
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return new Date(y, mo - 1, d); // meia-noite LOCAL
  }
  private startOfMonth(d: string | Date): Date {
    const dt = this.parseDateOnly(d);
    return new Date(dt.getFullYear(), dt.getMonth(), 1);
  }
  private endOfMonth(d: string | Date): Date {
    const dt = this.parseDateOnly(d);
    // dia 0 do próximo mês = último dia do mês corrente
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
  }
  private daysInMonth(d: Date) { return this.endOfMonth(d).getDate(); }
  private stripTime(d: string | Date): Date {
    const dt = this.parseDateOnly(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }
  private diffDaysInclusive(a: Date, b: Date) {
    const A = this.stripTime(a).getTime();
    const B = this.stripTime(b).getTime();
    return Math.floor((B - A)/(24*60*60*1000)) + 1;
  }
  private monthKey(d: string | Date): string {
    const dt = this.parseDateOnly(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }
  private toYmd(d: string | Date): string {
    const dt = this.parseDateOnly(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  private toPrismaDate(input: string | Date): Date {
    const d = this.parseDateOnly(input);
    // Date UTC 00:00:00 de Y-M-D
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  private round2(n: number) { return Number((n).toFixed(2)); }

  private emptyDre(): DRE {
    return { recBruta:0, devolucao:0, imposto:0, custo:0, embalagem:0, quebra:0, recCom:0, despesaPessoal:0, despesaOperacional:0 };
  }

  private addDre(a: DRE, b: DRE): DRE {
    return {
      recBruta: a.recBruta + b.recBruta,
      devolucao: a.devolucao + b.devolucao,
      imposto: a.imposto + b.imposto,
      custo: a.custo + b.custo,
      embalagem: a.embalagem + b.embalagem,
      quebra: a.quebra + b.quebra,
      recCom: a.recCom + b.recCom,
      despesaPessoal: a.despesaPessoal + b.despesaPessoal,
      despesaOperacional: a.despesaOperacional + b.despesaOperacional,
    }
  }

  private redistributePool(
    rows: { costCenterId: number; data: DRE }[],
    weightBy: keyof DRE = 'recBruta'
  ) {
    // 1) remove linhas 100% zeradas (exceto o pool, que pode ter valores)
    const poolIdx = rows.findIndex(r => r.costCenterId === 0);
    const pool = poolIdx >= 0 ? rows[poolIdx] : undefined;

    const others = rows.filter((r, i) => i !== poolIdx);
    let targets = others.filter(r => !isAllZero(r.data));

    // Se não existir pool ou ele for todo zero, apenas devolva sem o lixo zero
    if (!pool || isAllZero(pool.data)) {
      return targets;
    }

    if (targets.length === 0) {
      // não tem para onde redistribuir: mantém o pool
      return [pool];
    }

    // Guarda totais antes de redistribuir para preservar somatório
    const totalBefore = Object.fromEntries(
      METRICS.map(m => [m, rows.reduce((s, r) => s + r.data[m], 0)])
    ) as Record<keyof DRE, number>;

    // 2) calcula pesos pelo campo escolhido (default: recBruta)
    const totalWeight = targets.reduce(
      (s, r) => s + Math.max(0, r.data[weightBy]),
      0
    );

    if (totalWeight <= EPS) {
      // se todo mundo tem peso 0, divide igualmente
      const w = 1 / targets.length;
      for (const t of targets) {
        for (const m of METRICS) t.data[m] = round2(t.data[m] + pool.data[m] * w);
      }
    } else {
      for (const t of targets) {
        const w = Math.max(0, t.data[weightBy]) / totalWeight;
        for (const m of METRICS) t.data[m] = round2(t.data[m] + pool.data[m] * w);
      }
    }

    // 3) remove o pool
    let result = targets;

    // 4) acerto de arredondamento: garante que os totais batem
    const afterTotals = Object.fromEntries(
      METRICS.map(m => [m, result.reduce((s, r) => s + r.data[m], 0)])
    ) as Record<keyof DRE, number>;
    // escolhe o centro com maior peso para receber o ajuste
    const fixTarget = result.reduce((a, b) =>
      b.data[weightBy] > a.data[weightBy] ? b : a
    );
    for (const m of METRICS) {
      const diff = round2(totalBefore[m] - afterTotals[m]);
      if (!nearZero(diff)) fixTarget.data[m] = round2(fixTarget.data[m] + diff);
    }

    return result;
  }


  /* ======================= Consultas existentes ======================= */
  async getStoresSales(getStoresSalesDto: GetStoresSalesQueryDto) {
    try {
      const { storeId, initialDate, finalDate, costCenterId } = getStoresSalesDto;
      // $4 pode ser null ou [] quando não quiser filtrar
      const params: [number[], string, string, number[] | null] = [
        storeId,
        initialDate,
        finalDate,
        costCenterId ?? null
      ];

      const query = `
        SELECT *
        FROM (
          SELECT
            q.storeId      AS "storeId",
            q.costCenterId AS "costCenterId",
            SUM(q.saleValue)       AS "saleValue",
            -SUM(q.costWithoutTax)  AS "costWithoutTax",
            -SUM(q.taxValue)        AS "taxValue"
          FROM (
            SELECT
              v.id_loja AS storeId,
              m.id_centrocusto AS costCenterId,
              ROUND(SUM(v.valortotal), 2) AS saleValue,
              ROUND(SUM(v.quantidade * v.customediosemimposto), 2) AS costWithoutTax,
              ROUND(SUM(v.icmsdebito * v.valortotal / 100
                    + (v.valortotal - (v.icmsdebito * v.valortotal / 100)) * piscofins / 100), 2) AS taxValue
            FROM produto p
            INNER JOIN venda v ON p.id = v.id_produto
            JOIN (
              SELECT mercadologico1,
                    COALESCE(id_centrocusto, 0) AS id_centrocusto
              FROM mercadologico
              WHERE nivel = 1
            ) m ON m.mercadologico1 = p.mercadologico1
            WHERE v.data BETWEEN $2 AND $3
              AND v.id_loja = ANY($1::int[])
            GROUP BY v.id_loja, m.id_centrocusto

            UNION ALL

            SELECT
              con.id_loja AS storeId,
              COALESCE(tc.id_centrocustototal, 0) AS costCenterId,
              0::numeric AS saleValue,
              ROUND(SUM(con.quantidade * con.customediocomimposto), 2) AS costWithoutTax,
              0::numeric AS taxValue
            FROM consumo con
            INNER JOIN tipoconsumo tc ON tc.id = con.id_tipoconsumo
            INNER JOIN produto p ON p.id = con.id_produto
            WHERE con.id_loja = ANY($1::int[])
              AND tc.id_contacontabilvalortotaldebito = 261
              AND con.data BETWEEN $2 AND $3
              AND con.quantidade > 0
            GROUP BY con.id_loja, tc.id_centrocustototal
          ) q
          GROUP BY q.storeId, q.costCenterId
        ) t
        WHERE (
          $4::int[] IS NULL
          OR array_length($4::int[], 1) IS NULL
          OR t."costCenterId" = ANY($4::int[])
        );
      `;

      const storeSales = await this.pg.query<StoreSale, [number[], string, string, number[] | null]>(
        query,
        params
      );
      return storeSales.rows;
    } catch (error) {
      console.error('Database query failed at getStoresSales:', error);
      throw new InternalServerErrorException('Failed to retrieve store sales data. Please try again later.');
    }
  }

  async getCostCenterSales(getCostCenterSalesDto: GetCostCenterSalesQueryDto){
    const { storeId, initialDate, finalDate, costCenterId } = getCostCenterSalesDto;
    // $4 pode ser null ou [] quando não quiser filtrar
    const params: [number[], string, string, number[] | null] = [
      storeId,
      initialDate,
      finalDate,
      costCenterId ?? null
    ];
      
    try {
      const query = `
        SELECT * FROM (
          SELECT
            q.id_centrocusto AS "costCenterId",
            ROUND(SUM(q.venda), 2) AS "saleValue",
            -ROUND(SUM(q.custosemimposto), 2) AS "costWithoutTax",
            -ROUND(SUM(imposto), 2) AS "taxValue"
          FROM(
            SELECT
              m.id_centrocusto,
              SUM(v.valortotal) as venda,
              SUM(v.quantidade * v.customediosemimposto) as custosemimposto,
              SUM(v.icmsdebito * v.valortotal / 100 + (v.valortotal - (v.icmsdebito * v.valortotal / 100)) * piscofins / 100) as imposto
            FROM produto p
            INNER JOIN venda v ON p.id = v.id_produto
            JOIN (SELECT 
                  mercadologico1, 
                  CASE WHEN id_centrocusto IS NULL THEN 0 ELSE id_centrocusto END AS id_centrocusto
                FROM mercadologico WHERE nivel = 1) m ON p.mercadologico1 = m.mercadologico1
            WHERE v.data >= $2::date
              AND v.data <  ($3::date + INTERVAL '1 day')
              AND v.id_loja = ANY($1)
            GROUP BY m.id_centrocusto
            UNION ALL
            SELECT
              CASE WHEN tc.id_centrocustototal IS NULL THEN 0 ELSE tc.id_centrocustototal END AS id_centrocusto,
              SUM(0) as venda,
              SUM(con.quantidade * con.customediocomimposto) as custosemimposto,
              SUM(0) as imposto
            FROM consumo con
            INNER JOIN tipoconsumo tc ON tc.id = con.id_tipoconsumo
            INNER JOIN produto p ON p.id = con.id_produto
            WHERE con.id_loja = ANY($1)
              AND tc.id_contacontabilvalortotaldebito = 261
              AND con.data >= $2::date
              AND con.data <  ($3::date + INTERVAL '1 day')
              AND con.quantidade > 0
            GROUP BY tc.id_centrocustototal
          ) q
          GROUP BY q.id_centrocusto) t
          WHERE (
            $4::int[] IS NULL
            OR array_length($4::int[], 1) IS NULL
            OR t."costCenterId" = ANY($4::int[])
          )
      `;
      const costCenterSales = await this.pg.query<CostCenterSale, [number[], string, string, number[] | null]>(query,
        params
      )
      return costCenterSales.rows
    } catch (error) {
      console.error('Database query failed at getCostCenterSales:', error);
      throw new InternalServerErrorException('Failed to retrieve cost center sales data. Please try again later.');
    }
  }

  async getCouponReturn(getCouponReturnDto: GetCouponReturnQueryDto){
    const { storeId, initialDate, finalDate, costCenterId } = getCouponReturnDto;
    // $4 pode ser null ou [] quando não quiser filtrar
    const params: [number[], string, string, number[] | null] = [
      storeId,
      initialDate,
      finalDate,
      costCenterId ?? null
    ];

    try {
      const query = `
        SELECT * FROM (
        SELECT
          m.id_centrocusto AS "costCenterId",
          -SUM(nsi.valortotal) AS "totalValue",
          -SUM(nsi.valoricms) AS "icmsValue",
          -SUM(nsi.valorpiscofins) AS "pisCofinsValue"
        FROM notasaidaitem nsi
        INNER JOIN notasaida ns ON ns.id = nsi.id_notasaida
        INNER JOIN produto p ON p.id = nsi.id_produto
        JOIN (SELECT
                mercadologico1,
                CASE WHEN id_centrocusto IS NULL THEN 0
                ELSE id_centrocusto END AS id_centrocusto
              FROM mercadologico
              WHERE nivel = 1) m ON m.mercadologico1 = p.mercadologico1
        WHERE 
          nsi.id_tiposaida = 9
          AND ns.id_situacaonfe = 1
          AND ns.datasaida BETWEEN $2 AND $3
          AND ns.id_loja = ANY($1)
        GROUP BY m.id_centrocusto) T
        WHERE (
            $4::int[] IS NULL
            OR array_length($4::int[], 1) IS NULL
            OR t."costCenterId" = ANY($4::int[])
          )`;

      const couponReturn = await this.pg.query<CouponReturn, [number[], string, string, number[] | null]>(query,
        params
      )
      return couponReturn.rows
    } catch (error) {
      console.error('Database query failed at getCouponReturn:', error);
      throw new InternalServerErrorException('Failed to retrieve coupon return data. Please try again later.');
    }
  }

  /**
   * Regra: se o período NÃO inclui o último dia do mês final (logo não há lançamento de embalagem no mês),
   * somar ao resultado a fração (dias_no_período_deste_mês / dias_do_mês) * embalagem_do_último_mês_consolidado.
   * A embalagem consolidada é usada com sinal negativo (custo) e arredondada a 2 casas.
   */
  async getPackagingCost(getPackagingCostDto: GetPackagingCostQueryDto) {
    const { storeId, initialDate, finalDate, costCenterId } = getPackagingCostDto;
    // $4 pode ser null ou [] quando não quiser filtrar
    const params: [number[], string, string, number[] | null] = [
      storeId,
      initialDate,
      finalDate,
      costCenterId ?? null
    ];

    try {
      // 1) Soma real (se houver lançamentos)
      const query = `
        SELECT * FROM (
        SELECT 
          CASE WHEN tc.id_centrocustototal IS NULL THEN 0 ELSE tc.id_centrocustototal END AS "costCenterId",	
          -ROUND(SUM(c.quantidade * c.customediocomimposto), 2) AS "packagingCost" 
        FROM consumo c
        JOIN tipoconsumo tc ON tc.id = c.id_tipoconsumo
        WHERE
          c.id_tipoconsumo IN (27, 25, 26, 28, 0)
          AND c.data BETWEEN $2 AND $3
          AND c.id_loja = ANY($1)
        GROUP BY tc.id_centrocustototal) t
        WHERE (
            $4::int[] IS NULL
            OR array_length($4::int[], 1) IS NULL
            OR t."costCenterId" = ANY($4::int[])
          )`;

      const rows = await this.pg.query<PackagingCost, [number[], string, string, number[] | null]>(
        query,
        params
      );
      const resultMap = new Map<number, number>();
      for (const r of rows.rows) resultMap.set(r.costCenterId, r.packagingCost ?? 0);

      // 2) Detecta se o período termina antes do fim do mês => faz o cálculo
      const end = this.stripTime(getPackagingCostDto.finalDate);
      const endMonthLastDay = this.endOfMonth(end);
      const includeLastDay = end.getTime() >= endMonthLastDay.getTime(); // true quando finalDate é >= último dia (normalmente igual)
      if (!includeLastDay) {
        // fração do mês final contida no filtro
        const endMonthStart = this.startOfMonth(end);
        const sameMonth = this.monthKey(end) === this.monthKey(getPackagingCostDto.initialDate);

      const subStart = sameMonth
        ? this.stripTime(getPackagingCostDto.initialDate) // aceita string
        : endMonthStart;
        const daysThisPeriodInEndMonth = this.diffDaysInclusive(subStart, end);
        const dim = this.daysInMonth(end);
        const fraction = Math.max(0, Math.min(1, daysThisPeriodInEndMonth / dim));

        if (fraction > 0) {
          // 3) Busca o último mês consolidado ANTERIOR ao mês final do filtro
          const beforeEndMonth = this.startOfMonth(end);
          const lastConsolidated = await this.prisma.monthlyResult.findFirst({
            where: {
              storeId: { in: getPackagingCostDto.storeId },
              date: { lt: beforeEndMonth },
            },
            orderBy: { date: 'desc' },
            select: { date: true },
          });

          if (lastConsolidated?.date) {
            const lastMonthData = await this.prisma.monthlyResult.groupBy({
              by: ['costCenterId'],
              _sum: { embalagem: true },
              where: {
                storeId: { in: getPackagingCostDto.storeId },
                date: lastConsolidated.date,
              },
            });

            // 4) Aplica o cálculo por centro de custo
            for (const row of lastMonthData) {
              const cc = row.costCenterId;
              const lastEmb = row._sum.embalagem ?? 0; // assumindo armazenado positivo na consolidação
              const prorata = this.round2(-(Math.abs(lastEmb)) * fraction); // custo negativo
              resultMap.set(cc, this.round2((resultMap.get(cc) ?? 0) + prorata));
            }
          }
        }
      }
      

      // 5) Volta como lista
      return Array.from(resultMap.entries()).map(([costCenterId, packagingCost]) => ({ costCenterId, packagingCost })).filter((item) => params[3]?.includes(item.costCenterId) || getPackagingCostDto?.costCenterId === undefined);
    } catch (error) {
      console.error('Database query failed at getPackagingCost:', error);
      throw new InternalServerErrorException('Failed to retrieve packaging cost data. Please try again later.');
    }
  }

  async getLossAndConsumption(getLossAndConsumptionDto: GetLossAndConsumptionQueryDto) {
    const { storeId, initialDate, finalDate, costCenterId } = getLossAndConsumptionDto;

    try {
      const considerNegativeValuesParameter = await this.parameters.getEffectiveByCode<boolean>('dre.considera_quebra_negativa')
      const considerNegativeValues = getLossAndConsumptionDto.considerNegativeValues === undefined ? considerNegativeValuesParameter.value : getLossAndConsumptionDto.considerNegativeValues


      // $6 pode ser null ou [] quando não quiser filtrar
      const params: [number[], string, string, boolean,  number[] | null] = [
        storeId,
        initialDate,
        finalDate,
        considerNegativeValues,
        costCenterId ?? null
      ];

      const query = `
      SELECT * FROM(
        SELECT 
          q.id_centrocusto AS "costCenterId",
          -ROUND(SUM(q.total), 2) AS "totalValue"
        FROM (
          SELECT
            m.id_centrocusto,
            q.quantidade * q.customediocomimposto as total,
            CASE WHEN q.quantidade * q.customediocomimposto < 0 THEN true ELSE false END AS is_negative
          FROM quebra q
          INNER JOIN produto p ON p.id = q.id_produto
          INNER JOIN tipomotivoquebra tmq ON tmq.id = q.id_tipomotivoquebra
          JOIN (SELECT mercadologico1,
                    CASE WHEN id_centrocusto IS NULL THEN 0
                    ELSE id_centrocusto END AS id_centrocusto
                FROM mercadologico WHERE nivel = 1) m ON m.mercadologico1 = p.mercadologico1
          WHERE
            tmq.emitenota = 't'
            AND data BETWEEN $2 AND $3
            AND q.id_loja = ANY($1)
          UNION ALL
          SELECT
            m.id_centrocusto,
            pe.quantidade * pe.customediocomimposto as total,
            CASE WHEN pe.quantidade * pe.customediocomimposto < 0 THEN true ELSE false END AS is_negative
          FROM perda pe
          INNER JOIN produto p ON p.id = pe.id_produto
          INNER JOIN tipomotivoperda tmp ON tmp.id = pe.id_tipomotivoperda
          JOIN (SELECT mercadologico1,
                    CASE WHEN id_centrocusto IS NULL THEN 0
                    ELSE id_centrocusto END AS id_centrocusto
                FROM mercadologico WHERE nivel = 1) m ON m.mercadologico1 = p.mercadologico1
          WHERE
            tmp.emitenota = 't'
            AND pe.data BETWEEN $2 AND $3
            AND pe.id_loja = ANY($1)
          UNION ALL
          SELECT
            CASE WHEN tc.id_centrocustototal IS NULL THEN 0 ELSE tc.id_centrocustototal END AS id_centrocusto,
            c.quantidade * c.customediocomimposto as total,
            CASE WHEN c.quantidade * c.customediocomimposto < 0 THEN true ELSE false END AS is_negative
          FROM consumo c
          INNER JOIN tipoconsumo tc ON tc.id = c.id_tipoconsumo
          INNER JOIN produto p ON p.id = c.id_produto
          WHERE
            tc.emitenota = 't' 
            AND c.data BETWEEN $2 AND $3
            AND c.id_loja = ANY($1)
        ) q
        WHERE q.is_negative = false OR q.is_negative = $4
        GROUP BY q.id_centrocusto) t
        WHERE (
            $5::int[] IS NULL
            OR array_length($5::int[], 1) IS NULL
            OR t."costCenterId" = ANY($5::int[])
          )
      `;

      const lossAndConsumption = await this.pg.query<LossAndComsumption, [number[], string, string, boolean,  number[] | null]>(query,
        params
      )

      return lossAndConsumption.rows
    } catch (error) {
      console.error('Database query failed at getLossAndConsumption:', error);
      throw new InternalServerErrorException('Failed to retrieve loss and consumption data. Please try again later.');
    }
  }

  async getCommercialRevenue(getCommercialRevenueDto: GetCommercialRevenueQueryDto) {
    const { storeId, initialDate, finalDate, costCenterId } = getCommercialRevenueDto;
    // $4 pode ser null ou [] quando não quiser filtrar
    const params: [number[], string, string, number[] | null] = [
      storeId,
      initialDate,
      finalDate,
      costCenterId ?? null
    ];

    try {
      const query = `
      SELECT * FROM (
        SELECT
          q.id_centrocusto AS "costCenterId",
          ROUND(SUM(valor), 2) AS "totalValue"
        FROM (
          SELECT  
            m.id_centrocusto,
            SUM(nei.valortotalfinal) as valor  
          FROM notaentradaitem nei
          INNER JOIN notaentrada ne ON ne.id = nei.id_notaentrada
          INNER JOIN produto p ON nei.id_produto = p.id
          JOIN (SELECT mercadologico1,
                CASE WHEN id_centrocusto IS NULL THEN 0 ELSE id_centrocusto END AS id_centrocusto
              FROM mercadologico WHERE nivel = 1) m ON m.mercadologico1 = p.mercadologico1
          WHERE
            nei.id_tipoentrada IN (
              SELECT  DISTINCT te.id
              FROM tipoentrada te
              JOIN tipoentradacontabilidade tec ON tec.id_tipoentrada = te.id
              WHERE
                tec.id_tipovalorcontabilidade = 5
                AND tec.id_contacontabilcredito IN (SELECT id_contacontabilfiscal 
                  FROM contabilidade.dreitem dre
                  WHERE id_dre = 22)
            )
            AND ne.dataentrada BETWEEN $2 AND $3
            AND ne.id_loja = ANY($1)
          GROUP BY m.id_centrocusto
          UNION ALL
          SELECT
            m.id_centrocusto,
            SUM(v.valor) as valor
          FROM verba v
          JOIN (SELECT mercadologico1,
                CASE WHEN id_centrocusto IS NULL THEN 0 ELSE id_centrocusto END AS id_centrocusto
              FROM mercadologico WHERE nivel = 1) m ON m.mercadologico1 = v.mercadologico1
          WHERE
            v.dataemissao BETWEEN $2 AND $3
            AND v.id_loja = ANY($1)
          GROUP BY m.id_centrocusto
        ) q
        GROUP BY q.id_centrocusto) t
        WHERE (
            $4::int[] IS NULL
            OR array_length($4::int[], 1) IS NULL
            OR t."costCenterId" = ANY($4::int[])
          )
      `;

      const commercialRevenue = await this.pg.query<CommercialRevenue, [number[], string, string, number[] | null]>(query,
        params
      )

      return commercialRevenue.rows
    } catch (error) {
      console.error('Database query failed at getCommercialRevenue:', error);
      throw new InternalServerErrorException('Failed to retrieve commercial revenue data. Please try again later.');
    }
  }

  async getConsolidatedDre(getConsolidatedDreDto: GetConsolidatedDreQueryDto) {
    const costCenterIds: number[] | undefined = getConsolidatedDreDto?.costCenterId

    try {
      const gte = this.toPrismaDate(getConsolidatedDreDto.initialDate);
      const lte = this.toPrismaDate(getConsolidatedDreDto.finalDate);

      return this.prisma.monthlyResult.groupBy({
        by: ["costCenterId"],
        _sum: {
          recBruta: true,
          devolucao: true,
          imposto: true,
          custo: true,
          embalagem: true,
          quebra: true,
          recCom: true,
          despesaPessoal: true,
          despesaOperacional: true,
        },
        where: {
          storeId: { in: getConsolidatedDreDto.storeId },
          AND: [
            { date: { gte } },
            { date: { lte } },
            (costCenterIds && costCenterIds.length > 0 ? { costCenterId: { in: costCenterIds }} : {})
          ],
        },
      })
    } catch (error) {
      console.error('Prisma query failed at getConsolidatedDre:', error);
      throw new InternalServerErrorException('Failed to retrieve consolidated dre data. Please try again later.');
    }
  }

  async getNotConsolidatedDre(getNotConsolidatedDreDto: GetNotConsolidatedDreQueryDto) {
    try {
      const costCenters = (await this.prisma.costCenter.findMany())

      const dto = {...getNotConsolidatedDreDto, costCenterId: costCenters.map((cc) => cc.id)}

      const filteredCostCentersIds = getNotConsolidatedDreDto?.costCenterId
      
      const costCenterSales = await this.getCostCenterSales(dto)
      const couponReturn = await this.getCouponReturn(dto)
      const packagingCost = await this.getPackagingCost(dto)
      const lossAndConsumption = await this.getLossAndConsumption(dto)
      const commercialRevenue = await this.getCommercialRevenue(dto)

      /* Insere a provisão  de quebra no setor secos */
      const secos = lossAndConsumption.find(it => it.costCenterId === 10);
      if (secos) {
        const provisionPercentageParameter = await this.parameters.getEffectiveByCode('dre.prov_perda_secos')
        const provisionValue = costCenterSales.find(it => it.costCenterId === 10).saleValue * (parseFloat(provisionPercentageParameter.value) / 100)
        secos.totalValue -= provisionValue;
      }

      const lastMonth = await this.prisma.monthlyResult.findFirst({
        where: { storeId: { in: getNotConsolidatedDreDto.storeId } },
        orderBy: { date: "desc" },
        select: { date: true }
      })

      const lastMonthData = await this.prisma.monthlyResult.groupBy({
        by: ["costCenterId"],
        _sum: {
          embalagem: true, // não usamos aqui, mas mantive
          despesaPessoal: true,
          despesaOperacional: true,
        },
        where: {
          storeId: { in: getNotConsolidatedDreDto.storeId },
          date: lastMonth?.date
        }
      })

      const end = this.stripTime(getNotConsolidatedDreDto.finalDate);
      const endMonthStart = this.startOfMonth(end);
      const sameMonth = this.monthKey(end) === this.monthKey(getNotConsolidatedDreDto.initialDate);

      const subStart = sameMonth
        ? this.stripTime(getNotConsolidatedDreDto.initialDate) // aceita string
        : endMonthStart;
      const daysThisPeriodInEndMonth = this.diffDaysInclusive(subStart, end);
      const dim = this.daysInMonth(end);
      const fraction = Math.max(0, Math.min(1, daysThisPeriodInEndMonth / dim));

      const dreDataRaw = costCenters.map((costCenter) => {
        
        const data: DRE = {
          recBruta:        costCenterSales.find((it) => it.costCenterId === costCenter.id)?.saleValue ?? 0,
          devolucao:       couponReturn.find((it) => it.costCenterId === costCenter.id)?.totalValue ?? 0,
          imposto:         costCenterSales.find((it) => it.costCenterId === costCenter.id)?.taxValue ?? 0,
          custo:           costCenterSales.find((it) => it.costCenterId === costCenter.id)?.costWithoutTax ?? 0,
          embalagem:       packagingCost.find((it) => it.costCenterId === costCenter.id)?.packagingCost ?? 0,
          quebra:          lossAndConsumption.find((it) => it.costCenterId === costCenter.id)?.totalValue ?? 0,
          recCom:          commercialRevenue.find((it) => it.costCenterId === costCenter.id)?.totalValue ?? 0,
          despesaPessoal:  (lastMonthData.find((it) => it.costCenterId === costCenter.id)?._sum.despesaPessoal ?? 0) * fraction,
          despesaOperacional: (lastMonthData.find((it) => it.costCenterId === costCenter.id)?._sum.despesaOperacional ?? 0) * fraction,
        }
        return { costCenterId: costCenter.id, data }
      })

      // Remove linhas zeradas e Soma o centro de custo 0 proporcionalmente aos demais (peso = recBruta)
      const dreData = this.redistributePool(dreDataRaw, 'recBruta');

      return dreData.filter((it) => filteredCostCentersIds?.includes(it.costCenterId) || filteredCostCentersIds === undefined)
    } catch (error) {
      console.error('Database query failed at getNotConsolidatedDre:', error);
      throw new InternalServerErrorException('Failed to retrieve not consolidated dre data. Please try again later.');
    }
  }

  /* ======================= DRE unificado (consolidado + não) ======================= */
  /**
   * Mescla meses consolidados (MonthlyResults) e não consolidados (cálculo on-the-fly).
   * Ex.: 01/05/2025 a 26/10/2025 -> usa consolidado para meses que existirem em MonthlyResults e,
   * para os demais meses (incluindo mês final parcial), usa getNotConsolidatedDre.
   * Retorno no mesmo formato do "não consolidado": [{ costCenterId, data: DRE }, ...]
   */
  async getUnifiedDre(dto: GetNotConsolidatedDreQueryDto) {
    const costCenterIds = dto.costCenterId

    try {
      const ini = this.stripTime(dto.initialDate);
      const fin = this.stripTime(dto.finalDate);

      // Quais meses (por "date" em MonthlyResults) existem no intervalo?
      const consolidatedMonths = await this.prisma.monthlyResult.groupBy({
        by: ['date'],
        where: {
          storeId: { in: dto.storeId },
          AND: [
            { date: { gte: this.startOfMonth(ini) } }, 
            { date: { lte: this.endOfMonth(fin) } }
          ],
        },
      });
      const consolidatedSet = new Set(consolidatedMonths.map(m => this.monthKey(m.date)));

      // acumulador por CC
      const acc = new Map<number, DRE>();

      // Itera mês a mês no intervalo
      let cursor = this.startOfMonth(ini);
      while (cursor.getTime() <= fin.getTime()) {
        const monthStart = this.startOfMonth(cursor);
        const monthEnd = this.endOfMonth(cursor);

        const subStart = new Date(Math.max(monthStart.getTime(), ini.getTime()));
        const subEnd   = new Date(Math.min(monthEnd.getTime(), fin.getTime()));

        const subStartStr = this.toYmd(subStart);
        const subEndStr   = this.toYmd(subEnd);

        const isConsolidated = consolidatedSet.has(this.monthKey(monthStart));

        if (isConsolidated) {
          // Usa consolidação apenas deste mês
          const consRows = await this.getConsolidatedDre({
            storeId: dto.storeId,
            initialDate: subStartStr,
            finalDate: subEndStr,
          });

          for (const r of consRows) {
            const cc = r.costCenterId;
            const data: DRE = {
              recBruta: r._sum.recBruta ?? 0,
              devolucao: r._sum.devolucao ?? 0,
              imposto: r._sum.imposto ?? 0,
              custo: r._sum.custo ?? 0,
              embalagem: r._sum.embalagem ?? 0,
              quebra: r._sum.quebra ?? 0,
              recCom: r._sum.recCom ?? 0,
              despesaPessoal: r._sum.despesaPessoal ?? 0,
              despesaOperacional: r._sum.despesaOperacional ?? 0,
            };
            acc.set(cc, this.addDre(acc.get(cc) ?? this.emptyDre(), data));
          }
        } else {
          // Calcula "não consolidado" apenas para a janela do mês atual
          const nonRows = await this.getNotConsolidatedDre({
            storeId: dto.storeId,
            costCenterId: dto.costCenterId,
            initialDate: subStartStr,
            finalDate: subEndStr,
          });

          for (const r of nonRows) {
            acc.set(r.costCenterId, this.addDre(acc.get(r.costCenterId) ?? this.emptyDre(), r.data));
          }
        }

        // próximo mês
        cursor = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      }

      // volta como lista
      return Array.from(acc.entries()).map(([costCenterId, data]) => ({ costCenterId, data })).filter((it) => (costCenterIds?.includes(it.costCenterId) || costCenterIds === undefined));
    } catch (error) {
      console.error('getUnifiedDre failed:', error);
      throw new InternalServerErrorException('Failed to retrieve unified dre data. Please try again later.');
    }
  }

  /* ======================= CRUD MonthlyResults ======================= */
  async create(createMonthlyResultDtos: CreateMonthlyResultDto[]) {
    return this.prisma.monthlyResult.createMany({
      data: createMonthlyResultDtos,
      skipDuplicates: true,
    });
  }

  findAll() {
    return this.prisma.monthlyResult.findMany();
  }

  findOne(id: number) {
    return this.prisma.monthlyResult.findUnique({where: {id}});
  }

  update(id: number, updateMonthlyResultDto: UpdateMonthlyResultDto) {
    return this.prisma.monthlyResult.update({
      where: { id },
      data: updateMonthlyResultDto
    });
  }

  remove(id: number) {
    return this.prisma.monthlyResult.delete({where: {id}});
  }
}
