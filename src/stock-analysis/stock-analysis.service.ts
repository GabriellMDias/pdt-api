// src/stock/analysis/stock-analysis.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PgService } from 'src/pg/pg.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StockAnalysisService {
  constructor(
    private readonly pg: PgService,
    private readonly prisma: PrismaService) {}

  /**
   * Resumo diferença produção x transformado - por DIA dentro do intervalo
   */
  async resumoMes(lojas: number[], dataInicial: string, dataFinal: string) {
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
  async resumoDia(lojas: number[], data: string) {
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
