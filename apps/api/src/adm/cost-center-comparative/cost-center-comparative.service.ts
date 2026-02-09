import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PgService } from 'src/db/pg/pg.service';
import { CostCenterComparativeQueryDto } from './dto/cost-center-comparative.query.dto';
import { CostCenterComparative, CostCenterSale } from './entities/cost-center-comparative.entity';

@Injectable()
export class CostCenterComparativeService {
    constructor(private pg: PgService) {}

    /* ======================= Helpers de datas e modo ======================= */
    private startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    private endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
    private addMonths = (d: Date, m: number) =>
    new Date(d.getFullYear(), d.getMonth() + m, d.getDate());
    private toISO = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };
    private monthsBetween = (a: Date, b: Date) =>
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

    private safeDiv = (num: number, den: number) => (den ? num / den : 0);
    private percDelta = (curr: number, prev: number) =>
    prev ? (curr / prev - 1) * 100 : 0;

    private splitDate = (date: string) => {
        const [year, month, day] = date.split("-").map(Number);

        const splitDate = {
            year,
            month,
            day,
        };

        return splitDate;
    };

    private getDaysInMonth(month: number, year: number) {
        return new Date(year, month, 0).getDate();
    }
    // ------------------------------------------------------

    async getCostCenterSales(dto: CostCenterComparativeQueryDto) {
        try {
            const { storeId, initialDate, finalDate } = dto

            const params: [number[], string, string] = [
                storeId, 
                initialDate, 
                finalDate
            ]

            const query = `
            WITH venda as (SELECT 
                v.id_produto,
                m01.id_centrocusto,
                CASE
                    WHEN m01.id_centrocusto IN (3, 8, 9, 11) THEN p.mercadologico2
                    ELSE p.mercadologico1
                END AS id_mercadologico1,
                p.mercadologico1,
                p.mercadologico2,
                CASE
                    WHEN m01.id_centrocusto IN (3, 8, 9, 11) THEN m.descricao
                    ELSE m01.descricao
                END AS desc_mercadologico,
                v.valortotal,
                v.quantidade,
                v.customediosemimposto,
                v.piscofins,
                v.icmsdebito
            FROM venda v
            JOIN produto p ON v.id_produto = p.id
            LEFT JOIN (
                SELECT CASE WHEN id_centrocusto IS NULL THEN 0 ELSE id_centrocusto END AS id_centrocusto, mercadologico1, descricao FROM mercadologico WHERE nivel = 1
            ) m01 ON p.mercadologico1 = m01.mercadologico1
            JOIN mercadologico m ON p.mercadologico1 = m.mercadologico1 AND p.mercadologico2 = m.mercadologico2
            WHERE
                v.data >= $2::date
                AND v.data <  ($3::date + INTERVAL '1 day')
                AND v.id_loja = ANY($1)
                AND m.nivel = 2
            )
            SELECT distinct
                v.id_centrocusto as "costCenterId",
                v.id_mercadologico1 as "departmentVrId1",
                v.desc_mercadologico as "departmentVrDesc", 
                SUM(v.valortotal) as "saleValue"
            FROM venda v
            LEFT JOIN mercadologico m1 ON m1.mercadologico1 = v.mercadologico1
            JOIN produto p ON v.id_produto = p.id
            WHERE m1.nivel = 1
            GROUP BY v.id_centrocusto, p.mercadologico1, v.desc_mercadologico, v.id_mercadologico1
            ORDER BY 1
            `

            const costCenterSales = await this.pg.query<CostCenterSale, [number[], string, string]>(query, params)
        
            return costCenterSales.rows
        } catch (error) {
            console.error('Database query failed at getCostCenterSales:', error);
            throw new InternalServerErrorException('Failed to retrieve cost center sales data. Please try again later.');
        }
    }

    async getCostCenterComparative(dto: CostCenterComparativeQueryDto) {
        const { storeId, initialDate, finalDate, mode } = dto

        // Datas "brutas" da requisição (usadas para tendência e para range)
        const dtIniSplit = this.splitDate(initialDate);
        const dtFinSplit = this.splitDate(finalDate);

        const iniRaw = new Date(
            dtIniSplit.year,
            dtIniSplit.month - 1,
            dtIniSplit.day
        );
        const finRaw = new Date(
            dtFinSplit.year,
            dtFinSplit.month - 1,
            dtFinSplit.day
        );

        // Largura em meses do range (considera ano)
        const spanInMonths = this.monthsBetween(iniRaw, finRaw);

        // ---------- Períodos ----------
        let actualStart: Date, actualEnd: Date;
        let prevStart: Date, prevEnd: Date;
        let yearStart: Date, yearEnd: Date;

        if (mode === "month") {
        // âncora: 1º dia do mês selecionado (ignora o 'day' do fim)
        const base = this.startOfMonth(iniRaw);

        actualStart = base;
        actualEnd   = this.endOfMonth(base);

        // mês anterior
        const prevBase = this.startOfMonth(this.addMonths(base, -1));
        prevStart = prevBase;
        prevEnd   = this.endOfMonth(prevBase);

        // mesmo mês do ano anterior
        const yearBase = this.startOfMonth(this.addMonths(base, -12));
        yearStart = yearBase;
        yearEnd   = this.endOfMonth(yearBase);
        } else {
        // range original, mantendo sua lógica
        actualStart = iniRaw;
        actualEnd   = finRaw;

        prevStart = this.addMonths(iniRaw, -(spanInMonths + 1));
        prevEnd   = this.addMonths(finRaw,  -(spanInMonths + 1));

        yearStart = this.addMonths(iniRaw, -12);
        yearEnd   = this.addMonths(finRaw,  -12);
        }

        // ---- Queries ----
        const actualData = await this.getCostCenterSales(
            {
                storeId,
                initialDate: this.toISO(actualStart),
                finalDate: this.toISO(actualEnd),
                mode
            }
        );

        const pastPeriodData: CostCenterSale[] = await this.getCostCenterSales(
            {
                storeId,
                initialDate: this.toISO(prevStart),
                finalDate: this.toISO(prevEnd),
                mode
            }
        );

        const pastYearPeriodData: CostCenterSale[] = await this.getCostCenterSales(
            {
                storeId,
                initialDate: this.toISO(yearStart),
                finalDate: this.toISO(yearEnd),
                mode
            }
        );

        // Totais para part/partLastYear
        const pastYearFaturamentoTotal = pastYearPeriodData.reduce(
            (prev, curr) => prev + curr.saleValue,
            0
        );
        const faturamentoTotal = actualData.reduce(
            (prev, curr) => prev + curr.saleValue,
            0
        );

        // Tendência:
        // - range: projeta pelo dia atual do mês (com base na data de fim recebida)
        // - month: mês alinhado completo => tendência = faturamento (mês cheio)
        const daysInMonthFinRaw = this.getDaysInMonth(dtFinSplit.month, dtFinSplit.year);
        const tendenciaFrom = (val: number) => {
            if (mode === "month") {
            // Mês cheio → tendência = total do mês
            return val;
            }
            // range → projetar por dia do mês informado em dtFin
            const elapsedDays = Math.max(1, dtFinSplit.day); // evita div/0 se vier dia 0 por engano
            return (val / elapsedDays) * daysInMonthFinRaw;
        };

        // ---- Merge final ----
        const combinedData = actualData.map((item) => {
            const pastPeriodItem = pastPeriodData.find(
            (p) =>
                p.departmentVrId1 === item.departmentVrId1 &&
                p.costCenterId === item.costCenterId &&
                p.departmentVrDesc === item.departmentVrDesc
            );
            const pastYearPeriodItem = pastYearPeriodData.find(
            (p) =>
                p.departmentVrId1 === item.departmentVrId1 &&
                p.costCenterId === item.costCenterId &&
                p.departmentVrDesc === item.departmentVrDesc
            );

            const fat = item.saleValue;
            const fatPA = pastPeriodItem ? pastPeriodItem.saleValue : 0;
            const fatAA = pastYearPeriodItem
            ? pastYearPeriodItem.saleValue
            : 0;

            const tendencia = tendenciaFrom(fat);

            const data: CostCenterComparative = {
                costCenterId: item.costCenterId,
                departmentVrId1: item.departmentVrId1,
                departmentVrDesc: item.departmentVrDesc,
                saleValue: fat,

                saleValuePastPeriodData: fatPA,
                percMA: this.percDelta(fat, fatPA),

                saleValuePastYearPeriodData: fatAA,
                percAA: this.percDelta(fat, fatAA),

                partLastYear: this.safeDiv(fatAA, pastYearFaturamentoTotal) * 100,
                part: this.safeDiv(fat, faturamentoTotal) * 100,

                tendencia,
            }

            return data
        });

        return combinedData
    }
}
