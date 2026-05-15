import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DailyResultLineConfig,
  DailyResultLineSourceType,
  MonthlyResultConsolidationStatus,
} from '@prisma/client';
import { PgService } from 'src/db/pg/pg.service';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { DreService } from '../dre.service';
import { GetRecBrutaDetailsQueryDto } from './dto/get-rec-bruta-details.query.dto';

type DetailSource = 'CONSOLIDATED' | 'NOT_CONSOLIDATED';

type ResultLineDetailItem = {
  date: string;
  storeId: number;
  sourceStoreId?: number | null;
  allocationStoreId?: number | null;
  costCenterId: number | null;
  allocationCostCenterId?: number | null;
  allocationPercent?: number | null;
  accountId?: number | null;
  accountDescription?: string | null;
  dreLineDescription?: string | null;
  source: DetailSource;
  origin: string;
  description: string;
  debitValue: number;
  creditValue: number;
  value: number;
};

type MonthSlice = {
  month: Date;
  initialDate: string;
  finalDate: string;
};

type VrDreTerm = {
  vrDreId: number;
  multiplier: 1 | -1;
};

type AccountingDetailRow = {
  idContaContabilFiscal: number;
  contaContabil: string | null;
  linhaDre: string | null;
  vrDreId: number;
  date: string;
  historico: string | null;
  origem: string | null;
  storeId: number;
  sourceStoreId: number;
  allocationStoreId: number | null;
  debitValue: number | string | null;
  creditValue: number | string | null;
  costCenterId: number | null;
  allocationPercent: number | string | null;
};

type JsonRecord = Record<string, unknown>;

const SUPPORTED_DETAIL_LINE_IDS = new Set([
  'recBruta',
  'devolucao',
  'imposto',
  'custo',
  'embalagem',
  'quebra',
  'recCom',
  'despesaPessoal',
  'despesaPessoalRat',
  'despesaOperacional',
]);

@Injectable()
export class ResultLinesService {
  constructor(
    private readonly dreService: DreService,
    private readonly pg: PgService,
    private readonly prisma: PrismaService,
  ) {}

  getRecBrutaDetails(dto: GetRecBrutaDetailsQueryDto) {
    return this.getLineDetails('recBruta', dto);
  }

  async getLineDetails(lineId: string, dto: GetRecBrutaDetailsQueryDto) {
    const normalizedLineId = lineId.trim();
    if (!SUPPORTED_DETAIL_LINE_IDS.has(normalizedLineId)) {
      throw new BadRequestException(
        `Detalhamento nao suportado para a linha ${normalizedLineId}.`,
      );
    }

    const lineConfig = await this.getSupportedLineConfig(normalizedLineId);
    const sourceConfig = this.asRecord(lineConfig.sourceConfig);
    const sourceField =
      typeof sourceConfig?.sourceField === 'string' ? sourceConfig.sourceField : null;

    if (!sourceField) {
      throw new BadRequestException(
        `Linha ${normalizedLineId} nao possui campo de origem configurado.`,
      );
    }

    if (!this.isDetailEnabled(lineConfig)) {
      throw new BadRequestException(
        `Detalhamento nao esta habilitado para a linha ${normalizedLineId}.`,
      );
    }

    const storeIds = this.uniqueNumbers([...(dto.storeIds ?? []), ...(dto.storeId ?? [])]);
    const costCenterIds = this.uniqueNumbers([
      ...(dto.costCenterIds ?? []),
      ...(dto.costCenterId ?? []),
    ]);

    if (storeIds.length === 0) {
      throw new BadRequestException('Informe ao menos uma loja.');
    }

    const initialDate = this.parseDate(dto.initialDate);
    const finalDate = this.parseDate(dto.finalDate);
    if (initialDate.getTime() > finalDate.getTime()) {
      throw new BadRequestException('A data inicial deve ser menor ou igual a data final.');
    }

    const items: ResultLineDetailItem[] = [];

    if (this.shouldUseVrMasterOnlyDetails(normalizedLineId)) {
      items.push(
        ...(await this.getConsolidatedLineDetails({
          lineConfig,
          initialDate: this.toYmd(initialDate),
          finalDate: this.toYmd(finalDate),
          storeIds,
          costCenterIds,
        })),
      );
    } else {
      const slices = this.monthSlices(initialDate, finalDate);
      const statusResolver = await this.buildStatusResolver(storeIds, slices);

      for (const slice of slices) {
        const consolidatedStoreIds = storeIds.filter((storeId) =>
          statusResolver(storeId, slice.month),
        );
        const notConsolidatedStoreIds = storeIds.filter(
          (storeId) => !consolidatedStoreIds.includes(storeId),
        );

        if (consolidatedStoreIds.length > 0) {
          items.push(
            ...(await this.getConsolidatedLineDetails({
              lineConfig,
              initialDate: slice.initialDate,
              finalDate: slice.finalDate,
              storeIds: consolidatedStoreIds,
              costCenterIds,
            })),
          );
        }

        if (notConsolidatedStoreIds.length > 0) {
          items.push(
            ...(await this.getNotConsolidatedLineDetails({
              lineConfig,
              sourceField,
              initialDate: slice.initialDate,
              finalDate: slice.finalDate,
              storeIds: notConsolidatedStoreIds,
              costCenterIds,
            })),
          );
        }
      }
    }

    items.sort((a, b) =>
      [
        a.date.localeCompare(b.date),
        a.storeId - b.storeId,
        (a.costCenterId ?? 0) - (b.costCenterId ?? 0),
        a.origin.localeCompare(b.origin),
        a.description.localeCompare(b.description),
      ].find((result) => result !== 0) ?? 0,
    );

    const totals = items.reduce(
      (acc, item) => {
        acc.debitValue = this.round2(acc.debitValue + item.debitValue);
        acc.creditValue = this.round2(acc.creditValue + item.creditValue);
        acc.value = this.round2(acc.value + item.value);
        return acc;
      },
      { debitValue: 0, creditValue: 0, value: 0 },
    );

    return {
      lineId: normalizedLineId,
      label: lineConfig.label,
      detailLevel: 1,
      writesEnabled: false,
      items,
      totals,
    };
  }

  private async getSupportedLineConfig(lineId: string) {
    const lineConfig = await this.prisma.dailyResultLineConfig.findUnique({
      where: { lineId },
    });

    if (!lineConfig || !lineConfig.active) {
      throw new BadRequestException(`Linha ${lineId} nao esta configurada ou ativa.`);
    }

    if (lineConfig.sourceType !== DailyResultLineSourceType.DIRECT_FIELD) {
      throw new BadRequestException(
        `Detalhamento nesta etapa aceita apenas linhas do tipo Campo Direto.`,
      );
    }

    return lineConfig;
  }

  private async getConsolidatedLineDetails(input: {
    lineConfig: DailyResultLineConfig;
    initialDate: string;
    finalDate: string;
    storeIds: number[];
    costCenterIds: number[];
  }): Promise<ResultLineDetailItem[]> {
    const vrDreTerms = this.readVrDreTerms(input.lineConfig);
    if (vrDreTerms.length === 0) {
      throw new BadRequestException(
        `Linha ${input.lineConfig.lineId} nao possui DRE VRMaster configurado para detalhamento consolidado.`,
      );
    }

    const termByDreId = new Map(vrDreTerms.map((term) => [term.vrDreId, term]));
    const result = await this.pg.query<AccountingDetailRow>(
      `
        SELECT
          cl.id_contacontabilfiscal AS "idContaContabilFiscal",
          ccf.descricao AS "contaContabil",
          dre.descricao AS "linhaDre",
          dre.id AS "vrDreId",
          to_char(c."data"::date, 'YYYY-MM-DD') AS "date",
          cl.historico AS "historico",
          toc.descricao AS "origem",
          COALESCE(NULLIF(clcc.id_loja, 0), c.id_loja) AS "storeId",
          c.id_loja AS "sourceStoreId",
          NULLIF(clcc.id_loja, 0) AS "allocationStoreId",
          CASE
            WHEN clcc.percentual IS NULL THEN cl.valordebito
            ELSE cl.valordebito * (clcc.percentual / 100)
          END AS "debitValue",
          CASE
            WHEN clcc.percentual IS NULL THEN cl.valorcredito
            ELSE cl.valorcredito * (clcc.percentual / 100)
          END AS "creditValue",
          clcc.id_centrocusto AS "costCenterId",
          clcc.percentual AS "allocationPercent"
        FROM contabilidade c
        JOIN tipoorigemcontabilidade toc ON toc.id = c.id_tipoorigemcontabilidade
        JOIN contabilidadelancamento cl ON cl.id_contabilidade = c.id
        JOIN contacontabilfiscal ccf ON ccf.id = cl.id_contacontabilfiscal
        JOIN contabilidade.dreitem drei ON drei.id_contacontabilfiscal = cl.id_contacontabilfiscal
        JOIN contabilidade.dre dre ON dre.id = drei.id_dre
        LEFT JOIN contabilidadelancamentocentrocusto clcc
          ON clcc.id_contabilidadelancamento = cl.id
        WHERE c."data"::date BETWEEN $1::date AND $2::date
          AND COALESCE(NULLIF(clcc.id_loja, 0), c.id_loja) = ANY($3::int[])
          AND dre.id = ANY($4::int[])
          AND (
            $5::int[] IS NULL
            OR array_length($5::int[], 1) IS NULL
            OR clcc.id_centrocusto IS NULL
            OR clcc.id_centrocusto = ANY($5::int[])
          )
        ORDER BY c."data", c.id_loja, clcc.id_centrocusto NULLS LAST, dre.ordem, cl.id;
      `,
      [
        input.initialDate,
        input.finalDate,
        input.storeIds,
        [...termByDreId.keys()],
        input.costCenterIds.length > 0 ? input.costCenterIds : null,
      ],
    );

    return result.rows.map((row) => {
      const term = termByDreId.get(row.vrDreId) ?? {
        vrDreId: row.vrDreId,
        multiplier: 1 as const,
      };
      const values = this.applyMultiplierToAccountingValues({
        debitValue: Number(row.debitValue ?? 0),
        creditValue: Number(row.creditValue ?? 0),
        multiplier: term.multiplier,
      });

      return {
        date: row.date,
        storeId: row.storeId,
        sourceStoreId: row.sourceStoreId,
        allocationStoreId: row.allocationStoreId,
        costCenterId: row.costCenterId,
        allocationCostCenterId: row.costCenterId,
        allocationPercent:
          row.allocationPercent === null || row.allocationPercent === undefined
            ? null
            : Number(row.allocationPercent),
        accountId: row.idContaContabilFiscal,
        accountDescription: row.contaContabil,
        dreLineDescription: row.linhaDre,
        source: 'CONSOLIDATED',
        origin: row.origem || 'VRMaster',
        description:
          row.historico?.trim() ||
          row.contaContabil?.trim() ||
          row.linhaDre?.trim() ||
          `Conta ${row.idContaContabilFiscal}`,
        ...values,
      };
    });
  }

  private async getNotConsolidatedLineDetails(input: {
    lineConfig: DailyResultLineConfig;
    sourceField: string;
    initialDate: string;
    finalDate: string;
    storeIds: number[];
    costCenterIds: number[];
  }): Promise<ResultLineDetailItem[]> {
    const items: ResultLineDetailItem[] = [];

    for (const storeId of input.storeIds) {
      const rows = await this.dreService.getNotConsolidatedDre({
        storeId: [storeId],
        costCenterId: input.costCenterIds.length > 0 ? input.costCenterIds : undefined,
        initialDate: input.initialDate,
        finalDate: input.finalDate,
      });

      for (const row of rows) {
        const value = this.round2(Number(row.data?.[input.sourceField] ?? 0));
        if (this.nearZero(value)) continue;

        items.push({
          date: input.initialDate,
          storeId,
          costCenterId: row.costCenterId,
          source: 'NOT_CONSOLIDATED',
          origin: 'PDT Connect',
          description:
            input.initialDate === input.finalDate
              ? `${input.lineConfig.label} calculado pelo Resultado Diario`
              : `${input.lineConfig.label} calculado pelo Resultado Diario (${input.initialDate} a ${input.finalDate})`,
          debitValue: value < 0 ? Math.abs(value) : 0,
          creditValue: value >= 0 ? value : 0,
          value,
        });
      }
    }

    return items;
  }

  private isDetailEnabled(lineConfig: DailyResultLineConfig) {
    const detailConfig = this.asRecord(lineConfig.detailConfig);
    if (!detailConfig) return SUPPORTED_DETAIL_LINE_IDS.has(lineConfig.lineId);
    if (detailConfig.enabled === false || detailConfig.detailEnabled === false) {
      return false;
    }

    const detailSourceType =
      typeof detailConfig.detailSourceType === 'string'
        ? detailConfig.detailSourceType
        : 'CUSTOM_SOURCE';
    const detailSourceKey =
      typeof detailConfig.detailSourceKey === 'string'
        ? detailConfig.detailSourceKey
        : lineConfig.lineId;

    return (
      detailSourceType === 'CUSTOM_SOURCE' &&
      detailSourceKey === lineConfig.lineId &&
      SUPPORTED_DETAIL_LINE_IDS.has(lineConfig.lineId)
    );
  }

  private shouldUseVrMasterOnlyDetails(lineId: string) {
    return [
      'despesaOperacional',
      'despesaPessoal',
      'despesaPessoalRat',
    ].includes(lineId);
  }

  private readVrDreTerms(lineConfig: DailyResultLineConfig): VrDreTerm[] {
    const sourceConfig = this.asRecord(lineConfig.sourceConfig);
    const rawTerms = sourceConfig?.vrDreTerms;

    if (Array.isArray(rawTerms)) {
      const terms = rawTerms.map((term, index) => {
        const record = this.asRecord(term);
        const vrDreId = Number(record?.vrDreId);
        const multiplier: 1 | -1 = record?.multiplier === -1 ? -1 : 1;

        if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
          throw new BadRequestException(
            `sourceConfig.vrDreTerms[${index}].vrDreId invalido para ${lineConfig.lineId}.`,
          );
        }

        return { vrDreId, multiplier };
      });

      if (terms.length > 0) return terms;
    }

    if (lineConfig.vrDreId) {
      return [{ vrDreId: lineConfig.vrDreId, multiplier: 1 }];
    }

    const vrDreIds = Array.isArray(sourceConfig?.vrDreIds)
      ? sourceConfig.vrDreIds
      : [];

    const terms = vrDreIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .map((vrDreId) => ({ vrDreId, multiplier: 1 as const }));

    if (terms.length > 0) return terms;

    const reconciliationTerms = this.readReconciliationVrDreTerms(
      lineConfig,
      sourceConfig,
    );
    if (reconciliationTerms.length > 0) return reconciliationTerms;

    return [];
  }

  private readReconciliationVrDreTerms(
    lineConfig: DailyResultLineConfig,
    sourceConfig: JsonRecord | null,
  ): VrDreTerm[] {
    const rawGroups =
      Array.isArray(sourceConfig?.dreReconciliationGroups)
        ? sourceConfig.dreReconciliationGroups
        : sourceConfig?.dreReconciliationGroup
          ? [sourceConfig.dreReconciliationGroup]
          : [];

    const terms: VrDreTerm[] = [];
    for (const [groupIndex, group] of rawGroups.entries()) {
      const groupRecord = this.asRecord(group);
      const localLineIds = Array.isArray(groupRecord?.localLineIds)
        ? groupRecord.localLineIds
        : [];

      if (!localLineIds.includes(lineConfig.lineId)) continue;

      const rawTerms = groupRecord?.vrDreTerms;
      if (!Array.isArray(rawTerms)) continue;

      rawTerms.forEach((term, termIndex) => {
        const record = this.asRecord(term);
        const vrDreId = Number(record?.vrDreId);
        const multiplier: 1 | -1 = record?.multiplier === -1 ? -1 : 1;

        if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
          throw new BadRequestException(
            `sourceConfig.dreReconciliationGroups[${groupIndex}].vrDreTerms[${termIndex}].vrDreId invalido para ${lineConfig.lineId}.`,
          );
        }

        terms.push({ vrDreId, multiplier });
      });
    }

    return terms;
  }

  private applyMultiplierToAccountingValues(input: {
    debitValue: number;
    creditValue: number;
    multiplier: 1 | -1;
  }) {
    const debitValue = this.round2(input.debitValue);
    const creditValue = this.round2(input.creditValue);

    if (input.multiplier === 1) {
      return {
        debitValue,
        creditValue,
        value: this.round2(creditValue - debitValue),
      };
    }

    return {
      debitValue: creditValue,
      creditValue: debitValue,
      value: this.round2(debitValue - creditValue),
    };
  }

  private async buildStatusResolver(storeIds: number[], slices: MonthSlice[]) {
    const initialMonth = slices[0].month;
    const finalMonth = slices[slices.length - 1].month;
    const finalExclusive = this.addMonths(finalMonth, 1);

    const [explicitStatuses, monthlyResultMonths] = await Promise.all([
      this.prisma.monthlyResultConsolidation.findMany({
        where: {
          storeId: { in: storeIds },
          month: { gte: initialMonth, lt: finalExclusive },
        },
        select: { storeId: true, month: true, status: true },
      }),
      this.prisma.monthlyResult.groupBy({
        by: ['storeId', 'date'],
        where: {
          storeId: { in: storeIds },
          date: { gte: initialMonth, lt: finalExclusive },
        },
      }),
    ]);

    const explicitByStoreMonth = new Map(
      explicitStatuses.map((status) => [
        this.storeMonthKey(status.storeId, status.month),
        status.status,
      ]),
    );
    const monthlyResultByStoreMonth = new Set(
      monthlyResultMonths.map((row) => this.storeMonthKey(row.storeId, row.date)),
    );

    return (storeId: number, month: Date) => {
      const key = this.storeMonthKey(storeId, month);
      const explicit = explicitByStoreMonth.get(key);

      if (explicit) {
        return explicit === MonthlyResultConsolidationStatus.CONSOLIDATED;
      }

      return monthlyResultByStoreMonth.has(key);
    };
  }

  private monthSlices(initialDate: Date, finalDate: Date): MonthSlice[] {
    const slices: MonthSlice[] = [];
    let cursor = this.startOfMonth(initialDate);

    while (cursor.getTime() <= finalDate.getTime()) {
      const monthStart = this.startOfMonth(cursor);
      const monthEnd = this.endOfMonth(cursor);
      const start = new Date(Math.max(monthStart.getTime(), initialDate.getTime()));
      const end = new Date(Math.min(monthEnd.getTime(), finalDate.getTime()));

      slices.push({
        month: monthStart,
        initialDate: this.toYmd(start),
        finalDate: this.toYmd(end),
      });

      cursor = this.addMonths(monthStart, 1);
    }

    return slices;
  }

  private uniqueNumbers(values: number[]) {
    return [...new Set(values)].filter((value) => Number.isInteger(value) && value > 0);
  }

  private parseDate(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private startOfMonth(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  }

  private endOfMonth(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
  }

  private addMonths(value: Date, amount: number) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1));
  }

  private toYmd(value: Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }

  private storeMonthKey(storeId: number, month: Date) {
    return `${storeId}:${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private asRecord(value: unknown): JsonRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as JsonRecord)
      : null;
  }

  private round2(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private nearZero(value: number) {
    return Math.abs(value) < 1e-9;
  }
}
