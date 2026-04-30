import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PgService } from 'src/db/pg/pg.service';
import { GetCostCenterSalesQueryDto } from './dto/get-cost-center-sales.query.dto';
import { CostCenterSale } from './entities/cost-center-sales.entity';

@Injectable()
export class DreCostCenterSalesService {
  constructor(private readonly pg: PgService) {}

  async getCostCenterSales(getCostCenterSalesDto: GetCostCenterSalesQueryDto) {
    const { storeId, initialDate, finalDate, costCenterId } = getCostCenterSalesDto;
    const params: [number[], string, string, number[] | null] = [
      storeId,
      initialDate,
      finalDate,
      costCenterId ?? null,
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

      const costCenterSales = await this.pg.query<CostCenterSale, [number[], string, string, number[] | null]>(
        query,
        params,
      );
      return costCenterSales.rows;
    } catch (error) {
      console.error('Database query failed at getCostCenterSales:', error);
      throw new InternalServerErrorException('Failed to retrieve cost center sales data. Please try again later.');
    }
  }
}
