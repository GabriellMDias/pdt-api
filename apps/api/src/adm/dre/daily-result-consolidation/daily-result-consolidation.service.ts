import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DailyResultLineConfig,
  DailyResultLineSourceType,
  MonthlyResultConsolidationStatus,
  Prisma,
} from '@prisma/client';
import { PgService } from 'src/db/pg/pg.service';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { DreService } from '../dre.service';
import { DailyResultConsolidationConfirmDto } from './dto/daily-result-consolidation-confirm.dto';
import { DailyResultConsolidationDryRunDto } from './dto/daily-result-consolidation-dry-run.dto';

type MonthRange = {
  month: string;
  initialDate: string;
  finalDate: string;
  expectedDates: string[];
};

type VrDreTerm = {
  vrDreId: number;
  multiplier: 1 | -1;
};

type FiscalIntegrationStatus = {
  status: 'OK' | 'ERROR';
  missingDates: string[];
  notFinalizedDates: string[];
};

type DistributionStrategy =
  | 'PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT'
  | 'VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT'
  | 'VRMASTER_COST_CENTER_EXACT';

type SupportedDirectLineId =
  | 'recBruta'
  | 'devolucao'
  | 'imposto'
  | 'custo'
  | 'embalagem'
  | 'quebra'
  | 'recCom'
  | 'despesaPessoal'
  | 'despesaPessoalRat'
  | 'despesaOperacional';

type PdtConnectDreRow = {
  storeId: number;
  costCenterId: number;
  data: Record<string, number | string | null | undefined>;
};

type CurrentCostCenterValue = {
  storeId: number;
  costCenterId: number;
  currentValue: number;
};

type VrMasterDreDetailRow = {
  vrDreId: number;
  lineDescription: string | null;
  sourceStoreId: number;
  destinationStoreId: number;
  costCenterId: number | null;
  debitValue: number;
  creditValue: number;
  value: number;
};

type VrMasterTermPreview = VrDreTerm & {
  lineDescription: string | null;
  rawDebitValue: number;
  rawCreditValue: number;
  rawValue: number;
  debitValue: number;
  creditValue: number;
  value: number;
};

type CostCenterPreview = {
  storeId: number;
  costCenterId: number;
  currentValue: number;
  participation: number;
  vrMasterValue?: number;
  vrMasterAllocatedValue?: number;
  unallocatedAdjustment?: number;
  adjustment: number;
  consolidatedValue: number;
};

type LinePreview = {
  lineId: string;
  label: string;
  sourceField: string | null;
  distributionStrategy: DistributionStrategy | null;
  vrDreTerms: VrMasterTermPreview[];
  pdtConnectTotal: number;
  vrMasterTotal: number;
  vrMasterDebitTotal: number;
  vrMasterCreditTotal: number;
  vrMasterNetTotal: number;
  vrMasterAllocatedTotal: number;
  unallocatedValue: number;
  apportionedValue: number;
  difference: number;
  costCenters: CostCenterPreview[];
  finalTotal: number;
  roundingResidualApplied: number;
  warnings: string[];
  blockedReason?: string;
};

type JsonRecord = Record<string, unknown>;

const MONTHLY_RESULT_DIRECT_FIELDS = [
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
] as const;

type MonthlyResultDirectField = (typeof MONTHLY_RESULT_DIRECT_FIELDS)[number];
type MonthlyResultDirectValues = Record<MonthlyResultDirectField, number>;
const MONTHLY_RESULT_DIRECT_FIELD_SET = new Set<string>(
  MONTHLY_RESULT_DIRECT_FIELDS,
);

const SUPPORTED_LINE_IDS: SupportedDirectLineId[] = [
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
];

const SUPPORTED_LINE_ID_SET = new Set<string>(SUPPORTED_LINE_IDS);

const DISTRIBUTION_STRATEGIES = new Set<string>([
  'PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT',
  'VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT',
  'VRMASTER_COST_CENTER_EXACT',
]);

const FISCAL_INTEGRATION_ERROR =
  'Nao e possivel consolidar. A integracao fiscal do mes ainda nao esta finalizada para todos os dias.';

@Injectable()
export class DailyResultConsolidationService {
  constructor(
    private readonly dreService: DreService,
    private readonly pg: PgService,
    private readonly prisma: PrismaService,
  ) {}

  async dryRun(dto: DailyResultConsolidationDryRunDto) {
    return this.buildDryRun(dto);
  }

  async confirm(
    dto: DailyResultConsolidationConfirmDto,
    userId?: number | null,
  ) {
    const preview = await this.buildDryRun({
      month: dto.month,
      storeId: dto.storeId,
    });
    this.assertPreviewCanBePersisted(preview);
    const month = this.monthStringToDate(preview.month);
    const nextMonth = this.addMonths(month, 1);
    const rowsToPersist = this.buildMonthlyResultRows(preview);
    const warnings = this.collectPreviewWarnings(preview);
    const totals = this.calculatePersistedTotals(rowsToPersist);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const store = await tx.store.findUnique({
          where: { id: dto.storeId },
          select: { id: true },
        });

        if (!store) {
          throw new BadRequestException(`Store ${dto.storeId} not found`);
        }

        const currentStatus = await tx.monthlyResultConsolidation.findUnique({
          where: {
            storeId_month: {
              storeId: dto.storeId,
              month,
            },
          },
          select: { status: true },
        });

        if (
          currentStatus?.status === MonthlyResultConsolidationStatus.CONSOLIDATED
        ) {
          throw new BadRequestException(
            'Resultado ja consolidado para este mes e loja. Estorne antes de consolidar novamente.',
          );
        }

        await this.ensureCostCentersExist(
          tx,
          [...rowsToPersist.keys()],
        );

        let created = 0;
        let updated = 0;

        for (const [costCenterId, values] of rowsToPersist.entries()) {
          const existingRows = await tx.monthlyResult.findMany({
            where: {
              storeId: dto.storeId,
              costCenterId,
              date: {
                gte: month,
                lt: nextMonth,
              },
            },
            orderBy: { id: 'asc' },
          });

          if (existingRows.length > 1) {
            throw new BadRequestException(
              `Nao e possivel consolidar: existem ${existingRows.length} registros MonthlyResult para loja ${dto.storeId}, centro de custo ${costCenterId} e mes ${preview.month}.`,
            );
          }

          const existing = existingRows[0] ?? null;
          if (existing) {
            await tx.monthlyResult.update({
              where: { id: existing.id },
              data: {
                date: month,
                ...values,
              },
            });
            updated += 1;
          } else {
            await tx.monthlyResult.create({
              data: {
                storeId: dto.storeId,
                costCenterId,
                date: month,
                ...values,
              },
            });
            created += 1;
          }
        }

        const consolidatedAt = new Date();
        const consolidation = await tx.monthlyResultConsolidation.upsert({
          where: {
            storeId_month: {
              storeId: dto.storeId,
              month,
            },
          },
          create: {
            storeId: dto.storeId,
            month,
            status: MonthlyResultConsolidationStatus.CONSOLIDATED,
            consolidatedAt,
            consolidatedByUserId: userId ?? null,
            notes: 'Consolidacao automatica do Resultado Diario.',
          },
          update: {
            status: MonthlyResultConsolidationStatus.CONSOLIDATED,
            consolidatedAt,
            consolidatedByUserId: userId ?? null,
            reversedAt: null,
            reversedByUserId: null,
            notes: 'Consolidacao automatica do Resultado Diario.',
          },
        });

        return {
          created,
          updated,
          consolidation,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      month: preview.month,
      storeId: dto.storeId,
      status: MonthlyResultConsolidationStatus.CONSOLIDATED,
      source: 'EXPLICIT_STATUS',
      writesEnabled: true,
      monthlyResult: {
        created: result.created,
        updated: result.updated,
        costCenterCount: rowsToPersist.size,
      },
      consolidation: {
        status: result.consolidation.status,
        consolidatedAt: result.consolidation.consolidatedAt,
        consolidatedByUserId: result.consolidation.consolidatedByUserId,
        notes: result.consolidation.notes,
      },
      persistedFields: MONTHLY_RESULT_DIRECT_FIELDS,
      totals,
      warnings,
    };
  }

  private async buildDryRun(dto: DailyResultConsolidationDryRunDto) {
    const lineIds = this.normalizeRequestedLineIds(dto.lineIds);
    const monthRange = this.parseMonth(dto.month);
    const fiscalIntegration = await this.validateFiscalIntegration(monthRange);

    const [lineConfigs, pdtConnectRows] = await Promise.all([
      this.getLineConfigs(lineIds),
      this.getPdtConnectRows(dto.storeId, monthRange),
    ]);

    const vrDreIds = this.collectVrDreIds(lineIds, lineConfigs);
    const vrMasterDetails = await this.getVrMasterDreDetails({
      storeId: dto.storeId,
      monthRange,
      vrDreIds,
    });

    const lines = lineIds.map((lineId) =>
      this.buildLinePreview({
        lineId,
        storeId: dto.storeId,
        lineConfig: lineConfigs.get(lineId) ?? null,
        pdtConnectRows,
        vrMasterDetails,
      }),
    );

    return {
      month: monthRange.month,
      storeId: dto.storeId,
      period: {
        initialDate: monthRange.initialDate,
        finalDate: monthRange.finalDate,
      },
      fiscalIntegration,
      lines,
      writesEnabled: false,
    };
  }

  private normalizeRequestedLineIds(lineIds?: string[]) {
    const requested = lineIds?.length ? lineIds : SUPPORTED_LINE_IDS;
    const normalized = [...new Set(requested.map((lineId) => lineId.trim()))]
      .filter(Boolean);
    const unsupported = normalized.filter(
      (lineId) => !SUPPORTED_LINE_ID_SET.has(lineId),
    );

    if (unsupported.length > 0) {
      throw new BadRequestException(
        `Dry-run supports only direct lines in this step. Unsupported lineIds: ${unsupported.join(', ')}`,
      );
    }

    return normalized as SupportedDirectLineId[];
  }

  private async validateFiscalIntegration(
    monthRange: MonthRange,
  ): Promise<FiscalIntegrationStatus> {
    const result = await this.pg.query<{
      date: string;
      fiscal: boolean;
    }>(
      `
        SELECT
          to_char(data::date, 'YYYY-MM-DD') AS "date",
          bool_and(COALESCE(fiscal, false)) AS "fiscal"
        FROM contabilidade.integracao
        WHERE data::date BETWEEN $1::date AND $2::date
        GROUP BY data::date
        ORDER BY data::date;
      `,
      [monthRange.initialDate, monthRange.finalDate],
    );

    const byDate = new Map(result.rows.map((row) => [row.date, row.fiscal]));
    const missingDates = monthRange.expectedDates.filter((date) => !byDate.has(date));
    const notFinalizedDates = monthRange.expectedDates.filter(
      (date) => byDate.has(date) && byDate.get(date) !== true,
    );

    const status: FiscalIntegrationStatus = {
      status:
        missingDates.length === 0 && notFinalizedDates.length === 0
          ? 'OK'
          : 'ERROR',
      missingDates,
      notFinalizedDates,
    };

    if (status.status === 'ERROR') {
      throw new BadRequestException({
        message: FISCAL_INTEGRATION_ERROR,
        fiscalIntegration: status,
      });
    }

    return status;
  }

  private async getLineConfigs(lineIds: string[]) {
    const rows = await this.prisma.dailyResultLineConfig.findMany({
      where: { lineId: { in: lineIds } },
    });

    return new Map(rows.map((line) => [line.lineId, line]));
  }

  private async getPdtConnectRows(
    storeId: number,
    monthRange: MonthRange,
  ): Promise<PdtConnectDreRow[]> {
    const rows = await this.dreService.getNotConsolidatedDre({
      storeId: [storeId],
      initialDate: monthRange.initialDate,
      finalDate: monthRange.finalDate,
    });

    return (rows as unknown as Array<Omit<PdtConnectDreRow, 'storeId'>>).map(
      (row) => ({
        ...row,
        storeId,
      }),
    );
  }

  private collectVrDreIds(
    lineIds: string[],
    lineConfigs: Map<string, DailyResultLineConfig>,
  ) {
    const ids = new Set<number>();

    for (const lineId of lineIds) {
      const lineConfig = lineConfigs.get(lineId);
      if (!lineConfig || lineConfig.sourceType !== DailyResultLineSourceType.DIRECT_FIELD) {
        continue;
      }

      const terms = this.normalizeVrDreTermsForLine(
        lineId,
        this.readVrDreTerms(lineConfig, { throwOnMissing: false }),
      );

      for (const term of terms) {
        ids.add(term.vrDreId);
      }
    }

    return [...ids];
  }

  private async getVrMasterDreDetails(input: {
    storeId: number;
    monthRange: MonthRange;
    vrDreIds: number[];
  }) {
    if (input.vrDreIds.length === 0) {
      return [] as VrMasterDreDetailRow[];
    }

    const result = await this.pg.query<{
      vrDreId: number;
      lineDescription: string | null;
      sourceStoreId: number;
      destinationStoreId: number;
      costCenterId: number | null;
      debitValue: number | string | null;
      creditValue: number | string | null;
      value: number | string | null;
    }>(
      `
        SELECT
          dre.id AS "vrDreId",
          dre.descricao AS "lineDescription",
          c.id_loja AS "sourceStoreId",
          COALESCE(NULLIF(clcc.id_loja, 0), c.id_loja) AS "destinationStoreId",
          clcc.id_centrocusto AS "costCenterId",
          COALESCE(SUM(
            CASE
              WHEN clcc.percentual IS NULL THEN cl.valordebito
              ELSE cl.valordebito * (clcc.percentual / 100)
            END
          ), 0) AS "debitValue",
          COALESCE(SUM(
            CASE
              WHEN clcc.percentual IS NULL THEN cl.valorcredito
              ELSE cl.valorcredito * (clcc.percentual / 100)
            END
          ), 0) AS "creditValue",
          COALESCE(SUM(
            CASE
              WHEN clcc.percentual IS NULL THEN cl.valorcredito - cl.valordebito
              ELSE (cl.valorcredito - cl.valordebito) * (clcc.percentual / 100)
            END
          ), 0) AS "value"
        FROM contabilidade c
        JOIN tipoorigemcontabilidade toc ON toc.id = c.id_tipoorigemcontabilidade
        JOIN contabilidadelancamento cl ON cl.id_contabilidade = c.id
        JOIN contacontabilfiscal ccf ON ccf.id = cl.id_contacontabilfiscal
        JOIN contabilidade.dreitem drei ON drei.id_contacontabilfiscal = cl.id_contacontabilfiscal
        JOIN contabilidade.dre dre ON dre.id = drei.id_dre
        LEFT JOIN contabilidadelancamentocentrocusto clcc
          ON clcc.id_contabilidadelancamento = cl.id
        WHERE c."data"::date BETWEEN $1::date AND $2::date
          AND COALESCE(NULLIF(clcc.id_loja, 0), c.id_loja) = $3
          AND dre.id = ANY($4::int[])
        GROUP BY
          dre.id,
          dre.descricao,
          dre.ordem,
          c.id_loja,
          COALESCE(NULLIF(clcc.id_loja, 0), c.id_loja),
          clcc.id_centrocusto
        ORDER BY dre.ordem, clcc.id_centrocusto NULLS LAST;
      `,
      [
        input.monthRange.initialDate,
        input.monthRange.finalDate,
        input.storeId,
        input.vrDreIds,
      ],
    );

    return result.rows.map((row) => ({
      vrDreId: row.vrDreId,
      lineDescription: row.lineDescription,
      sourceStoreId: Number(row.sourceStoreId),
      destinationStoreId: Number(row.destinationStoreId),
      costCenterId:
        row.costCenterId === null || row.costCenterId === undefined
          ? null
          : Number(row.costCenterId),
      debitValue: this.round2(Number(row.debitValue ?? 0)),
      creditValue: this.round2(Number(row.creditValue ?? 0)),
      value: this.round2(Number(row.value ?? 0)),
    }));
  }

  private buildLinePreview(input: {
    lineId: SupportedDirectLineId;
    storeId: number;
    lineConfig: DailyResultLineConfig | null;
    pdtConnectRows: PdtConnectDreRow[];
    vrMasterDetails: VrMasterDreDetailRow[];
  }): LinePreview {
    if (!input.lineConfig || !input.lineConfig.active) {
      return this.blockedLine(input.lineId, input.lineId, {
        blockedReason: `Linha ${input.lineId} nao esta configurada ou ativa.`,
      });
    }

    if (input.lineConfig.sourceType !== DailyResultLineSourceType.DIRECT_FIELD) {
      return this.blockedLine(input.lineId, input.lineConfig.label, {
        blockedReason: `Linha ${input.lineId} deve ser do tipo DIRECT_FIELD.`,
      });
    }

    const sourceConfig = this.asRecord(input.lineConfig.sourceConfig);
    const sourceField =
      typeof sourceConfig?.sourceField === 'string' ? sourceConfig.sourceField : null;

    if (!sourceField) {
      return this.blockedLine(input.lineId, input.lineConfig.label, {
        blockedReason: `Linha ${input.lineId} nao possui sourceConfig.sourceField configurado.`,
      });
    }

    const { strategy: configuredDistributionStrategy, warnings } =
      this.readDistributionStrategy(input.lineId, sourceConfig);
    const distributionStrategy = this.normalizeDistributionStrategyForLine(
      input.lineId,
      configuredDistributionStrategy,
      warnings,
    );
    const pdtConnectRows = this.getPdtConnectLineRows(input.pdtConnectRows, sourceField);
    const pdtConnectTotal = this.sumCurrentRows(pdtConnectRows);

    if (input.lineId === 'despesaPessoalRat') {
      return this.buildTemporaryZeroPreview({
        lineConfig: input.lineConfig,
        storeId: input.storeId,
        sourceField,
        distributionStrategy,
        warnings: warnings.filter(
          (warning) => !warning.includes('sem distributionStrategy'),
        ),
        referenceRows: this.getPdtConnectLineRows(input.pdtConnectRows, 'recBruta'),
        allRows: input.pdtConnectRows,
      });
    }

    if (!distributionStrategy) {
      return this.blockedLine(input.lineId, input.lineConfig.label, {
        sourceField,
        pdtConnectTotal,
        blockedReason: `Linha ${input.lineId} nao possui distributionStrategy configurada.`,
      });
    }

    const vrDreTerms = this.normalizeVrDreTermsForLine(
      input.lineId,
      this.readVrDreTerms(input.lineConfig, { throwOnMissing: false }),
      warnings,
    );
    if (vrDreTerms.length === 0) {
      return this.blockedLine(input.lineId, input.lineConfig.label, {
        sourceField,
        distributionStrategy,
        pdtConnectTotal,
        blockedReason: `Linha ${input.lineId} nao possui DRE VRMaster configurado.`,
        warnings,
      });
    }

    const vrDreTermPreviews = this.buildVrDreTermPreviews(
      vrDreTerms,
      input.vrMasterDetails,
    );
    const vrMasterTotal = this.sumTermPreviews(vrDreTermPreviews);

    if (distributionStrategy === 'PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT') {
      return this.buildPdtResultWithDifferencePreview({
        lineConfig: input.lineConfig,
        sourceField,
        distributionStrategy,
        warnings,
        pdtConnectRows,
        pdtConnectTotal,
        vrDreTermPreviews,
        vrMasterTotal,
      });
    }

    if (distributionStrategy === 'VRMASTER_COST_CENTER_EXACT') {
      return this.buildVrMasterExactPreview({
        lineConfig: input.lineConfig,
        storeId: input.storeId,
        sourceField,
        distributionStrategy,
        warnings,
        pdtConnectRows,
        pdtConnectTotal,
        vrDreTerms,
        vrDreTermPreviews,
        vrMasterTotal,
        vrMasterDetails: input.vrMasterDetails,
      });
    }

    return this.buildVrMasterBasePreview({
      lineConfig: input.lineConfig,
      storeId: input.storeId,
      sourceField,
      distributionStrategy,
      warnings,
      pdtConnectRows,
      pdtConnectTotal,
      vrDreTerms,
      vrDreTermPreviews,
      vrMasterTotal,
      vrMasterDetails: input.vrMasterDetails,
      recBrutaRows: this.getPdtConnectLineRows(input.pdtConnectRows, 'recBruta'),
    });
  }

  private buildPdtResultWithDifferencePreview(input: {
    lineConfig: DailyResultLineConfig;
    sourceField: string;
    distributionStrategy: DistributionStrategy;
    warnings: string[];
    pdtConnectRows: CurrentCostCenterValue[];
    pdtConnectTotal: number;
    vrDreTermPreviews: VrMasterTermPreview[];
    vrMasterTotal: number;
  }): LinePreview {
    if (this.nearZero(input.pdtConnectTotal)) {
      return this.blockedLine(input.lineConfig.lineId, input.lineConfig.label, {
        sourceField: input.sourceField,
        distributionStrategy: input.distributionStrategy,
        pdtConnectTotal: input.pdtConnectTotal,
        vrDreTerms: input.vrDreTermPreviews,
        vrMasterTotal: input.vrMasterTotal,
        blockedReason: `Nao e possivel simular ${input.lineConfig.lineId}: total atual da linha no PDT Connect e zero.`,
        warnings: input.warnings,
      });
    }

    const difference = this.round2(input.vrMasterTotal - input.pdtConnectTotal);
    const costCenters = input.pdtConnectRows.map((row) => {
      const participation = row.currentValue / input.pdtConnectTotal;
      const consolidatedValue = this.round2(
        row.currentValue + difference * participation,
      );

      return {
        storeId: row.storeId,
        costCenterId: row.costCenterId,
        currentValue: this.round2(row.currentValue),
        participation,
        adjustment: this.round2(consolidatedValue - row.currentValue),
        consolidatedValue,
      };
    });

    const roundingResidualApplied = this.applyRoundingResidual(
      costCenters,
      input.vrMasterTotal,
    );

    return this.completeLinePreview({
      lineConfig: input.lineConfig,
      sourceField: input.sourceField,
      distributionStrategy: input.distributionStrategy,
      vrDreTerms: input.vrDreTermPreviews,
      pdtConnectTotal: input.pdtConnectTotal,
      vrMasterTotal: input.vrMasterTotal,
      costCenters,
      roundingResidualApplied,
      warnings: input.warnings,
    });
  }

  private buildTemporaryZeroPreview(input: {
    lineConfig: DailyResultLineConfig;
    storeId: number;
    sourceField: string;
    distributionStrategy: DistributionStrategy | null;
    warnings: string[];
    referenceRows: CurrentCostCenterValue[];
    allRows: PdtConnectDreRow[];
  }): LinePreview {
    const referenceTotal = this.sumCurrentRows(input.referenceRows);
    const costCenterRows =
      input.referenceRows.length > 0
        ? input.referenceRows
        : this.uniqueCostCenterRows(input.allRows, input.storeId);

    const costCenters = costCenterRows.map((row) => ({
      storeId: row.storeId,
      costCenterId: row.costCenterId,
      currentValue: 0,
      participation:
        !this.nearZero(referenceTotal) && input.referenceRows.length > 0
          ? row.currentValue / referenceTotal
          : 0,
      adjustment: 0,
      consolidatedValue: 0,
    }));

    return {
      lineId: input.lineConfig.lineId,
      label: input.lineConfig.label,
      sourceField: input.sourceField,
      distributionStrategy: input.distributionStrategy,
      vrDreTerms: [],
      pdtConnectTotal: 0,
      vrMasterTotal: 0,
      vrMasterDebitTotal: 0,
      vrMasterCreditTotal: 0,
      vrMasterNetTotal: 0,
      vrMasterAllocatedTotal: 0,
      unallocatedValue: 0,
      apportionedValue: 0,
      difference: 0,
      costCenters,
      finalTotal: 0,
      roundingResidualApplied: 0,
      warnings: [
        ...input.warnings,
        'TEMPORARY_ZERO_FOR_MANUAL_EDIT: despesaPessoalRat zerada temporariamente para edicao posterior. O DRE 8 fica concentrado em despesaPessoal nesta simulacao para evitar duplicidade.',
      ],
    };
  }

  private buildVrMasterBasePreview(input: {
    lineConfig: DailyResultLineConfig;
    storeId: number;
    sourceField: string;
    distributionStrategy: DistributionStrategy;
    warnings: string[];
    pdtConnectRows: CurrentCostCenterValue[];
    pdtConnectTotal: number;
    vrDreTerms: VrDreTerm[];
    vrDreTermPreviews: VrMasterTermPreview[];
    vrMasterTotal: number;
    vrMasterDetails: VrMasterDreDetailRow[];
    recBrutaRows: CurrentCostCenterValue[];
  }): LinePreview {
    const { allocatedByCostCenter, unallocatedTotal } =
      this.buildVrMasterAllocatedValues(input.vrDreTerms, input.vrMasterDetails);

    const participationBase = this.resolveParticipationBase({
      lineId: input.lineConfig.lineId,
      ownRows: input.pdtConnectRows,
      ownTotal: input.pdtConnectTotal,
      recBrutaRows: input.recBrutaRows,
      warnings: input.warnings,
      preferRecBruta:
        input.lineConfig.lineId === 'despesaOperacional' ||
        input.lineConfig.lineId === 'despesaPessoal',
    });

    if (!this.nearZero(unallocatedTotal) && !participationBase) {
      return this.blockedLine(input.lineConfig.lineId, input.lineConfig.label, {
        sourceField: input.sourceField,
        distributionStrategy: input.distributionStrategy,
        pdtConnectTotal: input.pdtConnectTotal,
        vrDreTerms: input.vrDreTermPreviews,
        vrMasterTotal: input.vrMasterTotal,
        blockedReason: `Nao e possivel simular ${input.lineConfig.lineId}: nao ha base segura para ratear valores sem centro de custo.`,
        warnings: input.warnings,
      });
    }

    const currentByCostCenter = this.mapCurrentRows(input.pdtConnectRows);
    const vrMasterAllocatedTotal = this.round2(
      [...allocatedByCostCenter.values()].reduce((sum, value) => sum + value, 0),
    );
    const allocatedCostCenterIds = [...allocatedByCostCenter.keys()];
    const baseCostCenterIds = participationBase?.rows.map((row) => row.costCenterId) ?? [];
    const costCenterIds = [...new Set([...allocatedCostCenterIds, ...baseCostCenterIds])]
      .sort((a, b) => a - b);

    const costCenters = costCenterIds.map((costCenterId) => {
      const currentValue = currentByCostCenter.get(costCenterId) ?? 0;
      const baseValue = participationBase?.byCostCenter.get(costCenterId) ?? 0;
      const participation = participationBase ? baseValue / participationBase.total : 0;
      const vrMasterAllocatedValue = this.round2(
        allocatedByCostCenter.get(costCenterId) ?? 0,
      );
      const unallocatedAdjustment = this.round2(unallocatedTotal * participation);
      const consolidatedValue = this.round2(
        vrMasterAllocatedValue + unallocatedAdjustment,
      );

      return {
        storeId: input.storeId,
        costCenterId,
        currentValue: this.round2(currentValue),
        participation,
        vrMasterAllocatedValue,
        unallocatedAdjustment,
        adjustment: this.round2(consolidatedValue - currentValue),
        consolidatedValue,
      };
    });

    const roundingResidualApplied = this.applyRoundingResidual(
      costCenters,
      input.vrMasterTotal,
    );
    const apportionedValue = this.round2(
      costCenters.reduce(
        (sum, row) => sum + (row.unallocatedAdjustment ?? 0),
        0,
      ),
    );

    return this.completeLinePreview({
      lineConfig: input.lineConfig,
      sourceField: input.sourceField,
      distributionStrategy: input.distributionStrategy,
      vrDreTerms: input.vrDreTermPreviews,
      pdtConnectTotal: input.pdtConnectTotal,
      vrMasterTotal: input.vrMasterTotal,
      vrMasterAllocatedTotal,
      unallocatedValue: unallocatedTotal,
      apportionedValue,
      costCenters,
      roundingResidualApplied,
      warnings: input.warnings,
    });
  }

  private buildVrMasterExactPreview(input: {
    lineConfig: DailyResultLineConfig;
    storeId: number;
    sourceField: string;
    distributionStrategy: DistributionStrategy;
    warnings: string[];
    pdtConnectRows: CurrentCostCenterValue[];
    pdtConnectTotal: number;
    vrDreTerms: VrDreTerm[];
    vrDreTermPreviews: VrMasterTermPreview[];
    vrMasterTotal: number;
    vrMasterDetails: VrMasterDreDetailRow[];
  }): LinePreview {
    const { allocatedByCostCenter, unallocatedTotal } =
      this.buildVrMasterAllocatedValues(input.vrDreTerms, input.vrMasterDetails);
    const currentByCostCenter = this.mapCurrentRows(input.pdtConnectRows);
    const warnings = [...input.warnings];

    if (!this.nearZero(unallocatedTotal)) {
      warnings.push(
        `VRMASTER_UNALLOCATED_COST_CENTER_VALUE: ${this.round2(unallocatedTotal)} sem centro de custo no VRMaster. Valor nao rateado automaticamente.`,
      );
    }

    const costCenterIds = [...allocatedByCostCenter.keys()].sort((a, b) => a - b);
    const costCenters = costCenterIds.map((costCenterId) => {
      const currentValue = currentByCostCenter.get(costCenterId) ?? 0;
      const vrMasterValue = this.round2(
        allocatedByCostCenter.get(costCenterId) ?? 0,
      );

      return {
        storeId: input.storeId,
        costCenterId,
        currentValue: this.round2(currentValue),
        participation: 0,
        vrMasterValue,
        vrMasterAllocatedValue: vrMasterValue,
        adjustment: this.round2(vrMasterValue - currentValue),
        consolidatedValue: vrMasterValue,
      };
    });

    const vrMasterAllocatedTotal = this.round2(
      costCenters.reduce((sum, row) => sum + row.consolidatedValue, 0),
    );

    return this.completeLinePreview({
      lineConfig: input.lineConfig,
      sourceField: input.sourceField,
      distributionStrategy: input.distributionStrategy,
      vrDreTerms: input.vrDreTermPreviews,
      pdtConnectTotal: input.pdtConnectTotal,
      vrMasterTotal: input.vrMasterTotal,
      vrMasterAllocatedTotal,
      unallocatedValue: unallocatedTotal,
      costCenters,
      roundingResidualApplied: 0,
      warnings,
    });
  }

  private buildVrDreTermPreviews(
    vrDreTerms: VrDreTerm[],
    vrMasterDetails: VrMasterDreDetailRow[],
  ) {
    return vrDreTerms.map((term) => {
      const rows = vrMasterDetails.filter((row) => row.vrDreId === term.vrDreId);
      const rawDebitValue = this.round2(
        rows.reduce((sum, row) => sum + row.debitValue, 0),
      );
      const rawCreditValue = this.round2(
        rows.reduce((sum, row) => sum + row.creditValue, 0),
      );
      const rawValue = this.round2(rows.reduce((sum, row) => sum + row.value, 0));
      const debitValue =
        term.multiplier === 1 ? rawDebitValue : rawCreditValue;
      const creditValue =
        term.multiplier === 1 ? rawCreditValue : rawDebitValue;

      return {
        vrDreId: term.vrDreId,
        multiplier: term.multiplier,
        lineDescription: rows[0]?.lineDescription ?? null,
        rawDebitValue,
        rawCreditValue,
        rawValue,
        debitValue,
        creditValue,
        value: this.round2(rawValue * term.multiplier),
      };
    });
  }

  private buildVrMasterAllocatedValues(
    vrDreTerms: VrDreTerm[],
    vrMasterDetails: VrMasterDreDetailRow[],
  ) {
    const allocatedByCostCenter = new Map<number, number>();
    let unallocatedTotal = 0;

    for (const term of vrDreTerms) {
      const rows = vrMasterDetails.filter((row) => row.vrDreId === term.vrDreId);

      for (const row of rows) {
        const value = this.round2(row.value * term.multiplier);
        if (row.costCenterId === null || row.costCenterId <= 0) {
          unallocatedTotal = this.round2(unallocatedTotal + value);
          continue;
        }

        allocatedByCostCenter.set(
          row.costCenterId,
          this.round2((allocatedByCostCenter.get(row.costCenterId) ?? 0) + value),
        );
      }
    }

    return {
      allocatedByCostCenter,
      unallocatedTotal: this.round2(unallocatedTotal),
    };
  }

  private resolveParticipationBase(input: {
    lineId: string;
    ownRows: CurrentCostCenterValue[];
    ownTotal: number;
    recBrutaRows: CurrentCostCenterValue[];
    warnings: string[];
    preferRecBruta?: boolean;
  }) {
    const recBrutaTotal = this.sumCurrentRows(input.recBrutaRows);

    if (input.preferRecBruta) {
      if (!this.nearZero(recBrutaTotal) && input.recBrutaRows.length > 0) {
        input.warnings.push(
          `Linha ${input.lineId} usando participacao de recBruta para ratear valores sem centro de custo.`,
        );
        return {
          rows: input.recBrutaRows,
          byCostCenter: this.mapCurrentRows(input.recBrutaRows),
          total: recBrutaTotal,
        };
      }

      return null;
    }

    if (!this.nearZero(input.ownTotal) && input.ownRows.length > 0) {
      return {
        rows: input.ownRows,
        byCostCenter: this.mapCurrentRows(input.ownRows),
        total: input.ownTotal,
      };
    }

    if (!this.nearZero(recBrutaTotal) && input.recBrutaRows.length > 0) {
      input.warnings.push(
        `Linha ${input.lineId} sem base propria para rateio; usando participacao de recBruta.`,
      );
      return {
        rows: input.recBrutaRows,
        byCostCenter: this.mapCurrentRows(input.recBrutaRows),
        total: recBrutaTotal,
      };
    }

    return null;
  }

  private completeLinePreview(input: {
    lineConfig: DailyResultLineConfig;
    sourceField: string;
    distributionStrategy: DistributionStrategy;
    vrDreTerms: VrMasterTermPreview[];
    pdtConnectTotal: number;
    vrMasterTotal: number;
    vrMasterAllocatedTotal?: number;
    unallocatedValue?: number;
    apportionedValue?: number;
    costCenters: CostCenterPreview[];
    roundingResidualApplied: number;
    warnings: string[];
  }): LinePreview {
    const finalTotal = this.round2(
      input.costCenters.reduce((sum, row) => sum + row.consolidatedValue, 0),
    );
    const unallocatedValue = this.round2(input.unallocatedValue ?? 0);

    return {
      lineId: input.lineConfig.lineId,
      label: input.lineConfig.label,
      sourceField: input.sourceField,
      distributionStrategy: input.distributionStrategy,
      vrDreTerms: input.vrDreTerms,
      pdtConnectTotal: this.round2(input.pdtConnectTotal),
      vrMasterTotal: this.round2(input.vrMasterTotal),
      vrMasterDebitTotal: this.round2(
        input.vrDreTerms.reduce((sum, term) => sum + term.debitValue, 0),
      ),
      vrMasterCreditTotal: this.round2(
        input.vrDreTerms.reduce((sum, term) => sum + term.creditValue, 0),
      ),
      vrMasterNetTotal: this.round2(input.vrMasterTotal),
      vrMasterAllocatedTotal: this.round2(input.vrMasterAllocatedTotal ?? finalTotal),
      unallocatedValue,
      apportionedValue: this.round2(input.apportionedValue ?? 0),
      difference: this.round2(input.vrMasterTotal - input.pdtConnectTotal),
      costCenters: input.costCenters,
      finalTotal,
      roundingResidualApplied: this.round2(input.roundingResidualApplied),
      warnings: input.warnings,
    };
  }

  private blockedLine(
    lineId: string,
    label: string,
    options: Partial<LinePreview> & { blockedReason: string },
  ): LinePreview {
    const vrDreTerms = options.vrDreTerms ?? [];
    const vrMasterDebitTotal = this.round2(
      options.vrMasterDebitTotal ??
        vrDreTerms.reduce((sum, term) => sum + term.debitValue, 0),
    );
    const vrMasterCreditTotal = this.round2(
      options.vrMasterCreditTotal ??
        vrDreTerms.reduce((sum, term) => sum + term.creditValue, 0),
    );
    const vrMasterNetTotal = this.round2(
      options.vrMasterNetTotal ?? options.vrMasterTotal ?? 0,
    );

    return {
      lineId,
      label,
      sourceField: options.sourceField ?? null,
      distributionStrategy: options.distributionStrategy ?? null,
      vrDreTerms,
      pdtConnectTotal: this.round2(options.pdtConnectTotal ?? 0),
      vrMasterTotal: this.round2(options.vrMasterTotal ?? 0),
      vrMasterDebitTotal,
      vrMasterCreditTotal,
      vrMasterNetTotal,
      vrMasterAllocatedTotal: this.round2(options.vrMasterAllocatedTotal ?? 0),
      unallocatedValue: this.round2(options.unallocatedValue ?? 0),
      apportionedValue: this.round2(options.apportionedValue ?? 0),
      difference: this.round2(options.difference ?? 0),
      costCenters: options.costCenters ?? [],
      finalTotal: this.round2(options.finalTotal ?? 0),
      roundingResidualApplied: this.round2(options.roundingResidualApplied ?? 0),
      warnings: options.warnings ?? [],
      blockedReason: options.blockedReason,
    };
  }

  private assertPreviewCanBePersisted(preview: {
    lines: LinePreview[];
  }) {
    const missingLines = SUPPORTED_LINE_IDS.filter(
      (lineId) => !preview.lines.some((line) => line.lineId === lineId),
    );

    if (missingLines.length > 0) {
      throw new BadRequestException(
        `Consolidacao incompleta: linhas obrigatorias ausentes na previa: ${missingLines.join(', ')}.`,
      );
    }

    const blockedLines = preview.lines.filter((line) => line.blockedReason);
    if (blockedLines.length > 0) {
      throw new BadRequestException(
        `Consolidacao bloqueada por erro na previa: ${blockedLines
          .map((line) => `${line.lineId}: ${line.blockedReason}`)
          .join('; ')}`,
      );
    }

    const unbalancedLines = preview.lines.filter(
      (line) => !this.nearZero(line.finalTotal - line.vrMasterTotal),
    );

    if (unbalancedLines.length > 0) {
      throw new BadRequestException(
        `Consolidacao bloqueada: totais finais nao batem com o VRMaster nas linhas ${unbalancedLines
          .map((line) => line.lineId)
          .join(', ')}.`,
      );
    }
  }

  private buildMonthlyResultRows(preview: {
    storeId: number;
    lines: LinePreview[];
  }) {
    const rows = new Map<number, MonthlyResultDirectValues>();
    const processedFields = new Set<string>();

    for (const line of preview.lines) {
      const field = line.sourceField;
      if (!field || !MONTHLY_RESULT_DIRECT_FIELD_SET.has(field)) {
        throw new BadRequestException(
          `Linha ${line.lineId} nao possui campo direto valido para persistencia em MonthlyResult.`,
        );
      }

      processedFields.add(field);

      for (const costCenter of line.costCenters) {
        if (costCenter.storeId !== preview.storeId) {
          throw new BadRequestException(
            `Linha ${line.lineId} retornou loja ${costCenter.storeId}, mas a consolidacao e da loja ${preview.storeId}.`,
          );
        }

        if (
          !Number.isInteger(costCenter.costCenterId) ||
          costCenter.costCenterId <= 0
        ) {
          throw new BadRequestException(
            `Linha ${line.lineId} retornou centro de custo invalido para persistencia.`,
          );
        }

        const values =
          rows.get(costCenter.costCenterId) ?? this.emptyMonthlyResultValues();
        values[field as MonthlyResultDirectField] = this.round2(
          values[field as MonthlyResultDirectField] + costCenter.consolidatedValue,
        );
        rows.set(costCenter.costCenterId, values);
      }
    }

    const missingFields = MONTHLY_RESULT_DIRECT_FIELDS.filter(
      (field) => !processedFields.has(field),
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Consolidacao incompleta: campos diretos ausentes na previa: ${missingFields.join(', ')}.`,
      );
    }

    if (rows.size === 0) {
      throw new BadRequestException(
        'Consolidacao bloqueada: a previa nao retornou valores por centro de custo para gravar MonthlyResult.',
      );
    }

    return rows;
  }

  private emptyMonthlyResultValues(): MonthlyResultDirectValues {
    return {
      recBruta: 0,
      devolucao: 0,
      imposto: 0,
      custo: 0,
      embalagem: 0,
      quebra: 0,
      recCom: 0,
      despesaPessoal: 0,
      despesaPessoalRat: 0,
      despesaOperacional: 0,
    };
  }

  private calculatePersistedTotals(
    rows: Map<number, MonthlyResultDirectValues>,
  ): MonthlyResultDirectValues {
    const totals = this.emptyMonthlyResultValues();

    for (const values of rows.values()) {
      for (const field of MONTHLY_RESULT_DIRECT_FIELDS) {
        totals[field] = this.round2(totals[field] + values[field]);
      }
    }

    return totals;
  }

  private collectPreviewWarnings(preview: { lines: LinePreview[] }) {
    return preview.lines.flatMap((line) =>
      (line.warnings ?? []).map((warning) => `${line.lineId}: ${warning}`),
    );
  }

  private async ensureCostCentersExist(
    tx: Prisma.TransactionClient,
    costCenterIds: number[],
  ) {
    const existing = await tx.costCenter.findMany({
      where: { id: { in: costCenterIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((costCenter) => costCenter.id));
    const missing = costCenterIds.filter((id) => !existingIds.has(id));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Centros de custo nao encontrados para consolidacao: ${missing.join(', ')}.`,
      );
    }
  }

  private getPdtConnectLineRows(
    pdtConnectRows: PdtConnectDreRow[],
    sourceField: string,
  ): CurrentCostCenterValue[] {
    return pdtConnectRows
      .map((row) => ({
        storeId: row.storeId,
        costCenterId: row.costCenterId,
        currentValue: this.round2(Number(row.data?.[sourceField] ?? 0)),
      }))
      .filter((row) => !this.nearZero(row.currentValue));
  }

  private sumCurrentRows(rows: CurrentCostCenterValue[]) {
    return this.round2(rows.reduce((sum, row) => sum + row.currentValue, 0));
  }

  private sumTermPreviews(terms: VrMasterTermPreview[]) {
    return this.round2(terms.reduce((sum, term) => sum + term.value, 0));
  }

  private mapCurrentRows(rows: CurrentCostCenterValue[]) {
    return new Map(
      rows.map((row) => [row.costCenterId, this.round2(row.currentValue)]),
    );
  }

  private uniqueCostCenterRows(
    rows: PdtConnectDreRow[],
    fallbackStoreId: number,
  ): CurrentCostCenterValue[] {
    const byCostCenter = new Map<number, CurrentCostCenterValue>();

    for (const row of rows) {
      if (byCostCenter.has(row.costCenterId)) continue;
      byCostCenter.set(row.costCenterId, {
        storeId: row.storeId ?? fallbackStoreId,
        costCenterId: row.costCenterId,
        currentValue: 0,
      });
    }

    return [...byCostCenter.values()].sort(
      (a, b) => a.costCenterId - b.costCenterId,
    );
  }

  private applyRoundingResidual(
    costCenters: Array<{
      storeId?: number;
      costCenterId: number;
      currentValue: number;
      participation: number;
      adjustment: number;
      consolidatedValue: number;
      unallocatedAdjustment?: number;
    }>,
    expectedTotal: number,
  ) {
    const currentTotal = this.round2(
      costCenters.reduce((sum, row) => sum + row.consolidatedValue, 0),
    );
    const residual = this.round2(expectedTotal - currentTotal);

    if (this.nearZero(residual) || costCenters.length === 0) {
      return 0;
    }

    const target = costCenters.reduce((selected, row) =>
      Math.abs(row.participation) > Math.abs(selected.participation)
        ? row
        : selected,
    );

    target.consolidatedValue = this.round2(target.consolidatedValue + residual);
    if (typeof target.unallocatedAdjustment === 'number') {
      target.unallocatedAdjustment = this.round2(
        target.unallocatedAdjustment + residual,
      );
    }
    target.adjustment = this.round2(target.consolidatedValue - target.currentValue);
    return residual;
  }

  private readDistributionStrategy(
    lineId: SupportedDirectLineId,
    sourceConfig: JsonRecord | null,
  ): { strategy: DistributionStrategy | null; warnings: string[] } {
    const rawStrategy = sourceConfig?.distributionStrategy;

    if (typeof rawStrategy === 'string' && DISTRIBUTION_STRATEGIES.has(rawStrategy)) {
      return { strategy: rawStrategy as DistributionStrategy, warnings: [] };
    }

    return {
      strategy: null,
      warnings: [`Linha ${lineId} sem distributionStrategy configurada.`],
    };
  }

  private normalizeDistributionStrategyForLine(
    lineId: SupportedDirectLineId,
    strategy: DistributionStrategy | null,
    warnings: string[],
  ): DistributionStrategy | null {
    if (
      lineId === 'despesaPessoal' &&
      strategy !== 'VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT'
    ) {
      warnings.push(
        'Linha despesaPessoal usando VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT para concentrar temporariamente o DRE 8 e ratear valores sem centro pela participacao de venda.',
      );
      return 'VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT';
    }

    if (
      lineId === 'despesaOperacional' &&
      strategy === 'VRMASTER_COST_CENTER_EXACT'
    ) {
      warnings.push(
        'Linha despesaOperacional estava com VRMASTER_COST_CENTER_EXACT; usando VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT para ratear valores sem centro pela participacao de venda.',
      );
      return 'VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT';
    }

    return strategy;
  }

  private normalizeVrDreTermsForLine(
    lineId: string,
    terms: VrDreTerm[],
    warnings?: string[],
  ) {
    if (lineId !== 'despesaOperacional') return terms;

    const filteredTerms = terms.filter((term) => term.vrDreId !== 22);
    if (filteredTerms.length !== terms.length) {
      warnings?.push(
        'DRE VRMaster 22 removido da simulacao de despesaOperacional; este DRE nao faz parte da configuracao final da linha.',
      );
    }

    return filteredTerms;
  }

  private readVrDreTerms(
    line: DailyResultLineConfig,
    options: { throwOnMissing: boolean },
  ): VrDreTerm[] {
    const sourceConfig = this.asRecord(line.sourceConfig);
    const rawTerms = sourceConfig?.vrDreTerms;

    if (Array.isArray(rawTerms)) {
      const terms = rawTerms.map((term, index) => {
        const record = this.asRecord(term);
        const vrDreId = Number(record?.vrDreId);
        const multiplier: 1 | -1 = record?.multiplier === -1 ? -1 : 1;

        if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
          throw new BadRequestException(
            `sourceConfig.vrDreTerms[${index}].vrDreId invalido para ${line.lineId}.`,
          );
        }

        return { vrDreId, multiplier };
      });

      if (terms.length > 0) return terms;
    }

    if (line.vrDreId) {
      return [{ vrDreId: line.vrDreId, multiplier: 1 }];
    }

    const vrDreIds = Array.isArray(sourceConfig?.vrDreIds)
      ? sourceConfig.vrDreIds
      : [];
    const terms = vrDreIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .map((vrDreId) => ({ vrDreId, multiplier: 1 as const }));

    if (terms.length > 0) return terms;

    const reconciliationTerms = this.readReconciliationVrDreTerms(line, sourceConfig);
    if (reconciliationTerms.length > 0) return reconciliationTerms;

    if (options.throwOnMissing) {
      throw new BadRequestException(
        `Linha ${line.lineId} nao possui vinculo com DRE VRMaster.`,
      );
    }

    return terms;
  }

  private readReconciliationVrDreTerms(
    line: DailyResultLineConfig,
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

      if (!localLineIds.includes(line.lineId)) continue;

      const rawTerms = groupRecord?.vrDreTerms;
      if (!Array.isArray(rawTerms)) continue;

      rawTerms.forEach((term, termIndex) => {
        const record = this.asRecord(term);
        const vrDreId = Number(record?.vrDreId);
        const multiplier: 1 | -1 = record?.multiplier === -1 ? -1 : 1;

        if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
          throw new BadRequestException(
            `sourceConfig.dreReconciliationGroups[${groupIndex}].vrDreTerms[${termIndex}].vrDreId invalido para ${line.lineId}.`,
          );
        }

        terms.push({ vrDreId, multiplier });
      });
    }

    return terms;
  }

  private parseMonth(value: string): MonthRange {
    const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
    if (!match) {
      throw new BadRequestException('month deve usar YYYY-MM ou YYYY-MM-DD.');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('month deve estar entre 01 e 12.');
    }

    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const expectedDates = Array.from({ length: daysInMonth }, (_, index) =>
      this.dateString(year, monthIndex + 1, index + 1),
    );

    return {
      month: this.dateString(year, monthIndex + 1, 1),
      initialDate: this.dateString(year, monthIndex + 1, 1),
      finalDate: this.dateString(year, monthIndex + 1, daysInMonth),
      expectedDates,
    };
  }

  private monthStringToDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException('month interno invalido.');
    }

    return new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
  }

  private addMonths(month: Date, amount: number) {
    return new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1),
    );
  }

  private dateString(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as JsonRecord;
  }

  private round2(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private nearZero(value: number) {
    return Math.abs(value) < 1e-9;
  }
}
