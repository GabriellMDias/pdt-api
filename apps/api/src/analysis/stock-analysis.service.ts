import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { PgService } from 'src/db/pg/pg.service';
import { ensureAnalysisFields } from './utils/ensureAnalysisFields';
import { getOrCreateAnalysisType } from './utils/getOrCreateAnalysisType';

@Injectable()
export class StockAnalysisService {
  private readonly ANALYSIS_CODE = 'diff_producao_transformado';
  private readonly ANALYSIS_CUSTO_MEDIO_ULTIMO_CODE = 'diff_custo_medioxultimo';

  constructor(
    private readonly pg: PgService,
    private readonly prisma: PrismaService,
  ) {}

  private toUtcStartOfDay(dateISO: string) {
    return new Date(dateISO + 'T00:00:00.000Z');
  }

  private buildDayRange(dataInicial: string, dataFinal: string) {
    const days: string[] = [];
    for (
      let d = new Date(dataInicial + 'T00:00:00Z');
      d <= new Date(dataFinal + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  private fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
  }

  private fmtDateTime(d: unknown): string {
    if (!d) return '';
    if (d instanceof Date) {
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString();
    }

    if (typeof d === 'string') {
      const parsed = new Date(d);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
      return d;
    }

    const parsed = new Date(d as any);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    return String(d);
  }

  private isPastDay(dateISO: string) {
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const d = this.toUtcStartOfDay(dateISO);
    return d < todayUTC;
  }

  private async ensureStockAnalysisFields(analysisTypeId: number) {
    await ensureAnalysisFields(this.prisma, analysisTypeId, [
      {
        key: 'custo_total_anterior',
        label: 'Custo total anterior',
        dataType: 'decimal',
        order: 0,
      },
      {
        key: 'custo_total_final',
        label: 'Custo total final',
        dataType: 'decimal',
        order: 1,
      },
      {
        key: 'dif_custo_total',
        label: 'Diferenca',
        dataType: 'decimal',
        order: 2,
      },
    ]);
  }

  private async ensureStockCustoMedioUltimoFields(analysisTypeId: number) {
    await ensureAnalysisFields(this.prisma, analysisTypeId, [
      {
        key: 'qtd_registros',
        label: 'Qtd. registros',
        dataType: 'int',
        order: 0,
      },
      {
        key: 'diferenca_total',
        label: 'Diferenca total',
        dataType: 'decimal',
        order: 1,
      },
      {
        key: 'diferenca_absoluta_total',
        label: 'Diferenca absoluta total',
        dataType: 'decimal',
        order: 2,
      },
    ]);
  }

  /**
   * Resumo diferenca producao x transformado - por DIA dentro do intervalo (com cache)
   */
  public async diferencaProducaoTransformadoDiario(
    lojas: number[],
    dataInicial: string,
    dataFinal: string,
  ) {
    this.assertParams(lojas, dataInicial);
    if (!dataFinal) throw new BadRequestException('dataFinal e obrigatorio');

    const type = await getOrCreateAnalysisType(this.prisma, {
      code: this.ANALYSIS_CODE,
      description: 'Diferenca Producao x Transformado',
      groupName: 'stock',
    });
    const typeId = type.id;
    await this.ensureStockAnalysisFields(typeId);

    const days = this.buildDayRange(dataInicial, dataFinal);

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

    const have = new Set(cached.map((r) => `${r.storeId}|${r.bucket.toISOString()}`));
    const missing: Array<{ storeId: number; day: string }> = [];
    for (const storeId of lojas) {
      for (const day of pastDays) {
        const key = `${storeId}|${this.toUtcStartOfDay(day).toISOString()}`;
        if (!have.has(key)) missing.push({ storeId, day });
      }
    }

    for (const item of missing) {
      const rows: any[] = await this.computeDailyFromPg([item.storeId], item.day, item.day);
      const dataRow =
        rows.find((r: any) => this.fmtDate(r?.data) === item.day) ??
        rows[0] ??
        { custo_total_anterior: 0, custo_total_final: 0, dif_custo_total: 0 };

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
          sourceEnd: new Date(item.day + 'T23:59:59Z'),
        },
      });
    }

    const map = new Map<
      string,
      {
        data: string;
        custo_total_anterior: number;
        custo_total_final: number;
        dif_custo_total: number;
      }
    >();

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
      const acc = map.get(data) || {
        data,
        custo_total_anterior: 0,
        custo_total_final: 0,
        dif_custo_total: 0,
      };
      acc.custo_total_anterior += Number(v.custo_total_anterior || 0);
      acc.custo_total_final += Number(v.custo_total_final || 0);
      acc.dif_custo_total += Number(v.dif_custo_total || 0);
      map.set(data, acc);
    }

    const liveDays = days.filter((d) => !this.isPastDay(d));
    if (liveDays.length) {
      const live = await this.computeDailyFromPg(
        lojas,
        liveDays[0],
        liveDays[liveDays.length - 1],
      );
      for (const row of live) {
        const data = this.fmtDate(row?.data);
        if (!data) continue;
        const acc = map.get(data) || {
          data,
          custo_total_anterior: 0,
          custo_total_final: 0,
          dif_custo_total: 0,
        };
        acc.custo_total_anterior += Number(row.custo_total_anterior || 0);
        acc.custo_total_final += Number(row.custo_total_final || 0);
        acc.dif_custo_total += Number(row.dif_custo_total || 0);
        map.set(data, acc);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
  }

  /**
   * Resumo diferenca producao x transformado - por TIMESTAMP no dia (com cache)
   */
  public async diferencaProducaoTransformadoNoDia(lojas: number[], data: string) {
    this.assertParams(lojas, data);

    const type = await getOrCreateAnalysisType(this.prisma, {
      code: this.ANALYSIS_CODE,
      description: 'Diferenca Producao x Transformado',
      groupName: 'stock',
    });
    const typeId = type.id;
    await this.ensureStockAnalysisFields(typeId);
    const bucket = this.toUtcStartOfDay(data);
    const past = this.isPastDay(data);

    const cached = await this.prisma.analysisResult.findMany({
      where: {
        analysisTypeId: typeId,
        granularity: 'timestamp',
        storeId: { in: lojas },
        bucket,
      },
    });
    const haveStore = new Set(cached.map((r) => r.storeId!));

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
              sourceEnd: new Date(data + 'T23:59:59Z'),
            },
          });
        }
      }
    }

    const series = new Map<
      string,
      {
        data: string;
        custo_total_anterior: number;
        custo_total_final: number;
        dif_custo_total: number;
      }
    >();

    const cachedAll = await this.prisma.analysisResult.findMany({
      where: {
        analysisTypeId: typeId,
        granularity: 'timestamp',
        storeId: { in: lojas },
        bucket,
      },
    });

    for (const r of cachedAll) {
      for (const p of (r.data as any[]) || []) {
        const key = this.fmtDateTime(p?.data);
        if (!key) continue;
        const acc = series.get(key) || {
          data: key,
          custo_total_anterior: 0,
          custo_total_final: 0,
          dif_custo_total: 0,
        };
        acc.custo_total_anterior += Number(p.custo_total_anterior || 0);
        acc.custo_total_final += Number(p.custo_total_final || 0);
        acc.dif_custo_total += Number(p.dif_custo_total || 0);
        series.set(key, acc);
      }
    }

    if (!past) {
      const live = await this.computeTimelineFromPg(lojas, data);
      for (const p of live) {
        const key = this.fmtDateTime(p?.data);
        if (!key) continue;
        const acc = series.get(key) || {
          data: key,
          custo_total_anterior: 0,
          custo_total_final: 0,
          dif_custo_total: 0,
        };
        acc.custo_total_anterior += Number(p.custo_total_anterior || 0);
        acc.custo_total_final += Number(p.custo_total_final || 0);
        acc.dif_custo_total += Number(p.dif_custo_total || 0);
        series.set(key, acc);
      }
    }

    return Array.from(series.values()).sort((a, b) => a.data.localeCompare(b.data));
  }

  /**
   * Resumo diferenca custo medio x ultimo - por DIA dentro do intervalo (com cache)
   */
  public async diferencaCustoMedioxUltimoDiario(
    lojas: number[],
    dataInicial: string,
    dataFinal: string,
  ) {
    this.assertParams(lojas, dataInicial);
    if (!dataFinal) throw new BadRequestException('dataFinal e obrigatorio');

    const type = await getOrCreateAnalysisType(this.prisma, {
      code: this.ANALYSIS_CUSTO_MEDIO_ULTIMO_CODE,
      description: 'Diferenca Custo Medio x Ultimo',
      groupName: 'stock',
    });
    const typeId = type.id;
    await this.ensureStockCustoMedioUltimoFields(typeId);

    const days = this.buildDayRange(dataInicial, dataFinal);
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

    const have = new Set(cached.map((r) => `${r.storeId}|${r.bucket.toISOString()}`));
    const missing: Array<{ storeId: number; day: string }> = [];
    for (const storeId of lojas) {
      for (const day of pastDays) {
        const key = `${storeId}|${this.toUtcStartOfDay(day).toISOString()}`;
        if (!have.has(key)) missing.push({ storeId, day });
      }
    }

    for (const item of missing) {
      const rows: any[] = await this.computeCustoMedioUltimoDailyFromPg(
        [item.storeId],
        item.day,
        item.day,
      );
      const dataRow =
        rows.find((r: any) => this.fmtDate(r?.data) === item.day) ??
        rows[0] ??
        { qtd_registros: 0, diferenca_total: 0, diferenca_absoluta_total: 0 };

      await this.prisma.analysisResult.create({
        data: {
          analysisTypeId: typeId,
          storeId: item.storeId,
          bucket: this.toUtcStartOfDay(item.day),
          granularity: 'day',
          data: {
            qtd_registros: Number(dataRow.qtd_registros || 0),
            diferenca_total: Number(dataRow.diferenca_total || 0),
            diferenca_absoluta_total: Number(
              dataRow.diferenca_absoluta_total || 0,
            ),
          },
          sourceStart: new Date(item.day + 'T00:00:00Z'),
          sourceEnd: new Date(item.day + 'T23:59:59Z'),
        },
      });
    }

    const map = new Map<
      string,
      {
        data: string;
        qtd_registros: number;
        diferenca_total: number;
        diferenca_absoluta_total: number;
      }
    >();

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
      const acc = map.get(data) || {
        data,
        qtd_registros: 0,
        diferenca_total: 0,
        diferenca_absoluta_total: 0,
      };
      acc.qtd_registros += Number(v.qtd_registros || 0);
      acc.diferenca_total += Number(v.diferenca_total || 0);
      acc.diferenca_absoluta_total += Number(v.diferenca_absoluta_total || 0);
      map.set(data, acc);
    }

    const liveDays = days.filter((d) => !this.isPastDay(d));
    if (liveDays.length) {
      const live = await this.computeCustoMedioUltimoDailyFromPg(
        lojas,
        liveDays[0],
        liveDays[liveDays.length - 1],
      );
      for (const row of live) {
        const data = this.fmtDate(row?.data);
        if (!data) continue;
        const acc = map.get(data) || {
          data,
          qtd_registros: 0,
          diferenca_total: 0,
          diferenca_absoluta_total: 0,
        };
        acc.qtd_registros += Number(row.qtd_registros || 0);
        acc.diferenca_total += Number(row.diferenca_total || 0);
        acc.diferenca_absoluta_total += Number(row.diferenca_absoluta_total || 0);
        map.set(data, acc);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
  }

  /**
   * Detalhe diferenca custo medio x ultimo - por dia (com cache para dias passados)
   */
  public async diferencaCustoMedioxUltimoNoDia(lojas: number[], data: string) {
    this.assertParams(lojas, data);

    const type = await getOrCreateAnalysisType(this.prisma, {
      code: this.ANALYSIS_CUSTO_MEDIO_ULTIMO_CODE,
      description: 'Diferenca Custo Medio x Ultimo',
      groupName: 'stock',
    });
    const typeId = type.id;
    await this.ensureStockCustoMedioUltimoFields(typeId);

    const bucket = this.toUtcStartOfDay(data);
    const past = this.isPastDay(data);

    if (past) {
      const cached = await this.prisma.analysisResult.findMany({
        where: {
          analysisTypeId: typeId,
          granularity: 'timestamp',
          storeId: { in: lojas },
          bucket,
        },
      });
      const haveStore = new Set(cached.map((r) => r.storeId!));

      for (const storeId of lojas) {
        if (haveStore.has(storeId)) continue;

        const rows = await this.computeCustoMedioUltimoNoDiaFromPg([storeId], data);
        await this.prisma.analysisResult.create({
          data: {
            analysisTypeId: typeId,
            storeId,
            bucket,
            granularity: 'timestamp',
            data: rows,
            sourceStart: new Date(data + 'T00:00:00Z'),
            sourceEnd: new Date(data + 'T23:59:59Z'),
          },
        });
      }

      const cachedAll = await this.prisma.analysisResult.findMany({
        where: {
          analysisTypeId: typeId,
          granularity: 'timestamp',
          storeId: { in: lojas },
          bucket,
        },
      });

      const merged = cachedAll
        .flatMap((r) => (r.data as any[]) || [])
        .map((row: any) => this.normalizeCustoMedioUltimoRow(row));

      merged.sort((a, b) => b.diferenca - a.diferenca || a.data.localeCompare(b.data));
      return merged;
    }

    const live = await this.computeCustoMedioUltimoNoDiaFromPg(lojas, data);
    const normalized = live.map((row: any) => this.normalizeCustoMedioUltimoRow(row));
    normalized.sort((a, b) => b.diferenca - a.diferenca || a.data.localeCompare(b.data));
    return normalized;
  }

  /**
   * Resumo diferenca producao x transformado - por DIA dentro do intervalo
   */
  private async computeDailyFromPg(
    lojas: number[],
    dataInicial: string,
    dataFinal: string,
  ) {
    this.assertParams(lojas, dataInicial);
    if (!dataFinal) throw new BadRequestException('dataFinal e obrigatorio');

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
   * Resumo diferenca producao x transformado - por TIMESTAMP no dia
   * Obs.: minutos 'MI' (nao 'MM'). Aqui usamos date_trunc('second', datahora).
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

  private async computeCustoMedioUltimoDailyFromPg(
    lojas: number[],
    dataInicial: string,
    dataFinal: string,
  ) {
    this.assertParams(lojas, dataInicial);
    if (!dataFinal) throw new BadRequestException('dataFinal e obrigatorio');

    const sql = `
      WITH base AS (
        SELECT
          le.datahora,
          ROUND(
            (
              (lc.customediocomimposto * le.estoqueatual)
              - (lc.customediocomimpostoanterior * le.estoqueanterior)
            ) - (le.quantidade * le.custocomimposto),
            2
          ) AS diferenca
        FROM logestoque le
        JOIN logcusto lc
          ON lc.id_loja = le.id_loja
         AND lc.id_produto = le.id_produto
         AND lc.datahora = le.datahora
        WHERE le.id_loja = ANY($1::int[])
          AND le.datahora >= $2::date
          AND le.datahora < ($3::date + INTERVAL '1 day')
          AND le.id_tipoentradasaida = 0
          AND le.estoqueanterior < 0
          AND le.id_tipomovimentacao IN (5)
      )
      SELECT
        (base.datahora::date) AS data,
        COUNT(*)::int AS qtd_registros,
        ROUND(SUM(base.diferenca)::numeric, 2) AS diferenca_total,
        ROUND(SUM(ABS(base.diferenca))::numeric, 2) AS diferenca_absoluta_total
      FROM base
      WHERE ABS(base.diferenca) > 100
      GROUP BY (base.datahora::date)
      ORDER BY (base.datahora::date);
    `;

    const params = [lojas, dataInicial, dataFinal];
    const { rows } = await this.pg.query(sql, params);
    return rows;
  }

  private async computeCustoMedioUltimoNoDiaFromPg(lojas: number[], data: string) {
    this.assertParams(lojas, data);

    const sql = `
      WITH base AS (
        SELECT
          le.id_loja,
          le.id_produto,
          le.datahora AS data,
          ROUND(
            (
              (lc.customediocomimposto * le.estoqueatual)
              - (lc.customediocomimpostoanterior * le.estoqueanterior)
            ) - (le.quantidade * le.custocomimposto),
            2
          ) AS diferenca
        FROM logestoque le
        JOIN logcusto lc
          ON lc.id_loja = le.id_loja
         AND lc.id_produto = le.id_produto
         AND lc.datahora = le.datahora
        WHERE le.id_loja = ANY($1::int[])
          AND le.datahora >= $2::date
          AND le.datahora < ($2::date + INTERVAL '1 day')
          AND le.id_tipoentradasaida = 0
          AND le.estoqueanterior < 0
          AND le.id_tipomovimentacao IN (5)
      )
      SELECT
        base.id_loja,
        base.id_produto,
        base.data,
        base.diferenca
      FROM base
      WHERE ABS(base.diferenca) > 100
      ORDER BY base.diferenca DESC, base.data DESC;
    `;

    const params = [lojas, data];
    const { rows } = await this.pg.query(sql, params);
    return rows;
  }

  private normalizeCustoMedioUltimoRow(row: any) {
    return {
      id_loja: Number(row?.id_loja || 0),
      id_produto: Number(row?.id_produto || 0),
      data: this.fmtDateTime(row?.data),
      diferenca: Number(row?.diferenca || 0),
    };
  }

  private assertParams(lojas: number[], data: string) {
    if (!lojas?.length) {
      throw new BadRequestException(
        'Informe pelo menos uma loja em ?storeIds=1,2,...',
      );
    }
    if (!data) throw new BadRequestException('Parametros de data sao obrigatorios.');
  }
}
