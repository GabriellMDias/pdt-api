import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PgService } from 'src/pg/pg.service';
import { GetStoresSalesDto } from './dto/get-store-sales.dto'
import { StoreSale } from './entities/store-sales.entity';
import { GetCostCenterSalesDto } from './dto/get-cost-center-sales.dto';
import { CostCenterSale } from './entities/cost-center-sales.entity';
import { GetCouponReturnDto } from './dto/get-coupon-return.dto';
import { CouponReturn } from './entities/get-coupon-return.entity';
import { GetPackagingCostDto } from './dto/get-packaging-cost.dto';
import { PackagingCost } from './entities/get-packaging-cost.entity';
import { GetLossAndConsumptionDto } from './dto/get-loss-and-consumption.dto';
import { LossAndComsumption } from './entities/get-loss-and-comsumption.entity';
import { GetCommercialRevenueDto } from './dto/get-commercial-revenue.dto';
import { CommercialRevenue } from './entities/get-commercial-revenue.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetConsolidatedDreDto } from './dto/get-consolidated-Dre';

@Injectable()
export class DreService {
    constructor(private pg: PgService, private prisma: PrismaService){}

    async getStoresSales(getStoresSalesDto: GetStoresSalesDto) {
        try {
            const query = `
                        SELECT
                                q.storeId AS "storeId",
                                q.costCenterId AS "costCenterId" ,
                                SUM(q.saleValue) AS "saleValue",
                                SUM(costWithoutTax) AS "costWithoutTax",
                                SUM(taxValue) AS "taxValue"
                            FROM (
                            SELECT
                                                    v.id_loja AS storeId,
                                                    m.id_centrocusto AS costCenterId,
                                                    ROUND(SUM(v.valortotal), 2) AS saleValue,
                                                    ROUND(SUM(v.quantidade * v.customediosemimposto), 2) AS costWithoutTax,
                                                    ROUND(SUM(v.icmsdebito * v.valortotal / 100 + (v.valortotal - (v.icmsdebito * v.valortotal / 100)) * piscofins / 100), 2) AS taxValue
                                                FROM produto p
                                                INNER JOIN venda v ON p.id = v.id_produto
                                                JOIN (SELECT mercadologico1, 
                                                        CASE WHEN id_centrocusto IS NULL THEN 0 ELSE id_centrocusto END AS id_centrocusto 
                                                        FROM mercadologico WHERE nivel = 1) m ON m.mercadologico1 = p.mercadologico1
                                                WHERE
                                                    v.data BETWEEN $2 AND $3
                                                    AND v.id_loja = ANY($1)
                                                GROUP BY v.id_loja, m.id_centrocusto
                            UNION ALL
                            SELECT
                                                    con.id_loja AS storeId,
                                                    CASE 
                                                       WHEN tc.id_centrocustototal IS NULL THEN 0
                                                       ELSE tc.id_centrocustototal
                                                    END AS costCenterId,
                                                    SUM(0) AS saleValue,
                                                    ROUND(SUM(con.quantidade * con.customediocomimposto), 2) AS costWithoutTax,
                                                    SUM(0) AS taxValue
                                                FROM consumo con
                                                INNER JOIN tipoconsumo tc ON tc.id = con.id_tipoconsumo
                                                INNER JOIN produto p ON p.id = con.id_produto
                                                WHERE
                                                    con.id_loja = ANY($1)
                                                    AND tc.id_contacontabilvalortotaldebito = 261
                                                    AND con.data BETWEEN $2 AND $3
                                                    AND con.quantidade > 0
                                                GROUP BY con.id_loja, tc.id_centrocustototal
                            ) q
                            GROUP BY q.storeId, q.costCenterId
                                `
            const storeSales = await this.pg.query<StoreSale,[number[], Date, Date]>(query, 
                [getStoresSalesDto.storeId, getStoresSalesDto.initialDate, getStoresSalesDto.finalDate])

            return storeSales.rows
        } catch (error) {
            console.error('Database query failed at getStoresSales:', error);
            
            throw new InternalServerErrorException(
                'Failed to retrieve store sales data. Please try again later.'
            );
        }
        
    }

    async getCostCenterSales(getCostCenterSalesDto: GetCostCenterSalesDto){
        try {
            const query = `
                SELECT
                    q.id_centrocusto AS "costCenterId",
                    ROUND(SUM(q.venda), 2) AS "saleValue",
                    ROUND(SUM(q.custosemimposto), 2) AS "costWithoutTax",
                    ROUND(SUM(imposto), 2) AS "taxValue"
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
                                    WHERE
                                        v.data BETWEEN $2 AND $3
                                        AND v.id_loja = ANY($1)
                                    GROUP BY m.id_centrocusto
                UNION ALL
                SELECT
                                        CASE 
                                            WHEN tc.id_centrocustototal IS NULL THEN 0
                                            ELSE tc.id_centrocustototal
                                        END AS id_centrocusto,
                                        SUM(0) as venda,
                                        SUM(con.quantidade * con.customediocomimposto) as custosemimposto,
                                        SUM(0) as imposto
                                    FROM consumo con
                                    INNER JOIN tipoconsumo tc ON tc.id = con.id_tipoconsumo
                                    INNER JOIN produto p ON p.id = con.id_produto
                                    WHERE
                                        con.id_loja = ANY($1)
                                        AND tc.id_contacontabilvalortotaldebito = 261
                                        AND con.data BETWEEN $2 AND $3
                                        AND con.quantidade > 0
                                    GROUP BY tc.id_centrocustototal
                ) q
                GROUP BY q.id_centrocusto
            `

            const costCenterSales = await this.pg.query<CostCenterSale, [number[], Date, Date]>(query,
                [getCostCenterSalesDto.storeId, getCostCenterSalesDto.initialDate, getCostCenterSalesDto.finalDate]
            )

            return costCenterSales.rows
        } catch (error) {
            console.error('Database query failed at getCostCenterSales:', error);
            
            throw new InternalServerErrorException(
                'Failed to retrieve cost center sales data. Please try again later.'
            );
        }
    }

    async getCouponReturn(getCouponReturnDto: GetCouponReturnDto){
        try {
            const query = `SELECT
                                m.id_centrocusto AS "costCenterId",
                                SUM(nsi.valortotal) AS "totalValue",
                                SUM(nsi.valoricms) AS "icmsValue",
                                SUM(nsi.valorpiscofins) AS "pisCofinsValue"
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
                        GROUP BY m.id_centrocusto;`

            const couponReturn = await this.pg.query<CouponReturn, [number[], Date, Date]>(query,
                [getCouponReturnDto.storeId, getCouponReturnDto.initialDate, getCouponReturnDto.finalDate]
            )
            
            return couponReturn.rows
        } catch (error) {
            console.error('Database query failed at getCouponReturn:', error);
            
            throw new InternalServerErrorException(
                'Failed to retrieve coupon return data. Please try again later.'
            );
        }
    }

    async getPackagingCost(getPackagingCostDto: GetPackagingCostDto) {
        try {
            const query = `SELECT 	
                            ROUND(SUM(quantidade * customediocomimposto), 2) AS "packagingCost" 
                            FROM consumo 
                            WHERE
                                id_tipoconsumo = 0 
                                AND data BETWEEN $2 AND $3
                                AND id_loja = ANY($1)`

            const packagingCost = await this.pg.query<PackagingCost, [number[], Date, Date]>(query,
                [getPackagingCostDto.storeId, getPackagingCostDto.initialDate, getPackagingCostDto.finalDate]
            )

            return packagingCost.rows
        } catch (error) {
            console.error('Database query failed at getPackagingCost:', error);
            
            throw new InternalServerErrorException(
                'Failed to retrieve packaging cost data. Please try again later.'
            );
        }
    }

    async getLossAndConsumption(getLossAndConsumptionDto: GetLossAndConsumptionDto) {
        try {
            const query = `
            SELECT 
                q.id_centrocusto AS "costCenterId",
                ROUND(SUM(q.total), 2) AS "totalValue"
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
                AND c.id_loja = ANY($1)) q
            WHERE q.is_negative = false OR q.is_negative = $4
            GROUP BY q.id_centrocusto
            `

            const lossAndConsumption = await this.pg.query<LossAndComsumption, [number[], Date, Date, boolean]>(query,
                [getLossAndConsumptionDto.storeId, getLossAndConsumptionDto.initialDate, getLossAndConsumptionDto.finalDate,
                getLossAndConsumptionDto.considerNegativeValues]
            )

            return lossAndConsumption.rows
        } catch (error) {
            console.error('Database query failed at getLossAndConsumption:', error);
            
            throw new InternalServerErrorException(
                'Failed to retrieve loss and consumption data. Please try again later.'
            );
        }
    }

    async getCommercialRevenue(getCommercialRevenueDto: GetCommercialRevenueDto) {
        try {
            const query = `
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
                    AND v.id_loja = ANY($1])
                    GROUP BY m.id_centrocusto) q
                GROUP BY q.id_centrocusto
                `

            const commercialRevenue = await this.pg.query<CommercialRevenue, [number[], Date, Date]>(query,
                [getCommercialRevenueDto.storeId, getCommercialRevenueDto.initialDate, getCommercialRevenueDto.finalDate]
            )

            return commercialRevenue.rows
        } catch (error) {
            console.error('Database query failed at getCommercialRevenue:', error);
            
            throw new InternalServerErrorException(
                'Failed to retrieve commercial revenue data. Please try again later.'
            );
        }
        
    }

    async getConsolidatedDre(getConsolidatedDreDto: GetConsolidatedDreDto) {
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
              storeId: {
                in: getConsolidatedDreDto.storeId,
              },
              AND: [
                {
                  date: {
                    gte: getConsolidatedDreDto.initialDate,
                  },
                },
                {
                  date: {
                    lte: getConsolidatedDreDto.finalDate,
                  },
                },
              ],
            },
          })
    }
}
