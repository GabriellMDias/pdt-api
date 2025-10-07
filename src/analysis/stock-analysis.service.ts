import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PgService } from 'src/pg/pg.service';
import { ensureAnalysisFields } from './utils/ensureAnalysisFields';
import { getOrCreateAnalysisType } from './utils/getOrCreateAnalysisType';

@Injectable()
export class StockAnalysisService {

  private readonly ANALYSIS_CODE = 'diff_producao_transformado';

  private toUtcStartOfDay(dateISO: string) {
    return new Date(dateISO + 'T00:00:00.000Z');
  }

  private fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().slice(0, 10); // YYYY-MM-DD
    return String(d).slice(0, 10);
  }

  private isPastDay(dateISO: string) {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const d = this.toUtcStartOfDay(dateISO);
    return d < todayUTC;
  }

  private async ensureStockAnalysisFields(analysisTypeId: number) {
    await ensureAnalysisFields(this.prisma, analysisTypeId, [
        { key: 'custo_total_anterior', label: 'Custo total anterior', dataType: 'decimal', order: 0 },
        { key: 'custo_total_final',    label: 'Custo total final',    dataType: 'decimal', order: 1 },
        { key: 'dif_custo_total',      label: 'Diferença',            dataType: 'decimal', order: 2 },
      ]);
}


  /** Resumo diferença produção x transformado - por DIA dentro do intervalo (com cache) */
  public async diferencaProducaoTransformadoDiario(lojas: number[], dataInicial: string, dataFinal: string) {
    this.assertParams(lojas, dataInicial);

    const type = await getOrCreateAnalysisType(this.prisma, {code: this.ANALYSIS_CODE, description: 'Diferença Produção × Transformado', groupName: 'stock'});
    const typeId = type.id;
    await this.ensureStockAnalysisFields(typeId);
    // gera lista de dias
    const days: string[] = [];
    for (let d = new Date(dataInicial + 'T00:00:00Z'); d <= new Date(dataFinal + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }

    // Past cache lookup
    const pastDays = days.filter((d) => this.isPastDay(d));
    const pastBuckets = pastDays.map((d) => this.toUtcStartOfDay(d));
    const cached = pastBuckets.length
      ? await this.prisma.analysisResult.findMany({
          where: {
            analysisTypeId: typeId,
            granularity: 'day',
            storeId: { in: lojas },
            bucket: { in: pastBuckets },
          },
        })
      : [];

    const have = new Set(cached.map(r => `${r.storeId}|${r.bucket.toISOString()}`));
    const missing: Array<{ storeId: number; day: string }> = [];
    for (const storeId of lojas) {
      for (const day of pastDays) {
        const key = `${storeId}|${this.toUtcStartOfDay(day).toISOString()}`;
        if (!have.has(key)) missing.push({ storeId, day });
      }
    }

    // compute and cache missing (one store/day)
    for (const item of missing) {
      const rows: any[] = await this.computeDailyFromPg([item.storeId], item.day, item.day);
      const dataRow = rows.find((r: any) => this.fmtDate(r?.data) === item.day)
              ?? rows[0]
              ?? { custo_total_anterior: 0, custo_total_final: 0, dif_custo_total: 0 };
      await this.prisma.analysisResult.create({
        data: {
          analysisTypeId: typeId,
          storeId: item.storeId,
          bucket: this.toUtcStartOfDay(item.day),
          granularity: 'day',
          data: {
            custo_total_anterior: Number(dataRow.custo_total_anterior || 0),
            custo_total_final: Number(dataRow.custo_total_final || 0),
            dif_custo_total: Number(dataRow.dif_custo_total || 0),
          },
          sourceStart: new Date(item.day + 'T00:00:00Z'),
          sourceEnd:   new Date(item.day + 'T23:59:59Z'),
        },
      });
    }

    // aggregate cache + live (today)
    const map = new Map<string, { data: string; custo_total_anterior: number; custo_total_final: number; dif_custo_total: number }>();

    const pastFromCache = pastBuckets.length
      ? await this.prisma.analysisResult.findMany({
          where: {
            analysisTypeId: typeId,
            granularity: 'day',
            storeId: { in: lojas },
            bucket: { in: pastBuckets },
          },
        })
      : [];

    for (const r of pastFromCache) {
      const data = r.bucket.toISOString().slice(0, 10);
      const v: any = r.data || {};
      const acc = map.get(data) || { data, custo_total_anterior: 0, custo_total_final: 0, dif_custo_total: 0 };
      acc.custo_total_anterior += Number(v.custo_total_anterior || 0);
      acc.custo_total_final    += Number(v.custo_total_final || 0);
      acc.dif_custo_total      += Number(v.dif_custo_total || 0);
      map.set(data, acc);
    }

    const liveDays = days.filter((d) => !this.isPastDay(d));
    if (liveDays.length) {
      const live = await this.computeDailyFromPg(lojas, liveDays[0], liveDays[liveDays.length - 1]);
      for (const row of live) {
        const data = row.data.slice(0, 10);
        const acc = map.get(data) || { data, custo_total_anterior: 0, custo_total_final: 0, dif_custo_total: 0 };
        acc.custo_total_anterior += Number(row.custo_total_anterior || 0);
        acc.custo_total_final    += Number(row.custo_total_final || 0);
        acc.dif_custo_total      += Number(row.dif_custo_total || 0);
        map.set(data, acc);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
  }

  /** Resumo diferença produção x transformado - por TIMESTAMP no dia (com cache) */
  public async diferencaProducaoTransformadoNoDia(lojas: number[], data: string) {
    this.assertParams(lojas, data);

    const type = await getOrCreateAnalysisType(this.prisma, {code: this.ANALYSIS_CODE, description: 'Diferença Produção × Transformado', groupName: 'stock'});
    const typeId = type.id;
    await this.ensureStockAnalysisFields(typeId);
    const bucket = this.toUtcStartOfDay(data);
    const past = this.isPastDay(data);

    const cached = await this.prisma.analysisResult.findMany({
      where: { analysisTypeId: typeId, granularity: 'timestamp', storeId: { in: lojas }, bucket }
    });
    const haveStore = new Set(cached.map(r => r.storeId!));

    if (past) {
      for (const storeId of lojas) {
        if (!haveStore.has(storeId)) {
          const rows: any[] = await this.computeTimelineFromPg([storeId], data);
          await this.prisma.analysisResult.create({
            data: {
              analysisTypeId: typeId,
              storeId,
              bucket,
              granularity: 'timestamp',
              data: rows,
              sourceStart: new Date(data + 'T00:00:00Z'),
              sourceEnd:   new Date(data + 'T23:59:59Z'),
            },
          });
        }
      }
    }

    const series = new Map<string, { data: string; custo_total_anterior: number; custo_total_final: number; dif_custo_total: number }>();

    const cachedAll = await this.prisma.analysisResult.findMany({
      where: { analysisTypeId: typeId, granularity: 'timestamp', storeId: { in: lojas }, bucket }
    });

    for (const r of cachedAll) {
      for (const p of ((r.data as any[]) || [])) {
        const key = p.data;
        const acc = series.get(key) || { data: key, custo_total_anterior: 0, custo_total_final: 0, dif_custo_total: 0 };
        acc.custo_total_anterior += Number(p.custo_total_anterior || 0);
        acc.custo_total_final    += Number(p.custo_total_final || 0);
        acc.dif_custo_total      += Number(p.dif_custo_total || 0);
        series.set(key, acc);
      }
    }

    if (!past) {
      const live = await this.computeTimelineFromPg(lojas, data);
      for (const p of live) {
        const key = p.data;
        const acc = series.get(key) || { data: key, custo_total_anterior: 0, custo_total_final: 0, dif_custo_total: 0 };
        acc.custo_total_anterior += Number(p.custo_total_anterior || 0);
        acc.custo_total_final    += Number(p.custo_total_final || 0);
        acc.dif_custo_total      += Number(p.dif_custo_total || 0);
        series.set(key, acc);
      }
    }

    return Array.from(series.values()).sort((a, b) => a.data.localeCompare(b.data));
  }

  constructor(private readonly pg: PgService, private readonly prisma: PrismaService) {}

  /**
   * Resumo diferença produção x transformado - por DIA dentro do intervalo
   */
  private async computeDailyFromPg(lojas: number[], dataInicial: string, dataFinal: string) {
    this.assertParams(lojas, dataInicial);
    if (!dataFinal) throw new BadRequestException('dataFinal é obrigatório');

    const sql = `
      WITH base AS (
        SELECT
          le.id_loja,
          le.id_produto,
          le.datahora,
          le.datamovimento,
          le.id_tipomovimentacao,
          tm.descricao AS tipomovimento,
          tes.descricao AS entrada_saida,
          us.nome      AS usuario,
          le.quantidade,
          le.estoqueanterior,
          le.estoqueatual,
          le.customediosemimposto AS customedio_atual
        FROM logestoque le
        JOIN tipomovimentacao tm ON tm.id = le.id_tipomovimentacao
        JOIN usuario us          ON us.id = le.id_usuario
        JOIN tipoentradasaida tes ON tes.id = le.id_tipoentradasaida
        WHERE le.id_loja = ANY($1::int[])
          AND le.datamovimento >= $2::date
          AND le.datamovimento <= $3::date
          AND le.id_tipomovimentacao IN (23, 24, 27, 28)
      ),
      calc AS (
        SELECT
          b.*,
          COALESCE(prev.customedio_anterior, b.customedio_atual) AS customedio_anterior,
          (b.estoqueanterior * COALESCE(prev.customedio_anterior, b.customedio_atual)) AS custo_total_anterior,
          (b.estoqueatual    * b.customedio_atual)                                      AS custo_total_final
        FROM base b
        LEFT JOIN LATERAL (
          SELECT lc.customediosemimposto AS customedio_anterior
          FROM logcusto lc
          WHERE lc.id_produto = b.id_produto
            AND lc.id_loja    = b.id_loja
            AND lc.datahora   < b.datahora
          ORDER BY lc.datahora DESC
          LIMIT 1
        ) prev ON TRUE
      )
      SELECT
        (calc.datahora::date) AS data,
        ROUND(SUM(custo_total_anterior)::numeric, 4) AS custo_total_anterior,
        ROUND(SUM(custo_total_final)::numeric, 4)    AS custo_total_final,
        ROUND(SUM(custo_total_final - custo_total_anterior)::numeric, 4) AS dif_custo_total
      FROM calc
      GROUP BY (calc.datahora::date)
      HAVING ABS(SUM(custo_total_final - custo_total_anterior)) > 0.01
      ORDER BY (calc.datahora::date);
    `;

    const params = [lojas, dataInicial, dataFinal];
    const { rows } = await this.pg.query(sql, params);
    return rows;
  }

  /**
   * Resumo diferença produção x transformado - por TIMESTAMP no dia
   * Obs.: minutos 'MI' (não 'MM'). Aqui usamos date_trunc('second', datahora).
   */
  private async computeTimelineFromPg(lojas: number[], data: string) {
    this.assertParams(lojas, data);

    const sql = `
      WITH base AS (
        SELECT
          le.id_loja,
          le.id_produto,
          le.datahora,
          le.datamovimento,
          le.id_tipomovimentacao,
          tm.descricao AS tipomovimento,
          tes.descricao AS entrada_saida,
          us.nome      AS usuario,
          le.quantidade,
          le.estoqueanterior,
          le.estoqueatual,
          le.customediosemimposto AS customedio_atual
        FROM logestoque le
        JOIN tipomovimentacao tm ON tm.id = le.id_tipomovimentacao
        JOIN usuario us          ON us.id = le.id_usuario
        JOIN tipoentradasaida tes ON tes.id = le.id_tipoentradasaida
        WHERE le.id_loja = ANY($1::int[])
          AND le.datamovimento = $2::date
          AND le.id_tipomovimentacao IN (23, 24, 27, 28)
      ),
      calc AS (
        SELECT
          b.*,
          COALESCE(prev.customedio_anterior, b.customedio_atual) AS customedio_anterior,
          (b.estoqueanterior * COALESCE(prev.customedio_anterior, b.customedio_atual)) AS custo_total_anterior,
          (b.estoqueatual    * b.customedio_atual)                                      AS custo_total_final
        FROM base b
        LEFT JOIN LATERAL (
          SELECT lc.customediosemimposto AS customedio_anterior
          FROM logcusto lc
          WHERE lc.id_produto = b.id_produto
            AND lc.id_loja    = b.id_loja
            AND lc.datahora   < b.datahora
          ORDER BY lc.datahora DESC
          LIMIT 1
        ) prev ON TRUE
      )
      SELECT
        date_trunc('second', calc.datahora) AS data,
        ROUND(SUM(custo_total_anterior)::numeric, 4) AS custo_total_anterior,
        ROUND(SUM(custo_total_final)::numeric, 4)    AS custo_total_final,
        ROUND(SUM(custo_total_final - custo_total_anterior)::numeric, 4) AS dif_custo_total
      FROM calc
      GROUP BY date_trunc('second', calc.datahora)
      HAVING ABS(SUM(custo_total_final - custo_total_anterior)) > 0.01
      ORDER BY ABS(SUM(custo_total_final - custo_total_anterior)) DESC;
    `;

    const params = [lojas, data];
    const { rows } = await this.pg.query(sql, params);
    return rows;
  }

  private assertParams(lojas: number[], data: string) {
    if (!lojas?.length) throw new BadRequestException('Informe pelo menos uma loja em ?lojas=1,2,...');
    if (!data) throw new BadRequestException('Parâmetros de data são obrigatórios.');
  }
}
