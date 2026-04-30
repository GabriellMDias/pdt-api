import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PoolClient } from "pg";
import { PrismaService } from "src/db/prisma/prisma.service";
import { PgService } from "src/db/pg/pg.service";
import { DreCostCenterSalesService } from "src/adm/dre/dre-cost-center-sales.service";
import {
  CodeJob,
  type CodeJobParameterDefinition,
  type CodeJobParameterRules,
} from "./code-job.decorator";

type CodeJobExecutionContext = {
  codeJobRunId?: number;
  jobId?: number;
  source?: "SCHEDULE" | "MANUAL" | "RETRY";
  reason?: string;
  params?: Record<string, unknown>;
};

type PreviewPeriod = {
  initialDate: string;
  finalDate: string;
  source: "DEFAULT_CURRENT_MONTH" | "MANUAL_PARAMS";
};

type CostCenterApportionmentSource =
  | "notadespesa"
  | "notaentrada"
  | "pagaroutrasdespesas";

type ExpenseCostCenterRow = {
  noteExpenseId: number;
  noteStoreId: number | null;
  noteStatusId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  noteNumber: number | null;
  entryDate: string | Date | null;
  totalValue: string | number | null;
  lineId: number;
  lineCostCenterId: number | null;
  lineStoreId: number | null;
  percentage: string | number | null;
  costCenterTypeVrId: number | null;
};

type ExpenseCostCenterLine = {
  id: number;
  costCenterId: number | null;
  storeId: number | null;
  percentage: number | null;
  costCenterTypeVrId: number | null;
};

type ExpenseNote = {
  id: number;
  storeId: number | null;
  statusId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  noteNumber: number | null;
  entryDate: string | Date | null;
  totalValue: number | null;
  lines: ExpenseCostCenterLine[];
};

type EntryCostCenterRow = {
  noteEntryId: number;
  noteStoreId: number | null;
  noteStatusId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  noteNumber: number | null;
  entryDate: string | Date | null;
  totalValue: string | number | null;
  entryTypeId: number | null;
  lineId: number;
  lineCostCenterId: number | null;
  lineStoreId: number | null;
  percentage: string | number | null;
  costCenterTypeVrId: number | null;
};

type EntryTypeGroup = {
  noteEntryId: number;
  entryTypeId: number | null;
  storeId: number | null;
  statusId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  noteNumber: number | null;
  entryDate: string | Date | null;
  totalValue: number | null;
  lines: ExpenseCostCenterLine[];
};

type OtherExpenseCostCenterRow = {
  otherExpenseId: number;
  documentStoreId: number | null;
  documentStatusId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  documentNumber: number | null;
  entryTypeId: number | null;
  entryDate: string | Date | null;
  totalValue: string | number | null;
  lineId: number;
  lineCostCenterId: number | null;
  lineStoreId: number | null;
  percentage: string | number | null;
  costCenterTypeVrId: number | null;
};

type OtherExpenseDocument = {
  otherExpenseId: number;
  entryTypeId: number | null;
  storeId: number | null;
  statusId: number | null;
  supplierId: number | null;
  supplierName: string | null;
  documentNumber: number | null;
  entryDate: string | Date | null;
  totalValue: number | null;
  lines: ExpenseCostCenterLine[];
};

type PreviewAnalysisResult = {
  status: string;
  warnings: string[];
  competence: string;
  effectiveCostCenterTypeVrId: number | null;
  effectiveCostCenterTypeId: number | null;
  details: Record<string, any>;
};

type AnalyzedEntryTypeGroup = {
  group: EntryTypeGroup;
  result: PreviewAnalysisResult;
};

type AnalyzedExpenseNote = {
  note: ExpenseNote;
  result: PreviewAnalysisResult;
};

type AnalyzedOtherExpenseDocument = {
  document: OtherExpenseDocument;
  result: PreviewAnalysisResult;
};

type ApplyDecision =
  | "APPLY"
  | "SKIP_CONFLICT"
  | "SKIP_OUT_OF_SCOPE"
  | "SKIP_INCOMPLETE"
  | "SKIP_BLOCKED_BY_PREVIEW"
  | "ERROR";

type MutationSummary = {
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
};

type AnalysisPercentageLine = {
  source: "MANUAL_PRESERVED" | "AUTOMATIC_RECALCULATED";
  originalLineId: number | null;
  costCenterTypeVrId: number | null;
  costCenterId: number | null;
  storeId: number | null;
  percentage: number | null;
  metadata?: Record<string, any>;
};

type EntryItemTypeTotalRow = {
  noteEntryId: number;
  entryTypeId: number | null;
  baseValue: string | number | null;
};

type EntryWritingRow = {
  noteEntryId: number;
  writingId: number;
  entryTypeId: number | null;
  storeId: number | null;
};

type EntryWritingCostCenterRow = {
  writingCostCenterId: number;
  writingId: number;
  entryTypeId: number | null;
  costCenterId: number | null;
  storeId: number | null;
  percentage: string | number | null;
};

type TypeGroup = {
  costCenterTypeVrId: number;
  lines: ExpenseCostCenterLine[];
  nullPercentageCount: number;
  definedPercentageCount: number;
  percentageTotal: number;
  isComplete: boolean;
};

type SalesCache = Map<string, Promise<number>>;

const STATUS_PREVIEW_CALCULATED = "PREVIEW_CALCULATED";
const STATUS_CONFLICT_MULTIPLE_TYPES = "CONFLICT_MULTIPLE_TYPES";
const STATUS_CONFLICT_MULTIPLE_TYPES_SAME_ENTRY_TYPE =
  "CONFLICT_MULTIPLE_TYPES_SAME_ENTRY_TYPE";
const STATUS_CONFLICT_NO_CONSISTENT_TYPE_GROUP =
  "CONFLICT_NO_CONSISTENT_TYPE_GROUP";
const STATUS_SKIPPED_MISSING_ENTRY_DATE = "SKIPPED_MISSING_ENTRY_DATE";
const STATUS_SKIPPED_TYPE_CONFIG_NOT_FOUND = "SKIPPED_TYPE_CONFIG_NOT_FOUND";
const STATUS_SKIPPED_TYPE_NOT_PARTICIPATION = "SKIPPED_TYPE_NOT_PARTICIPATION";
const STATUS_SKIPPED_NO_PARTICIPATION_ITEMS = "SKIPPED_NO_PARTICIPATION_ITEMS";
const STATUS_SKIPPED_NO_REMAINING_SHARE = "SKIPPED_NO_REMAINING_SHARE";
const STATUS_SKIPPED_NO_SALES_BASE = "SKIPPED_NO_SALES_BASE";

const WARNING_IGNORED_INCOMPLETE_TYPE_GROUP =
  "WARNING_IGNORED_INCOMPLETE_TYPE_GROUP";
const WARNING_MANUAL_LINE_WITHOUT_PERCENTAGE =
  "WARNING_MANUAL_LINE_WITHOUT_PERCENTAGE";
const WARNING_NO_REMAINING_SHARE_FOR_TYPE =
  "WARNING_NO_REMAINING_SHARE_FOR_TYPE";
const WARNING_INVALID_PARTICIPATION_ITEM_IGNORED =
  "WARNING_INVALID_PARTICIPATION_ITEM_IGNORED";

const ANALYSIS_STATUS_PREVIEW_CALCULATED = "PREVIEW_CALCULATED";
const ANALYSIS_STATUS_BLOCKED_BY_PERCENTAGE_PREVIEW =
  "BLOCKED_BY_PERCENTAGE_PREVIEW";
const ANALYSIS_STATUS_SKIPPED_MISSING_BASE_VALUE = "SKIPPED_MISSING_BASE_VALUE";
const ANALYSIS_STATUS_SKIPPED_NO_PERCENTAGE_LINES =
  "SKIPPED_NO_PERCENTAGE_LINES";
const ANALYSIS_STATUS_SKIPPED_NOT_FINALIZED =
  "SKIPPED_NOT_FINALIZED_FOR_ANALYSIS";

const WRITING_STATUS_PREVIEW_CALCULATED = "PREVIEW_CALCULATED";
const WRITING_STATUS_BLOCKED_BY_PERCENTAGE_PREVIEW =
  "BLOCKED_BY_PERCENTAGE_PREVIEW";
const WRITING_STATUS_SKIPPED_MISSING_WRITING = "SKIPPED_MISSING_WRITING";
const WRITING_STATUS_SKIPPED_NO_PERCENTAGE_LINES =
  "SKIPPED_NO_PERCENTAGE_LINES";
const WRITING_STATUS_SKIPPED_NOT_FINALIZED =
  "SKIPPED_NOT_FINALIZED_FOR_ESCRITA";

const APPLY_DECISION_APPLY: ApplyDecision = "APPLY";
const APPLY_DECISION_SKIP_CONFLICT: ApplyDecision = "SKIP_CONFLICT";
const APPLY_DECISION_SKIP_OUT_OF_SCOPE: ApplyDecision = "SKIP_OUT_OF_SCOPE";
const APPLY_DECISION_SKIP_INCOMPLETE: ApplyDecision = "SKIP_INCOMPLETE";
const APPLY_DECISION_SKIP_BLOCKED_BY_PREVIEW: ApplyDecision =
  "SKIP_BLOCKED_BY_PREVIEW";
const APPLY_DECISION_ERROR: ApplyDecision = "ERROR";

const FINALIZED_STATUS_ID = 1;

const DATE_RANGE_PARAMETERS: CodeJobParameterDefinition[] = [
  {
    name: "initialDate",
    label: "Data inicial",
    type: "date",
    required: false,
    description: "Data inicial da dataentrada das notas processadas.",
  },
  {
    name: "finalDate",
    label: "Data final",
    type: "date",
    required: false,
    description: "Data final da dataentrada das notas processadas.",
  },
];

const DATE_RANGE_PARAMETER_RULES: CodeJobParameterRules = {
  allOrNone: [["initialDate", "finalDate"]],
  dateRanges: [{ start: "initialDate", end: "finalDate" }],
};

const COST_CENTER_APPORTIONMENT_SOURCES: CostCenterApportionmentSource[] = [
  "notadespesa",
  "notaentrada",
  "pagaroutrasdespesas",
];

const COST_CENTER_SOURCE_LABELS: Record<CostCenterApportionmentSource, string> =
  {
    notadespesa: "Nota de despesa",
    notaentrada: "Nota de entrada",
    pagaroutrasdespesas: "Pagar outras despesas",
  };

const COST_CENTER_JOB_PARAMETERS: CodeJobParameterDefinition[] = [
  ...DATE_RANGE_PARAMETERS,
  {
    name: "sources",
    label: "Tipos de lancamento",
    type: "multi-select",
    required: false,
    description:
      "Se nada for selecionado, processa nota de despesa, nota de entrada e pagar outras despesas.",
    options: COST_CENTER_APPORTIONMENT_SOURCES.map((source) => ({
      value: source,
      label: COST_CENTER_SOURCE_LABELS[source],
    })),
  },
];

@Injectable()
export class CostCenterApportionmentPreviewService {
  private readonly logger = new Logger(
    CostCenterApportionmentPreviewService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly pg: PgService,
    private readonly costCenterSales: DreCostCenterSalesService,
  ) {}

  @CodeJob({
    handler: "previewCostCenterApportionmentBySalesParticipation",
    name: "Preview recalculo centro de custo por venda",
    description:
      "Executa o preview consolidado do recalculo de centro de custo por participacao de venda para as origens selecionadas. Nao atualiza o VRMaster.",
    schedule: {
      type: "DAILY_AT",
      time: "03:30",
      timezone: "America/Sao_Paulo",
    },
    enabled: true,
    parameters: COST_CENTER_JOB_PARAMETERS,
    parameterRules: DATE_RANGE_PARAMETER_RULES,
  })
  async previewCostCenterApportionmentBySalesParticipationJob(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const sources = this.resolveExecutionSources(context?.params);
    const startedAt = new Date();
    const summary = this.createEmptyConsolidatedSummary(
      startedAt,
      period,
      sources,
      "DRY_RUN",
      context,
    );

    for (const source of sources) {
      summary.bySource[source] = await this.runPreviewSource(source, context);
    }

    summary.durationMs = Date.now() - startedAt.getTime();
    summary.totals = this.aggregateConsolidatedSourceTotals(summary.bySource);
    return summary;
  }

  @CodeJob({
    handler: "applyCostCenterApportionmentBySalesParticipation",
    name: "Aplicar recalculo centro de custo por venda",
    description:
      "Executa o apply consolidado do recalculo de centro de custo por participacao de venda para as origens selecionadas, aplicando apenas casos seguros.",
    schedule: {
      type: "DAILY_AT",
      time: "04:30",
      timezone: "America/Sao_Paulo",
    },
    enabled: true,
    parameters: COST_CENTER_JOB_PARAMETERS,
    parameterRules: DATE_RANGE_PARAMETER_RULES,
  })
  async applyCostCenterApportionmentBySalesParticipationJob(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const sources = this.resolveExecutionSources(context?.params);
    const startedAt = new Date();
    const summary = this.createEmptyConsolidatedSummary(
      startedAt,
      period,
      sources,
      "APPLY",
      context,
    );

    for (const source of sources) {
      summary.bySource[source] = await this.runApplySource(source, context);
    }

    summary.durationMs = Date.now() - startedAt.getTime();
    summary.totals = this.aggregateConsolidatedSourceTotals(summary.bySource);
    return summary;
  }

  async previewCostCenterApportionmentBySalesParticipation(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const startedAt = new Date();
    const previewRun =
      await this.prisma.costCenterApportionmentPreviewRun.create({
        data: {
          codeJobRunId: context?.codeJobRunId ?? null,
          source: context?.source ?? "JOB",
          status: "RUNNING",
          startedAt,
          summary: {
            reason: context?.reason ?? null,
            documentSource: "NOTA_DESPESA",
            mode: "DRY_RUN",
            vrMasterWrites: false,
            processedPeriod: period,
          },
        },
      });

    this.logger.log(
      `Iniciando preview de rateio por venda (previewRunId=${previewRun.id}, periodo=${period.initialDate}..${period.finalDate}, origem=${period.source}).`,
    );

    const salesCache: SalesCache = new Map();
    const summary = this.createEmptySummary(
      previewRun.id,
      startedAt,
      period,
      "NOTA_DESPESA",
      context,
    );

    try {
      const rows = await this.fetchEligibleExpenseRows(period);
      const notes = this.groupExpenseNotes(rows);
      summary.eligibleNotes = notes.length;
      summary.eligibleGroups = notes.length;
      summary.sourceRows = rows.length;

      for (const note of notes) {
        const result = await this.analyzeNote(note, salesCache);
        this.applySummary(summary, result.status, result.warnings);

        await this.prisma.costCenterApportionmentPreviewItem.create({
          data: {
            previewRunId: previewRun.id,
            documentSource: "NOTA_DESPESA",
            noteExpenseId: note.id,
            storeId: note.storeId,
            supplierId: note.supplierId,
            supplierName: note.supplierName,
            entryDate: this.toDateOrNull(note.entryDate),
            competence: result.competence,
            status: result.status,
            effectiveCostCenterTypeVrId: result.effectiveCostCenterTypeVrId,
            effectiveCostCenterTypeId: result.effectiveCostCenterTypeId,
            warnings: result.warnings,
            details: result.details,
          },
        });
      }

      const durationMs = Date.now() - startedAt.getTime();
      summary.durationMs = durationMs;

      await this.prisma.costCenterApportionmentPreviewRun.update({
        where: { id: previewRun.id },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          durationMs,
          summary: this.toJson(summary),
        },
      });

      this.logger.log(
        `Preview de rateio concluido (previewRunId=${previewRun.id}, periodo=${period.initialDate}..${period.finalDate}, notas=${summary.eligibleNotes}, calculadas=${summary.calculatedNotes}).`,
      );

      return summary;
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.costCenterApportionmentPreviewRun.update({
        where: { id: previewRun.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          durationMs,
          summary: this.toJson({ ...summary, durationMs, error: message }),
        },
      });

      this.logger.error(
        `Falha no preview de rateio (previewRunId=${previewRun.id}): ${message}`,
      );
      throw error;
    }
  }

  async previewEntryCostCenterApportionmentBySalesParticipation(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const startedAt = new Date();
    const previewRun =
      await this.prisma.costCenterApportionmentPreviewRun.create({
        data: {
          codeJobRunId: context?.codeJobRunId ?? null,
          source: context?.source ?? "JOB",
          status: "RUNNING",
          startedAt,
          summary: {
            reason: context?.reason ?? null,
            documentSource: "NOTA_ENTRADA",
            mode: "DRY_RUN",
            vrMasterWrites: false,
            processedPeriod: period,
          },
        },
      });

    this.logger.log(
      `Iniciando preview de rateio de notaentrada por venda (previewRunId=${previewRun.id}, periodo=${period.initialDate}..${period.finalDate}, origem=${period.source}).`,
    );

    const salesCache: SalesCache = new Map();
    const summary = this.createEmptySummary(
      previewRun.id,
      startedAt,
      period,
      "NOTA_ENTRADA",
      context,
    );

    try {
      const rows = await this.fetchEligibleEntryRows(period);
      const groups = this.groupEntryTypeGroups(rows);
      summary.eligibleNotes = new Set(
        groups.map((group) => group.noteEntryId),
      ).size;
      summary.eligibleGroups = groups.length;
      summary.sourceRows = rows.length;

      const analyzedGroups: AnalyzedEntryTypeGroup[] = [];
      for (const group of groups) {
        const result = await this.analyzeEntryTypeGroup(group, salesCache);
        analyzedGroups.push({ group, result });
        this.applySummary(summary, result.status, result.warnings);
      }

      const analysisCostCenterPreviews =
        await this.buildEntryAnalysisCostCenterPreviews(analyzedGroups);
      const escritaCostCenterPreviews =
        await this.buildEntryWritingCostCenterPreviews(analyzedGroups);

      for (const { group, result } of analyzedGroups) {
        await this.prisma.costCenterApportionmentPreviewItem.create({
          data: {
            previewRunId: previewRun.id,
            documentSource: "NOTA_ENTRADA",
            noteEntryId: group.noteEntryId,
            entryTypeId: group.entryTypeId,
            storeId: group.storeId,
            supplierId: group.supplierId,
            supplierName: group.supplierName,
            entryDate: this.toDateOrNull(group.entryDate),
            competence: result.competence,
            status: result.status,
            effectiveCostCenterTypeVrId: result.effectiveCostCenterTypeVrId,
            effectiveCostCenterTypeId: result.effectiveCostCenterTypeId,
            warnings: result.warnings,
            details: {
              ...result.details,
              analysisCostCenterPreview:
                analysisCostCenterPreviews.get(group.noteEntryId) ?? null,
              escritaCostCenterPreview:
                escritaCostCenterPreviews.get(group.noteEntryId) ?? null,
            },
          },
        });
      }

      const durationMs = Date.now() - startedAt.getTime();
      summary.durationMs = durationMs;

      await this.prisma.costCenterApportionmentPreviewRun.update({
        where: { id: previewRun.id },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          durationMs,
          summary: this.toJson(summary),
        },
      });

      this.logger.log(
        `Preview de rateio de notaentrada concluido (previewRunId=${previewRun.id}, periodo=${period.initialDate}..${period.finalDate}, grupos=${summary.eligibleGroups}, calculados=${summary.calculatedNotes}).`,
      );

      return summary;
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.costCenterApportionmentPreviewRun.update({
        where: { id: previewRun.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          durationMs,
          summary: this.toJson({ ...summary, durationMs, error: message }),
        },
      });

      this.logger.error(
        `Falha no preview de rateio de notaentrada (previewRunId=${previewRun.id}): ${message}`,
      );
      throw error;
    }
  }

  async previewOtherExpenseCostCenterApportionmentBySalesParticipation(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const startedAt = new Date();
    const previewRun =
      await this.prisma.costCenterApportionmentPreviewRun.create({
        data: {
          codeJobRunId: context?.codeJobRunId ?? null,
          source: context?.source ?? "JOB",
          status: "RUNNING",
          startedAt,
          summary: {
            reason: context?.reason ?? null,
            documentSource: "PAGAR_OUTRAS_DESPESAS",
            mode: "DRY_RUN",
            vrMasterWrites: false,
            processedPeriod: period,
          },
        },
      });

    this.logger.log(
      `Iniciando preview de rateio de outras despesas por venda (previewRunId=${previewRun.id}, periodo=${period.initialDate}..${period.finalDate}, origem=${period.source}).`,
    );

    const salesCache: SalesCache = new Map();
    const summary = this.createEmptySummary(
      previewRun.id,
      startedAt,
      period,
      "PAGAR_OUTRAS_DESPESAS",
      context,
    );

    try {
      const rows = await this.fetchEligibleOtherExpenseRows(period);
      const documents = this.groupOtherExpenseDocuments(rows);
      summary.eligibleNotes = documents.length;
      summary.eligibleGroups = documents.length;
      summary.sourceRows = rows.length;

      for (const document of documents) {
        const result = await this.analyzeOtherExpenseDocument(
          document,
          salesCache,
        );
        this.applySummary(summary, result.status, result.warnings);

        await this.prisma.costCenterApportionmentPreviewItem.create({
          data: {
            previewRunId: previewRun.id,
            documentSource: "PAGAR_OUTRAS_DESPESAS",
            otherExpenseId: document.otherExpenseId,
            entryTypeId: document.entryTypeId,
            storeId: document.storeId,
            supplierId: document.supplierId,
            supplierName: document.supplierName,
            entryDate: this.toDateOrNull(document.entryDate),
            competence: result.competence,
            status: result.status,
            effectiveCostCenterTypeVrId: result.effectiveCostCenterTypeVrId,
            effectiveCostCenterTypeId: result.effectiveCostCenterTypeId,
            warnings: result.warnings,
            details: result.details,
          },
        });
      }

      const durationMs = Date.now() - startedAt.getTime();
      summary.durationMs = durationMs;

      await this.prisma.costCenterApportionmentPreviewRun.update({
        where: { id: previewRun.id },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          durationMs,
          summary: this.toJson(summary),
        },
      });

      this.logger.log(
        `Preview de rateio de outras despesas concluido (previewRunId=${previewRun.id}, periodo=${period.initialDate}..${period.finalDate}, documentos=${summary.eligibleNotes}, calculados=${summary.calculatedNotes}).`,
      );

      return summary;
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.costCenterApportionmentPreviewRun.update({
        where: { id: previewRun.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          durationMs,
          summary: this.toJson({ ...summary, durationMs, error: message }),
        },
      });

      this.logger.error(
        `Falha no preview de rateio de outras despesas (previewRunId=${previewRun.id}): ${message}`,
      );
      throw error;
    }
  }

  async applyCostCenterApportionmentBySalesParticipation(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const startedAt = new Date();
    const summary = this.createEmptyApplySummary(
      startedAt,
      period,
      "NOTA_DESPESA",
      context,
    );
    const salesCache: SalesCache = new Map();

    this.logger.log(
      `Iniciando apply real de rateio de notadespesa por venda (periodo=${period.initialDate}..${period.finalDate}, origem=${period.source}).`,
    );

    try {
      const rows = await this.fetchEligibleExpenseRows(period);
      const notes = this.groupExpenseNotes(rows);
      summary.sourceRows = rows.length;
      summary.eligibleNotes = notes.length;
      summary.eligibleGroups = notes.length;

      const analyzedNotes: AnalyzedExpenseNote[] = [];
      for (const note of notes) {
        analyzedNotes.push({
          note,
          result: await this.analyzeNote(note, salesCache),
        });
      }

      for (const { note, result } of analyzedNotes) {
        await this.applyExpenseNoteIfSafe(summary, note, result);
      }

      summary.durationMs = Date.now() - startedAt.getTime();
      this.logger.log(
        `Apply real de notadespesa concluido (periodo=${period.initialDate}..${period.finalDate}, aplicados=${summary.appliedGroups}, pulados=${summary.skippedGroups}, erros=${summary.failedGroups}).`,
      );
      return summary;
    } catch (error) {
      summary.durationMs = Date.now() - startedAt.getTime();
      summary.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha no apply real de notadespesa: ${summary.error}`);
      throw error;
    }
  }

  async applyEntryCostCenterApportionmentBySalesParticipation(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const startedAt = new Date();
    const summary = this.createEmptyApplySummary(
      startedAt,
      period,
      "NOTA_ENTRADA",
      context,
    );
    const salesCache: SalesCache = new Map();

    this.logger.log(
      `Iniciando apply real de rateio de notaentrada por venda (periodo=${period.initialDate}..${period.finalDate}, origem=${period.source}).`,
    );

    try {
      const rows = await this.fetchEligibleEntryRows(period);
      const groups = this.groupEntryTypeGroups(rows);
      summary.sourceRows = rows.length;
      summary.eligibleNotes = new Set(
        groups.map((group) => group.noteEntryId),
      ).size;
      summary.eligibleGroups = groups.length;

      const analyzedGroups: AnalyzedEntryTypeGroup[] = [];
      for (const group of groups) {
        analyzedGroups.push({
          group,
          result: await this.analyzeEntryTypeGroup(group, salesCache),
        });
      }

      const analysisCostCenterPreviews =
        await this.buildEntryAnalysisCostCenterPreviews(analyzedGroups);
      const escritaCostCenterPreviews =
        await this.buildEntryWritingCostCenterPreviews(analyzedGroups);
      const groupsByNote = this.groupAnalyzedEntryGroupsByNote(analyzedGroups);

      for (const [noteEntryId, noteGroups] of groupsByNote.entries()) {
        await this.applyEntryNoteIfSafe(
          summary,
          noteEntryId,
          noteGroups,
          analysisCostCenterPreviews.get(noteEntryId) ?? null,
          escritaCostCenterPreviews.get(noteEntryId) ?? null,
        );
      }

      summary.durationMs = Date.now() - startedAt.getTime();
      this.logger.log(
        `Apply real de notaentrada concluido (periodo=${period.initialDate}..${period.finalDate}, notas=${summary.eligibleNotes}, grupos=${summary.eligibleGroups}, aplicados=${summary.appliedGroups}, pulados=${summary.skippedGroups}, erros=${summary.failedGroups}).`,
      );
      return summary;
    } catch (error) {
      summary.durationMs = Date.now() - startedAt.getTime();
      summary.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha no apply real de notaentrada: ${summary.error}`);
      throw error;
    }
  }

  async applyOtherExpenseCostCenterApportionmentBySalesParticipation(
    context?: CodeJobExecutionContext,
  ) {
    const period = this.resolveExecutionPeriod(context?.params);
    const startedAt = new Date();
    const summary = this.createEmptyApplySummary(
      startedAt,
      period,
      "PAGAR_OUTRAS_DESPESAS",
      context,
    );
    const salesCache: SalesCache = new Map();

    this.logger.log(
      `Iniciando apply real de rateio de outras despesas por venda (periodo=${period.initialDate}..${period.finalDate}, origem=${period.source}).`,
    );

    try {
      const rows = await this.fetchEligibleOtherExpenseRows(period);
      const documents = this.groupOtherExpenseDocuments(rows);
      summary.sourceRows = rows.length;
      summary.eligibleNotes = documents.length;
      summary.eligibleGroups = documents.length;

      const analyzedDocuments: AnalyzedOtherExpenseDocument[] = [];
      for (const document of documents) {
        analyzedDocuments.push({
          document,
          result: await this.analyzeOtherExpenseDocument(document, salesCache),
        });
      }

      for (const { document, result } of analyzedDocuments) {
        await this.applyOtherExpenseDocumentIfSafe(summary, document, result);
      }

      summary.durationMs = Date.now() - startedAt.getTime();
      this.logger.log(
        `Apply real de outras despesas concluido (periodo=${period.initialDate}..${period.finalDate}, aplicados=${summary.appliedGroups}, pulados=${summary.skippedGroups}, erros=${summary.failedGroups}).`,
      );
      return summary;
    } catch (error) {
      summary.durationMs = Date.now() - startedAt.getTime();
      summary.error = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha no apply real de outras despesas: ${summary.error}`,
      );
      throw error;
    }
  }

  private async runPreviewSource(
    source: CostCenterApportionmentSource,
    context?: CodeJobExecutionContext,
  ) {
    try {
      switch (source) {
        case "notadespesa":
          return await this.previewCostCenterApportionmentBySalesParticipation(
            context,
          );
        case "notaentrada":
          return await this.previewEntryCostCenterApportionmentBySalesParticipation(
            context,
          );
        case "pagaroutrasdespesas":
          return await this.previewOtherExpenseCostCenterApportionmentBySalesParticipation(
            context,
          );
      }
    } catch (error) {
      return this.buildConsolidatedSourceError(source, error);
    }
  }

  private async runApplySource(
    source: CostCenterApportionmentSource,
    context?: CodeJobExecutionContext,
  ) {
    try {
      switch (source) {
        case "notadespesa":
          return await this.applyCostCenterApportionmentBySalesParticipation(
            context,
          );
        case "notaentrada":
          return await this.applyEntryCostCenterApportionmentBySalesParticipation(
            context,
          );
        case "pagaroutrasdespesas":
          return await this.applyOtherExpenseCostCenterApportionmentBySalesParticipation(
            context,
          );
      }
    } catch (error) {
      return this.buildConsolidatedSourceError(source, error);
    }
  }

  private buildConsolidatedSourceError(
    source: CostCenterApportionmentSource,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `Falha na origem ${source} do job consolidado de centro de custo: ${message}`,
    );
    return {
      source,
      status: "FAILED",
      error: message,
    };
  }

  async listPreviewRuns(page = 1, pageSize = 50) {
    const safePage = Number.isFinite(page) ? page : 1;
    const safePageSize = Number.isFinite(pageSize) ? pageSize : 50;
    const normalizedPage = Math.max(1, Math.floor(safePage));
    const normalizedPageSize = Math.min(
      200,
      Math.max(1, Math.floor(safePageSize)),
    );
    const skip = (normalizedPage - 1) * normalizedPageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.costCenterApportionmentPreviewRun.findMany({
        orderBy: { id: "desc" },
        skip,
        take: normalizedPageSize,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.costCenterApportionmentPreviewRun.count(),
    ]);

    return {
      items,
      total,
      page: normalizedPage,
      pageSize: normalizedPageSize,
      totalPages: Math.ceil(total / normalizedPageSize),
    };
  }

  async getPreviewRun(id: number) {
    return this.prisma.costCenterApportionmentPreviewRun.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { id: "asc" },
        },
      },
    });
  }

  private async applyExpenseNoteIfSafe(
    summary: ReturnType<typeof this.createEmptyApplySummary>,
    note: ExpenseNote,
    result: PreviewAnalysisResult,
  ) {
    const baseItem = {
      documentSource: "NOTA_DESPESA",
      noteExpenseId: note.id,
      sourceStatusId: note.statusId,
      sourceFinalized: this.isFinalized(note.statusId),
      status: result.status,
      warnings: result.warnings,
    };
    const decision = this.getApplyDecisionForPercentageResult(result);
    if (decision !== APPLY_DECISION_APPLY) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision,
        reason:
          result.details?.reason ??
          "Preview percentual nao esta em status aplicavel.",
      });
      return;
    }

    const rateLines = this.asArray(result.details?.recalculatedLines);
    const shouldApplyDerivedTables = this.isFinalized(note.statusId);
    const analysisPreview = result.details?.analysisCostCenterPreview;
    const analysisLines = shouldApplyDerivedTables
      ? this.getAutomaticAnalysisCostCenterLines(analysisPreview)
      : [];
    const validationError =
      this.validateSuggestedPercentageLines(
        rateLines,
        "recalculatedPercentage",
      ) ??
      (shouldApplyDerivedTables &&
      analysisPreview?.status !== ANALYSIS_STATUS_PREVIEW_CALCULATED
        ? (analysisPreview?.reason ??
          "Preview de analisecentrocusto nao esta aplicavel.")
        : null) ??
      (shouldApplyDerivedTables
        ? this.validateSuggestedAnalysisLines(analysisLines, "id_notadespesa")
        : null);

    if (validationError) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_SKIP_INCOMPLETE,
        reason: validationError,
      });
      return;
    }

    try {
      const mutations = await this.pg.transaction(async (tx) => {
        const tableMutations: Record<string, MutationSummary> = {};
        tableMutations.notadespesacentrocusto =
          await this.syncExpenseCostCenterLines(tx, note.id, rateLines);
        if (shouldApplyDerivedTables) {
          tableMutations.analisecentrocusto =
            await this.syncAnalysisCostCenterLines(
              tx,
              "NOTA_DESPESA",
              note.id,
              analysisLines,
            );
        } else {
          tableMutations.analisecentrocusto = this.emptyMutationSummary();
        }
        return tableMutations;
      });

      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_APPLY,
        reason: shouldApplyDerivedTables
          ? "Aplicado com sucesso a partir das linhas sugeridas pelo preview."
          : "Rateio principal aplicado; analisecentrocusto pulada porque a notadespesa nao esta finalizada.",
        derivedTablesSkipped: shouldApplyDerivedTables
          ? []
          : [
              {
                table: "analisecentrocusto",
                reason: "id_situacaonotadespesa diferente de 1.",
              },
            ],
        mutations,
      });
    } catch (error) {
      this.recordApplyError(summary, baseItem, error);
    }
  }

  private async applyOtherExpenseDocumentIfSafe(
    summary: ReturnType<typeof this.createEmptyApplySummary>,
    document: OtherExpenseDocument,
    result: PreviewAnalysisResult,
  ) {
    const baseItem = {
      documentSource: "PAGAR_OUTRAS_DESPESAS",
      otherExpenseId: document.otherExpenseId,
      sourceStatusId: document.statusId,
      sourceFinalized: this.isFinalized(document.statusId),
      status: result.status,
      warnings: result.warnings,
    };
    const decision = this.getApplyDecisionForPercentageResult(result);
    if (decision !== APPLY_DECISION_APPLY) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision,
        reason:
          result.details?.reason ??
          "Preview percentual nao esta em status aplicavel.",
      });
      return;
    }

    const rateLines = this.asArray(result.details?.suggestedLines);
    const shouldApplyDerivedTables = this.isFinalized(document.statusId);
    const analysisPreview = result.details?.analysisCostCenterPreview;
    const analysisLines = shouldApplyDerivedTables
      ? this.getAutomaticAnalysisCostCenterLines(analysisPreview)
      : [];
    const validationError =
      this.validateSuggestedPercentageLines(rateLines, "suggestedPercentage") ??
      (shouldApplyDerivedTables &&
      analysisPreview?.status !== ANALYSIS_STATUS_PREVIEW_CALCULATED
        ? (analysisPreview?.reason ??
          "Preview de analisecentrocusto nao esta aplicavel.")
        : null) ??
      (shouldApplyDerivedTables
        ? this.validateSuggestedAnalysisLines(
            analysisLines,
            "id_pagaroutrasdespesas",
          )
        : null);

    if (validationError) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_SKIP_INCOMPLETE,
        reason: validationError,
      });
      return;
    }

    try {
      const mutations = await this.pg.transaction(async (tx) => {
        const tableMutations: Record<string, MutationSummary> = {};
        tableMutations.pagaroutrasdespesascentrocusto =
          await this.syncOtherExpenseCostCenterLines(
            tx,
            document.otherExpenseId,
            rateLines,
          );
        if (shouldApplyDerivedTables) {
          tableMutations.analisecentrocusto =
            await this.syncAnalysisCostCenterLines(
              tx,
              "PAGAR_OUTRAS_DESPESAS",
              document.otherExpenseId,
              analysisLines,
            );
        } else {
          tableMutations.analisecentrocusto = this.emptyMutationSummary();
        }
        return tableMutations;
      });

      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_APPLY,
        reason: shouldApplyDerivedTables
          ? "Aplicado com sucesso a partir das linhas sugeridas pelo preview."
          : "Rateio principal aplicado; analisecentrocusto pulada porque pagaroutrasdespesas nao esta finalizada.",
        derivedTablesSkipped: shouldApplyDerivedTables
          ? []
          : [
              {
                table: "analisecentrocusto",
                reason: "id_situacaopagaroutrasdespesas diferente de 1.",
              },
            ],
        mutations,
      });
    } catch (error) {
      this.recordApplyError(summary, baseItem, error);
    }
  }

  private async applyEntryNoteIfSafe(
    summary: ReturnType<typeof this.createEmptyApplySummary>,
    noteEntryId: number,
    noteGroups: AnalyzedEntryTypeGroup[],
    analysisPreview: Record<string, any> | null,
    escritaPreview: Record<string, any> | null,
  ) {
    const blockingGroup = noteGroups.find(
      ({ result }) => result.status !== STATUS_PREVIEW_CALCULATED,
    );
    const baseItem = {
      documentSource: "NOTA_ENTRADA",
      noteEntryId,
      entryTypeIds: noteGroups.map(({ group }) => group.entryTypeId),
      sourceStatusId: noteGroups[0]?.group.statusId ?? null,
      sourceFinalized: this.isFinalized(noteGroups[0]?.group.statusId ?? null),
      status: blockingGroup?.result.status ?? STATUS_PREVIEW_CALCULATED,
      warnings: noteGroups.flatMap(({ result }) => result.warnings),
    };
    const shouldApplyDerivedTables = this.isFinalized(
      noteGroups[0]?.group.statusId ?? null,
    );

    if (blockingGroup) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision: this.getApplyDecisionForPercentageResult(
          blockingGroup.result,
        ),
        reason:
          blockingGroup.result.details?.reason ??
          "Ao menos um grupo percentual da notaentrada nao esta aplicavel.",
        blockingGroups: noteGroups
          .filter(({ result }) => result.status !== STATUS_PREVIEW_CALCULATED)
          .map(({ group, result }) => ({
            entryTypeId: group.entryTypeId,
            status: result.status,
            reason: result.details?.reason ?? null,
          })),
      });
      return;
    }

    if (
      shouldApplyDerivedTables &&
      analysisPreview?.status !== ANALYSIS_STATUS_PREVIEW_CALCULATED
    ) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_SKIP_BLOCKED_BY_PREVIEW,
        reason:
          analysisPreview?.reason ??
          "Preview de analisecentrocusto da notaentrada nao esta aplicavel.",
        analysisStatus: analysisPreview?.status ?? null,
      });
      return;
    }

    if (
      shouldApplyDerivedTables &&
      escritaPreview?.status !== WRITING_STATUS_PREVIEW_CALCULATED
    ) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_SKIP_BLOCKED_BY_PREVIEW,
        reason:
          escritaPreview?.reason ??
          "Preview de escritacentrocusto da notaentrada nao esta aplicavel.",
        writingStatus: escritaPreview?.status ?? null,
      });
      return;
    }

    const rateValidationError = noteGroups
      .map(({ result }) =>
        this.validateSuggestedPercentageLines(
          this.asArray(result.details?.suggestedLines),
          "suggestedPercentage",
        ),
      )
      .find(Boolean);
    const analysisLines = shouldApplyDerivedTables
      ? this.getAutomaticAnalysisCostCenterLines(analysisPreview)
      : [];
    const escritaLines = shouldApplyDerivedTables
      ? this.asArray(escritaPreview?.suggestedEscritaCostCenterLines)
      : [];
    const validationError =
      rateValidationError ??
      (shouldApplyDerivedTables
        ? this.validateSuggestedAnalysisLines(analysisLines, "id_notaentrada")
        : null) ??
      (shouldApplyDerivedTables
        ? this.validateSuggestedWritingLines(escritaLines)
        : null);

    if (validationError) {
      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_SKIP_INCOMPLETE,
        reason: validationError,
      });
      return;
    }

    try {
      const mutations = await this.pg.transaction(async (tx) => {
        const tableMutations: Record<string, MutationSummary> = {};
        tableMutations.notaentradacentrocusto = this.emptyMutationSummary();
        for (const { group, result } of noteGroups) {
          this.addMutationSummary(
            tableMutations.notaentradacentrocusto,
            await this.syncEntryCostCenterLines(
              tx,
              group.noteEntryId,
              group.entryTypeId,
              this.asArray(result.details?.suggestedLines),
            ),
          );
        }
        if (shouldApplyDerivedTables) {
          tableMutations.analisecentrocusto =
            await this.syncAnalysisCostCenterLines(
              tx,
              "NOTA_ENTRADA",
              noteEntryId,
              analysisLines,
            );
          tableMutations.escritacentrocusto =
            await this.syncWritingCostCenterLines(tx, escritaLines);
        } else {
          tableMutations.analisecentrocusto = this.emptyMutationSummary();
          tableMutations.escritacentrocusto = this.emptyMutationSummary();
        }
        return tableMutations;
      });

      this.recordApplyItem(summary, {
        ...baseItem,
        decision: APPLY_DECISION_APPLY,
        reason: shouldApplyDerivedTables
          ? "Notaentrada aplicada com sucesso em transacao unica para notaentradacentrocusto, analisecentrocusto e escritacentrocusto."
          : "Rateio principal aplicado; analisecentrocusto e escritacentrocusto puladas porque a notaentrada nao esta finalizada.",
        derivedTablesSkipped: shouldApplyDerivedTables
          ? []
          : [
              {
                table: "analisecentrocusto",
                reason: "id_situacaonotaentrada diferente de 1.",
              },
              {
                table: "escritacentrocusto",
                reason: "id_situacaonotaentrada diferente de 1.",
              },
            ],
        mutations,
      });
    } catch (error) {
      this.recordApplyError(summary, baseItem, error);
    }
  }

  private groupAnalyzedEntryGroupsByNote(
    analyzedGroups: AnalyzedEntryTypeGroup[],
  ) {
    const groupsByNote = new Map<number, AnalyzedEntryTypeGroup[]>();
    for (const analyzedGroup of analyzedGroups) {
      const noteGroups =
        groupsByNote.get(analyzedGroup.group.noteEntryId) ?? [];
      noteGroups.push(analyzedGroup);
      groupsByNote.set(analyzedGroup.group.noteEntryId, noteGroups);
    }
    return groupsByNote;
  }

  private getApplyDecisionForPercentageResult(
    result: PreviewAnalysisResult,
  ): ApplyDecision {
    if (result.status === STATUS_PREVIEW_CALCULATED) {
      return APPLY_DECISION_APPLY;
    }

    if (result.status.startsWith("CONFLICT_")) {
      return APPLY_DECISION_SKIP_CONFLICT;
    }

    if (
      result.status === STATUS_SKIPPED_TYPE_NOT_PARTICIPATION ||
      result.status === STATUS_SKIPPED_NO_REMAINING_SHARE
    ) {
      return APPLY_DECISION_SKIP_OUT_OF_SCOPE;
    }

    if (
      result.status === STATUS_SKIPPED_MISSING_ENTRY_DATE ||
      result.status === STATUS_SKIPPED_TYPE_CONFIG_NOT_FOUND ||
      result.status === STATUS_SKIPPED_NO_PARTICIPATION_ITEMS ||
      result.status === STATUS_SKIPPED_NO_SALES_BASE
    ) {
      return APPLY_DECISION_SKIP_INCOMPLETE;
    }

    return APPLY_DECISION_SKIP_BLOCKED_BY_PREVIEW;
  }

  private async syncExpenseCostCenterLines(
    tx: PoolClient,
    noteExpenseId: number,
    suggestedLines: any[],
  ) {
    const desiredRows = suggestedLines.map((line) => ({
      storeId: this.toNumberOrNull(line.storeId),
      costCenterId: this.toNumberOrNull(line.costCenterId),
      costCenterTypeVrId: this.toNumberOrNull(line.costCenterTypeVrId),
      percentage: this.roundPercentage2(
        Number(line.recalculatedPercentage ?? 0),
      ),
    }));
    const existing = await tx.query(
      `
        SELECT
          id,
          id_loja AS "storeId",
          id_centrocusto AS "costCenterId",
          id_tipocentrocusto AS "costCenterTypeVrId",
          percentual AS "percentage"
        FROM notadespesacentrocusto
        WHERE id_notadespesa = $1
          AND id_tipocentrocusto IS NOT NULL
      `,
      [noteExpenseId],
    );

    return this.syncRowsByNaturalKey({
      existingRows: existing.rows,
      desiredRows,
      tableName: "notadespesacentrocusto",
      keyOfExisting: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      keyOfDesired: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      getExistingValue: (row) =>
        this.roundPercentage2(Number(row.percentage ?? 0)),
      getDesiredValue: (row) => row.percentage,
      normalizeValue: (value) => this.roundPercentage2(value),
      updateExisting: async (row, desired) => {
        await tx.query(
          "UPDATE notadespesacentrocusto SET percentual = $1 WHERE id = $2",
          [desired.percentage, row.id],
        );
      },
      insertDesired: async (desired) => {
        await tx.query(
          `
            INSERT INTO notadespesacentrocusto
              (id_notadespesa, id_loja, id_centrocusto, id_tipocentrocusto, percentual)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            noteExpenseId,
            desired.storeId,
            desired.costCenterId,
            desired.costCenterTypeVrId,
            desired.percentage,
          ],
        );
      },
      deleteExisting: async (row) => {
        await tx.query("DELETE FROM notadespesacentrocusto WHERE id = $1", [
          row.id,
        ]);
      },
    });
  }

  private async syncOtherExpenseCostCenterLines(
    tx: PoolClient,
    otherExpenseId: number,
    suggestedLines: any[],
  ) {
    const desiredRows = suggestedLines.map((line) => ({
      storeId: this.toNumberOrNull(line.storeId),
      costCenterId: this.toNumberOrNull(line.costCenterId),
      costCenterTypeVrId: this.toNumberOrNull(line.costCenterTypeVrId),
      percentage: this.roundPercentage2(Number(line.suggestedPercentage ?? 0)),
    }));
    const existing = await tx.query(
      `
        SELECT
          id,
          id_loja AS "storeId",
          id_centrocusto AS "costCenterId",
          id_tipocentrocusto AS "costCenterTypeVrId",
          percentual AS "percentage"
        FROM pagaroutrasdespesascentrocusto
        WHERE id_pagaroutrasdespesas = $1
          AND id_tipocentrocusto IS NOT NULL
      `,
      [otherExpenseId],
    );

    return this.syncRowsByNaturalKey({
      existingRows: existing.rows,
      desiredRows,
      tableName: "pagaroutrasdespesascentrocusto",
      keyOfExisting: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      keyOfDesired: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      getExistingValue: (row) =>
        this.roundPercentage2(Number(row.percentage ?? 0)),
      getDesiredValue: (row) => row.percentage,
      normalizeValue: (value) => this.roundPercentage2(value),
      updateExisting: async (row, desired) => {
        await tx.query(
          "UPDATE pagaroutrasdespesascentrocusto SET percentual = $1 WHERE id = $2",
          [desired.percentage, row.id],
        );
      },
      insertDesired: async (desired) => {
        await tx.query(
          `
            INSERT INTO pagaroutrasdespesascentrocusto
              (id_pagaroutrasdespesas, id_loja, id_centrocusto, id_tipocentrocusto, percentual)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            otherExpenseId,
            desired.storeId,
            desired.costCenterId,
            desired.costCenterTypeVrId,
            desired.percentage,
          ],
        );
      },
      deleteExisting: async (row) => {
        await tx.query(
          "DELETE FROM pagaroutrasdespesascentrocusto WHERE id = $1",
          [row.id],
        );
      },
    });
  }

  private async syncEntryCostCenterLines(
    tx: PoolClient,
    noteEntryId: number,
    entryTypeId: number | null,
    suggestedLines: any[],
  ) {
    const desiredRows = suggestedLines.map((line) => ({
      storeId: this.toNumberOrNull(line.storeId),
      costCenterId: this.toNumberOrNull(line.costCenterId),
      costCenterTypeVrId: this.toNumberOrNull(line.costCenterTypeVrId),
      percentage: this.roundPercentage2(Number(line.suggestedPercentage ?? 0)),
    }));
    const existing = await tx.query(
      `
        SELECT
          id,
          id_loja AS "storeId",
          id_centrocusto AS "costCenterId",
          id_tipocentrocusto AS "costCenterTypeVrId",
          percentual AS "percentage"
        FROM notaentradacentrocusto
        WHERE id_notaentrada = $1
          AND id_tipoentrada IS NOT DISTINCT FROM $2
          AND id_tipocentrocusto IS NOT NULL
      `,
      [noteEntryId, entryTypeId],
    );

    return this.syncRowsByNaturalKey({
      existingRows: existing.rows,
      desiredRows,
      tableName: "notaentradacentrocusto",
      keyOfExisting: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      keyOfDesired: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      getExistingValue: (row) =>
        this.roundPercentage2(Number(row.percentage ?? 0)),
      getDesiredValue: (row) => row.percentage,
      normalizeValue: (value) => this.roundPercentage2(value),
      updateExisting: async (row, desired) => {
        await tx.query(
          "UPDATE notaentradacentrocusto SET percentual = $1 WHERE id = $2",
          [desired.percentage, row.id],
        );
      },
      insertDesired: async (desired) => {
        await tx.query(
          `
            INSERT INTO notaentradacentrocusto
              (id_notaentrada, id_tipoentrada, id_loja, id_centrocusto, id_tipocentrocusto, percentual)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            noteEntryId,
            entryTypeId,
            desired.storeId,
            desired.costCenterId,
            desired.costCenterTypeVrId,
            desired.percentage,
          ],
        );
      },
      deleteExisting: async (row) => {
        await tx.query("DELETE FROM notaentradacentrocusto WHERE id = $1", [
          row.id,
        ]);
      },
    });
  }

  private async syncAnalysisCostCenterLines(
    tx: PoolClient,
    source: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    originId: number,
    suggestedLines: any[],
  ) {
    const desiredRows = suggestedLines.map((line) => ({
      storeId: this.toNumberOrNull(line.id_loja),
      costCenterId: this.toNumberOrNull(line.id_centrocusto),
      costCenterTypeVrId: this.toNumberOrNull(line.id_tipocentrocusto),
      value: this.roundCurrency(Number(line.valor ?? 0)),
    }));
    const { selectSql, selectParams } = this.buildAnalysisSelect(
      source,
      originId,
    );
    const existing = await tx.query(selectSql, selectParams);

    return this.syncRowsByNaturalKey({
      existingRows: existing.rows,
      desiredRows,
      tableName: "analisecentrocusto",
      keyOfExisting: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      keyOfDesired: (row) =>
        this.automaticCostCenterKey(
          row.storeId,
          row.costCenterId,
          row.costCenterTypeVrId,
        ),
      getExistingValue: (row) => this.roundCurrency(Number(row.value ?? 0)),
      getDesiredValue: (row) => row.value,
      normalizeValue: (value) => this.roundCurrency(value),
      updateExisting: async (row, desired) => {
        await tx.query(
          "UPDATE analisecentrocusto SET valor = $1 WHERE id = $2",
          [desired.value, row.id],
        );
      },
      insertDesired: async (desired) => {
        const { insertSql, insertParams } = this.buildAnalysisInsert(
          source,
          originId,
          desired,
        );
        await tx.query(insertSql, insertParams);
      },
      deleteExisting: async (row) => {
        await tx.query("DELETE FROM analisecentrocusto WHERE id = $1", [
          row.id,
        ]);
      },
    });
  }

  private async syncWritingCostCenterLines(
    tx: PoolClient,
    suggestedLines: any[],
  ) {
    const summary = this.emptyMutationSummary();
    const linesByScope = new Map<string, any[]>();
    for (const line of suggestedLines) {
      const scopeKey = [line.id_escrita, line.id_tipoentrada ?? "NULL"].join(
        "|",
      );
      const lines = linesByScope.get(scopeKey) ?? [];
      lines.push(line);
      linesByScope.set(scopeKey, lines);
    }

    for (const scopeLines of linesByScope.values()) {
      const firstLine = scopeLines[0];
      const writingId = this.toNumberOrNull(firstLine.id_escrita);
      const entryTypeId = this.toNumberOrNull(firstLine.id_tipoentrada);
      const desiredRows = scopeLines.map((line) => ({
        writingId: this.toNumberOrNull(line.id_escrita),
        entryTypeId: this.toNumberOrNull(line.id_tipoentrada),
        storeId: this.toNumberOrNull(line.id_loja),
        costCenterId: this.toNumberOrNull(line.id_centrocusto),
        percentage: this.roundPercentage2(Number(line.percentual ?? 0)),
      }));
      const existing = await tx.query(
        `
          SELECT
            id,
            id_escrita AS "writingId",
            id_tipoentrada AS "entryTypeId",
            id_loja AS "storeId",
            id_centrocusto AS "costCenterId",
            percentual AS "percentage"
          FROM escritacentrocusto
          WHERE id_escrita = $1
            AND id_tipoentrada IS NOT DISTINCT FROM $2
        `,
        [writingId, entryTypeId],
      );

      this.addMutationSummary(
        summary,
        await this.syncRowsByNaturalKey({
          existingRows: existing.rows,
          desiredRows,
          tableName: "escritacentrocusto",
          keyOfExisting: (row) =>
            this.writingCostCenterKey(
              row.writingId,
              this.toNumberOrNull(row.entryTypeId),
              row.costCenterId,
              row.storeId,
            ),
          keyOfDesired: (row) =>
            this.writingCostCenterKey(
              row.writingId,
              row.entryTypeId,
              row.costCenterId,
              row.storeId,
            ),
          getExistingValue: (row) =>
            this.roundPercentage2(Number(row.percentage ?? 0)),
          getDesiredValue: (row) => row.percentage,
          normalizeValue: (value) => this.roundPercentage2(value),
          updateExisting: async (row, desired) => {
            await tx.query(
              "UPDATE escritacentrocusto SET percentual = $1 WHERE id = $2",
              [desired.percentage, row.id],
            );
          },
          insertDesired: async (desired) => {
            await tx.query(
              `
                INSERT INTO escritacentrocusto
                  (id_escrita, id_tipoentrada, id_centrocusto, id_loja, percentual)
                VALUES ($1, $2, $3, $4, $5)
              `,
              [
                desired.writingId,
                desired.entryTypeId,
                desired.costCenterId,
                desired.storeId,
                desired.percentage,
              ],
            );
          },
          deleteExisting: async (row) => {
            await tx.query("DELETE FROM escritacentrocusto WHERE id = $1", [
              row.id,
            ]);
          },
        }),
      );
    }

    return summary;
  }

  private async syncRowsByNaturalKey<
    TExisting extends Record<string, any>,
    TDesired extends Record<string, any>,
  >({
    existingRows,
    desiredRows,
    tableName,
    keyOfExisting,
    keyOfDesired,
    getExistingValue,
    getDesiredValue,
    normalizeValue,
    updateExisting,
    insertDesired,
    deleteExisting,
  }: {
    existingRows: TExisting[];
    desiredRows: TDesired[];
    tableName: string;
    keyOfExisting: (row: TExisting) => string;
    keyOfDesired: (row: TDesired) => string;
    getExistingValue: (row: TExisting) => number;
    getDesiredValue: (row: TDesired) => number;
    normalizeValue: (value: number) => number;
    updateExisting: (existing: TExisting, desired: TDesired) => Promise<void>;
    insertDesired: (desired: TDesired) => Promise<void>;
    deleteExisting: (existing: TExisting) => Promise<void>;
  }) {
    const summary = this.emptyMutationSummary();
    const existingByKey = new Map<string, TExisting>();
    for (const row of existingRows) {
      const key = keyOfExisting(row);
      if (existingByKey.has(key)) {
        throw new Error(
          `Apply bloqueado: a tabela ${tableName} possui linhas automaticas duplicadas para a chave ${key}.`,
        );
      }
      existingByKey.set(key, row);
    }

    const desiredByKey = new Map<string, TDesired>();
    for (const row of desiredRows) {
      const key = keyOfDesired(row);
      if (desiredByKey.has(key)) {
        throw new Error(
          `Apply bloqueado: o preview gerou linhas duplicadas para ${tableName} na chave ${key}.`,
        );
      }
      desiredByKey.set(key, row);
    }

    for (const [key, desired] of desiredByKey.entries()) {
      const existing = existingByKey.get(key);
      if (!existing) {
        await insertDesired(desired);
        summary.inserted += 1;
        continue;
      }

      const currentValue = normalizeValue(getExistingValue(existing));
      const desiredValue = normalizeValue(getDesiredValue(desired));
      if (currentValue !== desiredValue) {
        await updateExisting(existing, desired);
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }
    }

    for (const [key, existing] of existingByKey.entries()) {
      if (desiredByKey.has(key)) continue;
      await deleteExisting(existing);
      summary.deleted += 1;
    }

    return summary;
  }

  private buildAnalysisSelect(
    source: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    originId: number,
  ) {
    const baseSelect = `
      SELECT
        id,
        id_loja AS "storeId",
        id_centrocusto AS "costCenterId",
        id_tipocentrocusto AS "costCenterTypeVrId",
        valor AS "value"
      FROM analisecentrocusto
    `;

    if (source === "NOTA_DESPESA") {
      return {
        selectSql: `${baseSelect} WHERE id_notadespesa = $1 AND id_tipocentrocusto IS NOT NULL`,
        selectParams: [originId],
      };
    }
    if (source === "NOTA_ENTRADA") {
      return {
        selectSql: `${baseSelect} WHERE id_notaentrada = $1 AND id_tipocentrocusto IS NOT NULL`,
        selectParams: [originId],
      };
    }
    return {
      selectSql: `${baseSelect} WHERE id_pagaroutrasdespesas = $1 AND id_tipocentrocusto IS NOT NULL`,
      selectParams: [originId],
    };
  }

  private buildAnalysisInsert(
    source: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    originId: number,
    desired: {
      storeId: number | null;
      costCenterTypeVrId: number | null;
      costCenterId: number | null;
      value: number;
    },
  ) {
    if (source === "NOTA_DESPESA") {
      return {
        insertSql: `
          INSERT INTO analisecentrocusto
            (id_loja, id_tipocentrocusto, id_centrocusto, id_notadespesa, valor)
          VALUES ($1, $2, $3, $4, $5)
        `,
        insertParams: [
          desired.storeId,
          desired.costCenterTypeVrId,
          desired.costCenterId,
          originId,
          desired.value,
        ],
      };
    }
    if (source === "NOTA_ENTRADA") {
      return {
        insertSql: `
          INSERT INTO analisecentrocusto
            (id_loja, id_tipocentrocusto, id_centrocusto, id_notaentrada, valor)
          VALUES ($1, $2, $3, $4, $5)
        `,
        insertParams: [
          desired.storeId,
          desired.costCenterTypeVrId,
          desired.costCenterId,
          originId,
          desired.value,
        ],
      };
    }
    return {
      insertSql: `
        INSERT INTO analisecentrocusto
          (id_loja, id_tipocentrocusto, id_centrocusto, id_pagaroutrasdespesas, valor)
        VALUES ($1, $2, $3, $4, $5)
      `,
      insertParams: [
        desired.storeId,
        desired.costCenterTypeVrId,
        desired.costCenterId,
        originId,
        desired.value,
      ],
    };
  }

  private validateSuggestedPercentageLines(
    lines: any[],
    percentageField: "recalculatedPercentage" | "suggestedPercentage",
  ) {
    if (!lines.length) {
      return "Preview aplicavel sem linhas automaticas sugeridas para sincronizar percentual.";
    }

    const invalidLine = lines.find((line) => {
      const storeId = this.toNumberOrNull(line.storeId);
      const costCenterId = this.toNumberOrNull(line.costCenterId);
      const costCenterTypeVrId = this.toNumberOrNull(line.costCenterTypeVrId);
      const percentage = this.toNumberOrNull(line[percentageField]);
      return (
        storeId === null ||
        costCenterId === null ||
        costCenterTypeVrId === null ||
        percentage === null ||
        !Number.isFinite(percentage)
      );
    });

    if (invalidLine) {
      return "Preview aplicavel contem linha percentual automatica incompleta; apply bloqueado para evitar escrita ambigua.";
    }

    return null;
  }

  private validateSuggestedAnalysisLines(lines: any[], originField: string) {
    if (!lines.length) {
      return "Preview financeiro aplicavel sem linhas automaticas sugeridas para analisecentrocusto.";
    }

    const invalidLine = lines.find((line) => {
      const storeId = this.toNumberOrNull(line.id_loja);
      const costCenterId = this.toNumberOrNull(line.id_centrocusto);
      const costCenterTypeVrId = this.toNumberOrNull(line.id_tipocentrocusto);
      const value = this.toNumberOrNull(line.valor);
      return (
        this.toNumberOrNull(line[originField]) === null ||
        storeId === null ||
        costCenterId === null ||
        costCenterTypeVrId === null ||
        value === null ||
        !Number.isFinite(value)
      );
    });

    if (invalidLine) {
      return "Preview financeiro contem linha automatica incompleta para analisecentrocusto; apply bloqueado.";
    }

    return null;
  }

  private validateSuggestedWritingLines(lines: any[]) {
    if (!lines.length) {
      return "Preview de escritacentrocusto aplicavel sem linhas sugeridas para sincronizar.";
    }

    const invalidLine = lines.find((line) => {
      const writingId = this.toNumberOrNull(line.id_escrita);
      const storeId = this.toNumberOrNull(line.id_loja);
      const costCenterId = this.toNumberOrNull(line.id_centrocusto);
      const percentage = this.toNumberOrNull(line.percentual);
      return (
        writingId === null ||
        storeId === null ||
        costCenterId === null ||
        percentage === null ||
        !Number.isFinite(percentage)
      );
    });

    if (invalidLine) {
      return "Preview de escritacentrocusto contem linha incompleta; apply bloqueado.";
    }

    return null;
  }

  private getAutomaticAnalysisCostCenterLines(
    preview: Record<string, any> | null | undefined,
  ) {
    return this.asArray(preview?.suggestedAnalysisCostCenterLines).filter(
      (line) => this.toNumberOrNull(line.id_tipocentrocusto) !== null,
    );
  }

  private createEmptyApplySummary(
    startedAt: Date,
    period: PreviewPeriod,
    documentSource: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    context?: CodeJobExecutionContext,
  ) {
    return {
      codeJobRunId: context?.codeJobRunId ?? null,
      source: context?.source ?? "JOB",
      reason: context?.reason ?? null,
      documentSource,
      requestedParams: context?.params ?? null,
      processedPeriod: period,
      mode: "APPLY",
      vrMasterWrites: true,
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      sourceRows: 0,
      eligibleNotes: 0,
      eligibleGroups: 0,
      appliedGroups: 0,
      skippedGroups: 0,
      conflictGroups: 0,
      failedGroups: 0,
      byDecision: {} as Record<string, number>,
      byTable: {} as Record<string, MutationSummary>,
      items: [] as any[],
      error: null as string | null,
    };
  }

  private recordApplyItem(
    summary: ReturnType<typeof this.createEmptyApplySummary>,
    item: Record<string, any>,
  ) {
    const decision = item.decision as ApplyDecision;
    summary.byDecision[decision] = (summary.byDecision[decision] ?? 0) + 1;

    if (decision === APPLY_DECISION_APPLY) {
      summary.appliedGroups += 1;
    } else if (decision === APPLY_DECISION_ERROR) {
      summary.failedGroups += 1;
    } else {
      summary.skippedGroups += 1;
      if (decision === APPLY_DECISION_SKIP_CONFLICT) {
        summary.conflictGroups += 1;
      }
    }

    if (item.mutations) {
      for (const [tableName, tableSummary] of Object.entries(
        item.mutations as Record<string, MutationSummary>,
      )) {
        const target =
          summary.byTable[tableName] ?? this.emptyMutationSummary();
        this.addMutationSummary(target, tableSummary);
        summary.byTable[tableName] = target;
      }
    }

    summary.items.push({
      ...item,
      appliedAt:
        decision === APPLY_DECISION_APPLY ? new Date().toISOString() : null,
    });
  }

  private recordApplyError(
    summary: ReturnType<typeof this.createEmptyApplySummary>,
    baseItem: Record<string, any>,
    error: unknown,
  ) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Falha ao aplicar unidade de rateio: ${message}`);
    this.recordApplyItem(summary, {
      ...baseItem,
      decision: APPLY_DECISION_ERROR,
      reason: message,
    });
  }

  private emptyMutationSummary(): MutationSummary {
    return {
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
    };
  }

  private addMutationSummary(
    target: MutationSummary,
    increment: MutationSummary,
  ) {
    target.inserted += increment.inserted;
    target.updated += increment.updated;
    target.deleted += increment.deleted;
    target.unchanged += increment.unchanged;
  }

  private automaticCostCenterKey(
    storeId: number | string | null | undefined,
    costCenterId: number | string | null | undefined,
    costCenterTypeVrId: number | string | null | undefined,
  ) {
    return [
      this.toNumberOrNull(storeId as any) ?? "NULL",
      this.toNumberOrNull(costCenterId as any) ?? "NULL",
      this.toNumberOrNull(costCenterTypeVrId as any) ?? "NULL",
    ].join("|");
  }

  private asArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }

  private async fetchEligibleExpenseRows(period: PreviewPeriod) {
    const query = `
      SELECT
        nd.id AS "noteExpenseId",
        nd.id_loja AS "noteStoreId",
        nd.id_situacaonotadespesa AS "noteStatusId",
        nd.id_fornecedor AS "supplierId",
        f.razaosocial AS "supplierName",
        nd.numeronota AS "noteNumber",
        nd.dataentrada AS "entryDate",
        nd.valortotal AS "totalValue",
        ncc.id AS "lineId",
        ncc.id_centrocusto AS "lineCostCenterId",
        ncc.id_loja AS "lineStoreId",
        ncc.percentual AS "percentage",
        ncc.id_tipocentrocusto AS "costCenterTypeVrId"
      FROM notadespesa nd
      LEFT JOIN fornecedor f ON f.id = nd.id_fornecedor
      INNER JOIN notadespesacentrocusto ncc ON ncc.id_notadespesa = nd.id
      WHERE EXISTS (
        SELECT 1
        FROM notadespesacentrocusto typed
        WHERE typed.id_notadespesa = nd.id
          AND typed.id_tipocentrocusto IS NOT NULL
      )
      AND nd.dataentrada >= $1::date
      AND nd.dataentrada < ($2::date + INTERVAL '1 day')
      ORDER BY nd.dataentrada, nd.id, ncc.id
    `;

    const result = await this.pg.query<ExpenseCostCenterRow, [string, string]>(
      query,
      [period.initialDate, period.finalDate],
    );
    return result.rows;
  }

  private async fetchEligibleEntryRows(period: PreviewPeriod) {
    const query = `
      SELECT
        ne.id AS "noteEntryId",
        ne.id_loja AS "noteStoreId",
        ne.id_situacaonotaentrada AS "noteStatusId",
        ne.id_fornecedor AS "supplierId",
        f.razaosocial AS "supplierName",
        ne.numeronota AS "noteNumber",
        ne.dataentrada AS "entryDate",
        ne.valortotal AS "totalValue",
        necc.id_tipoentrada AS "entryTypeId",
        necc.id AS "lineId",
        necc.id_centrocusto AS "lineCostCenterId",
        necc.id_loja AS "lineStoreId",
        necc.percentual AS "percentage",
        necc.id_tipocentrocusto AS "costCenterTypeVrId"
      FROM notaentrada ne
      LEFT JOIN fornecedor f ON f.id = ne.id_fornecedor
      INNER JOIN notaentradacentrocusto necc ON necc.id_notaentrada = ne.id
      WHERE EXISTS (
        SELECT 1
        FROM notaentradacentrocusto typed
        WHERE typed.id_notaentrada = ne.id
          AND typed.id_tipoentrada IS NOT DISTINCT FROM necc.id_tipoentrada
          AND typed.id_tipocentrocusto IS NOT NULL
      )
      AND ne.dataentrada >= $1::date
      AND ne.dataentrada < ($2::date + INTERVAL '1 day')
      ORDER BY ne.dataentrada, ne.id, necc.id_tipoentrada, necc.id
    `;

    const result = await this.pg.query<EntryCostCenterRow, [string, string]>(
      query,
      [period.initialDate, period.finalDate],
    );
    return result.rows;
  }

  private async fetchEligibleOtherExpenseRows(period: PreviewPeriod) {
    const query = `
      SELECT
        pod.id AS "otherExpenseId",
        pod.id_loja AS "documentStoreId",
        pod.id_situacaopagaroutrasdespesas AS "documentStatusId",
        pod.id_fornecedor AS "supplierId",
        f.razaosocial AS "supplierName",
        pod.numerodocumento AS "documentNumber",
        pod.id_tipoentrada AS "entryTypeId",
        pod.dataentrada AS "entryDate",
        pod.valor AS "totalValue",
        podcc.id AS "lineId",
        podcc.id_centrocusto AS "lineCostCenterId",
        podcc.id_loja AS "lineStoreId",
        podcc.percentual AS "percentage",
        podcc.id_tipocentrocusto AS "costCenterTypeVrId"
      FROM pagaroutrasdespesas pod
      LEFT JOIN fornecedor f ON f.id = pod.id_fornecedor
      INNER JOIN pagaroutrasdespesascentrocusto podcc ON podcc.id_pagaroutrasdespesas = pod.id
      WHERE EXISTS (
        SELECT 1
        FROM pagaroutrasdespesascentrocusto typed
        WHERE typed.id_pagaroutrasdespesas = pod.id
          AND typed.id_tipocentrocusto IS NOT NULL
      )
      AND pod.dataentrada >= $1::date
      AND pod.dataentrada < ($2::date + INTERVAL '1 day')
      ORDER BY pod.dataentrada, pod.id, podcc.id
    `;

    const result = await this.pg.query<
      OtherExpenseCostCenterRow,
      [string, string]
    >(query, [period.initialDate, period.finalDate]);
    return result.rows;
  }

  private async fetchEntryItemTotalsForCostCenterTypes(noteEntryIds: number[]) {
    if (!noteEntryIds.length) return [];

    const query = `
      SELECT
        nei.id_notaentrada AS "noteEntryId",
        nei.id_tipoentrada AS "entryTypeId",
        SUM(nei.valortotal) AS "baseValue"
      FROM notaentradaitem nei
      WHERE nei.id_notaentrada = ANY($1::int[])
        AND EXISTS (
          SELECT 1
          FROM notaentradacentrocusto necc
          WHERE necc.id_notaentrada = nei.id_notaentrada
            AND necc.id_tipoentrada IS NOT DISTINCT FROM nei.id_tipoentrada
        )
      GROUP BY nei.id_notaentrada, nei.id_tipoentrada
      ORDER BY nei.id_notaentrada, nei.id_tipoentrada
    `;

    const result = await this.pg.query<EntryItemTypeTotalRow, [number[]]>(
      query,
      [noteEntryIds],
    );
    return result.rows;
  }

  private async fetchEntryItemTotalsIgnoredByCostCenter(
    noteEntryIds: number[],
  ) {
    if (!noteEntryIds.length) return [];

    const query = `
      SELECT
        nei.id_notaentrada AS "noteEntryId",
        nei.id_tipoentrada AS "entryTypeId",
        SUM(nei.valortotal) AS "baseValue"
      FROM notaentradaitem nei
      WHERE nei.id_notaentrada = ANY($1::int[])
        AND NOT EXISTS (
          SELECT 1
          FROM notaentradacentrocusto necc
          WHERE necc.id_notaentrada = nei.id_notaentrada
            AND necc.id_tipoentrada IS NOT DISTINCT FROM nei.id_tipoentrada
        )
      GROUP BY nei.id_notaentrada, nei.id_tipoentrada
      ORDER BY nei.id_notaentrada, nei.id_tipoentrada
    `;

    const result = await this.pg.query<EntryItemTypeTotalRow, [number[]]>(
      query,
      [noteEntryIds],
    );
    return result.rows;
  }

  private async fetchEntryWritingRowsForCostCenterTypes(
    noteEntryIds: number[],
  ) {
    if (!noteEntryIds.length) return [];

    const query = `
      SELECT
        e.id_notaentrada AS "noteEntryId",
        e.id AS "writingId",
        e.id_tipoentrada AS "entryTypeId",
        e.id_loja AS "storeId"
      FROM escrita e
      WHERE e.id_notaentrada = ANY($1::bigint[])
        AND EXISTS (
          SELECT 1
          FROM notaentradacentrocusto necc
          WHERE necc.id_notaentrada = e.id_notaentrada
            AND necc.id_tipoentrada IS NOT DISTINCT FROM e.id_tipoentrada
        )
      ORDER BY e.id_notaentrada, e.id_tipoentrada, e.id
    `;

    const result = await this.pg.query<EntryWritingRow, [number[]]>(query, [
      noteEntryIds,
    ]);
    return result.rows;
  }

  private async fetchEntryWritingRowsIgnoredByCostCenter(
    noteEntryIds: number[],
  ) {
    if (!noteEntryIds.length) return [];

    const query = `
      SELECT
        e.id_notaentrada AS "noteEntryId",
        e.id AS "writingId",
        e.id_tipoentrada AS "entryTypeId",
        e.id_loja AS "storeId"
      FROM escrita e
      WHERE e.id_notaentrada = ANY($1::bigint[])
        AND NOT EXISTS (
          SELECT 1
          FROM notaentradacentrocusto necc
          WHERE necc.id_notaentrada = e.id_notaentrada
            AND necc.id_tipoentrada IS NOT DISTINCT FROM e.id_tipoentrada
        )
      ORDER BY e.id_notaentrada, e.id_tipoentrada, e.id
    `;

    const result = await this.pg.query<EntryWritingRow, [number[]]>(query, [
      noteEntryIds,
    ]);
    return result.rows;
  }

  private async fetchExistingEntryWritingCostCenterRows(writingIds: number[]) {
    if (!writingIds.length) return [];

    const query = `
      SELECT
        ecc.id AS "writingCostCenterId",
        ecc.id_escrita AS "writingId",
        ecc.id_tipoentrada AS "entryTypeId",
        ecc.id_centrocusto AS "costCenterId",
        ecc.id_loja AS "storeId",
        ecc.percentual AS "percentage"
      FROM escritacentrocusto ecc
      WHERE ecc.id_escrita = ANY($1::int[])
      ORDER BY ecc.id_escrita, ecc.id_tipoentrada, ecc.id_centrocusto, ecc.id_loja, ecc.id
    `;

    const result = await this.pg.query<EntryWritingCostCenterRow, [number[]]>(
      query,
      [writingIds],
    );
    return result.rows;
  }

  private groupExpenseNotes(rows: ExpenseCostCenterRow[]): ExpenseNote[] {
    const notes = new Map<number, ExpenseNote>();

    for (const row of rows) {
      const noteId = Number(row.noteExpenseId);
      const note = notes.get(noteId) ?? {
        id: noteId,
        storeId: this.toNumberOrNull(row.noteStoreId),
        statusId: this.toNumberOrNull(row.noteStatusId),
        supplierId: this.toNumberOrNull(row.supplierId),
        supplierName: row.supplierName,
        noteNumber: this.toNumberOrNull(row.noteNumber),
        entryDate: row.entryDate,
        totalValue: this.toNumberOrNull(row.totalValue),
        lines: [],
      };

      note.lines.push({
        id: Number(row.lineId),
        costCenterId: this.toNumberOrNull(row.lineCostCenterId),
        storeId: this.toNumberOrNull(row.lineStoreId),
        percentage: this.toNumberOrNull(row.percentage),
        costCenterTypeVrId: this.toNumberOrNull(row.costCenterTypeVrId),
      });

      notes.set(noteId, note);
    }

    return Array.from(notes.values());
  }

  private groupEntryTypeGroups(rows: EntryCostCenterRow[]): EntryTypeGroup[] {
    const groups = new Map<string, EntryTypeGroup>();

    for (const row of rows) {
      const noteEntryId = Number(row.noteEntryId);
      const entryTypeId = this.toNumberOrNull(row.entryTypeId);
      const key = `${noteEntryId}|${entryTypeId ?? "NULL"}`;
      const group = groups.get(key) ?? {
        noteEntryId,
        entryTypeId,
        storeId: this.toNumberOrNull(row.noteStoreId),
        statusId: this.toNumberOrNull(row.noteStatusId),
        supplierId: this.toNumberOrNull(row.supplierId),
        supplierName: row.supplierName,
        noteNumber: this.toNumberOrNull(row.noteNumber),
        entryDate: row.entryDate,
        totalValue: this.toNumberOrNull(row.totalValue),
        lines: [],
      };

      group.lines.push({
        id: Number(row.lineId),
        costCenterId: this.toNumberOrNull(row.lineCostCenterId),
        storeId: this.toNumberOrNull(row.lineStoreId),
        percentage: this.toNumberOrNull(row.percentage),
        costCenterTypeVrId: this.toNumberOrNull(row.costCenterTypeVrId),
      });

      groups.set(key, group);
    }

    return Array.from(groups.values());
  }

  private groupOtherExpenseDocuments(
    rows: OtherExpenseCostCenterRow[],
  ): OtherExpenseDocument[] {
    const documents = new Map<number, OtherExpenseDocument>();

    for (const row of rows) {
      const otherExpenseId = Number(row.otherExpenseId);
      const document = documents.get(otherExpenseId) ?? {
        otherExpenseId,
        entryTypeId: this.toNumberOrNull(row.entryTypeId),
        storeId: this.toNumberOrNull(row.documentStoreId),
        statusId: this.toNumberOrNull(row.documentStatusId),
        supplierId: this.toNumberOrNull(row.supplierId),
        supplierName: row.supplierName,
        documentNumber: this.toNumberOrNull(row.documentNumber),
        entryDate: row.entryDate,
        totalValue: this.toNumberOrNull(row.totalValue),
        lines: [],
      };

      document.lines.push({
        id: Number(row.lineId),
        costCenterId: this.toNumberOrNull(row.lineCostCenterId),
        storeId: this.toNumberOrNull(row.lineStoreId),
        percentage: this.toNumberOrNull(row.percentage),
        costCenterTypeVrId: this.toNumberOrNull(row.costCenterTypeVrId),
      });

      documents.set(otherExpenseId, document);
    }

    return Array.from(documents.values());
  }

  private async analyzeNote(note: ExpenseNote, salesCache: SalesCache) {
    const warnings: string[] = [];
    const originalLines = note.lines.map((line) => this.serializeLine(line));
    const dateRange = this.getCompetenceDateRange(note.entryDate);

    if (!dateRange) {
      return this.buildResult({
        note,
        status: STATUS_SKIPPED_MISSING_ENTRY_DATE,
        warnings,
        details: {
          reason:
            "Nota sem dataentrada valida para definir competencia mensal.",
          originalLines,
        },
      });
    }

    const manualLines = note.lines.filter(
      (line) => line.costCenterTypeVrId === null,
    );
    const typedGroups = this.groupTypeLines(note.lines);
    const manualPercentageTotal = this.roundPercentage2(
      manualLines.reduce((sum, line) => sum + (line.percentage ?? 0), 0),
    );
    const remainingPercentage = this.roundPercentage2(
      100 - manualPercentageTotal,
    );

    if (manualLines.some((line) => line.percentage === null)) {
      warnings.push(WARNING_MANUAL_LINE_WITHOUT_PERCENTAGE);
    }

    const effectiveGroupDecision = this.selectEffectiveTypeGroup(
      typedGroups,
      warnings,
    );
    if (!effectiveGroupDecision.group) {
      return this.buildResult({
        note,
        status: effectiveGroupDecision.status,
        warnings,
        competence: dateRange.competence,
        details: {
          reason: effectiveGroupDecision.reason,
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          typeGroups: typedGroups.map((group) =>
            this.serializeTypeGroup(group),
          ),
        },
      });
    }

    const effectiveGroup = effectiveGroupDecision.group;

    if (remainingPercentage <= 0) {
      warnings.push(WARNING_NO_REMAINING_SHARE_FOR_TYPE);
      return this.buildResult({
        note,
        status: STATUS_SKIPPED_NO_REMAINING_SHARE,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        details: {
          reason:
            "Percentual manual consome todo o rateio disponivel para a nota.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          typeGroups: typedGroups.map((group) =>
            this.serializeTypeGroup(group),
          ),
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        },
      });
    }

    const costCenterType = await this.prisma.costCenterType.findUnique({
      where: { id_costcentertype_vr: effectiveGroup.costCenterTypeVrId },
      include: { costCenterTypeItems: true },
    });

    if (!costCenterType) {
      return this.buildResult({
        note,
        status: STATUS_SKIPPED_TYPE_CONFIG_NOT_FOUND,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        details: {
          reason:
            "Tipo de centro de custo do VRMaster nao encontrado no cadastro do PDT Connect.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        },
      });
    }

    if (!costCenterType.useParticipationCostCenter) {
      return this.buildResult({
        note,
        status: STATUS_SKIPPED_TYPE_NOT_PARTICIPATION,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Tipo de centro de custo nao esta configurado para participacao por centro de custo.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
        },
      });
    }

    const participationItems = costCenterType.costCenterTypeItems.filter(
      (item) =>
        item.participation === true && item.costCenterId && item.storeId,
    );
    const ignoredItems = costCenterType.costCenterTypeItems.filter(
      (item) =>
        item.participation !== true || !item.costCenterId || !item.storeId,
    );

    if (ignoredItems.length) {
      warnings.push(WARNING_INVALID_PARTICIPATION_ITEM_IGNORED);
    }

    if (!participationItems.length) {
      return this.buildResult({
        note,
        status: STATUS_SKIPPED_NO_PARTICIPATION_ITEMS,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Tipo de centro de custo nao possui itens validos marcados para participacao.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
          ignoredItems,
        },
      });
    }

    const salesBase = [];
    for (const item of participationItems) {
      const saleValue = await this.getSalesValueForItem({
        storeId: item.storeId,
        costCenterId: item.costCenterId,
        initialDate: dateRange.initialDate,
        finalDate: dateRange.finalDate,
        salesCache,
      });

      salesBase.push({
        costCenterTypeItemId: item.id,
        storeId: item.storeId,
        costCenterId: item.costCenterId,
        saleValue,
      });
    }

    const totalSaleValue = this.roundCurrency(
      salesBase.reduce((sum, item) => sum + item.saleValue, 0),
    );

    if (totalSaleValue <= 0) {
      return this.buildResult({
        note,
        status: STATUS_SKIPPED_NO_SALES_BASE,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Base de venda zerada para os centros de custo e lojas configurados no tipo.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
          salesBase,
          totalSaleValue,
        },
      });
    }

    const allocation = this.allocatePercentagesWithTwoDecimals(
      salesBase,
      remainingPercentage,
      totalSaleValue,
    );
    const recalculatedLines = allocation.lines.map((line) => {
      const originalLine = effectiveGroup.lines.find(
        (item) =>
          item.costCenterId === line.costCenterId &&
          item.storeId === line.storeId,
      );

      return {
        originalLineId: originalLine?.id ?? null,
        costCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        costCenterId: line.costCenterId,
        storeId: line.storeId,
        originalPercentage: originalLine?.percentage ?? null,
        recalculatedPercentage: line.recalculatedPercentage,
        saleValue: line.saleValue,
        participation: line.participation,
        rawPercentage: line.rawPercentage,
        roundingResidue: line.roundingResidue,
        wouldCreateLine: !originalLine,
      };
    });

    const recalculatedPercentageTotal = this.roundPercentage2(
      recalculatedLines.reduce(
        (sum, line) => sum + line.recalculatedPercentage,
        0,
      ),
    );
    const analysisCostCenterPreview = this.applyAnalysisFinalizationGate(
      this.buildDocumentAnalysisCostCenterPreview({
        source: "NOTA_DESPESA",
        baseValue: note.totalValue,
        baseValueSource: "notadespesa.valortotal",
        originIds: { id_notadespesa: note.id },
        percentageLines: [
          ...this.buildManualPercentageLines(manualLines),
          ...recalculatedLines.map((line) => ({
            source: "AUTOMATIC_RECALCULATED" as const,
            originalLineId: line.originalLineId,
            costCenterTypeVrId: line.costCenterTypeVrId,
            costCenterId: line.costCenterId,
            storeId: line.storeId,
            percentage: line.recalculatedPercentage,
          })),
        ],
      }),
      "NOTA_DESPESA",
      note.statusId,
    );

    return this.buildResult({
      note,
      status: STATUS_PREVIEW_CALCULATED,
      warnings,
      competence: dateRange.competence,
      effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
      effectiveCostCenterTypeId: costCenterType.id,
      details: {
        competence: dateRange,
        manualPercentageTotal,
        remainingPercentage,
        finalPercentageTotal: this.roundPercentage2(
          manualPercentageTotal + recalculatedPercentageTotal,
        ),
        recalculatedPercentageTotal,
        rounding: allocation.rounding,
        originalLines,
        manualLines: manualLines.map((line) => this.serializeLine(line)),
        typeGroups: typedGroups.map((group) => this.serializeTypeGroup(group)),
        selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        costCenterType: this.serializeCostCenterType(costCenterType),
        salesBase: {
          totalSaleValue,
          items: salesBase,
        },
        recalculatedLines,
        analysisCostCenterPreview,
        decision:
          "Percentuais sugeridos calculados em dry-run; nenhum UPDATE foi executado no VRMaster.",
      },
    });
  }

  private async analyzeEntryTypeGroup(
    group: EntryTypeGroup,
    salesCache: SalesCache,
  ) {
    const warnings: string[] = [];
    const originalLines = group.lines.map((line) => this.serializeLine(line));
    const dateRange = this.getCompetenceDateRange(group.entryDate);

    if (!dateRange) {
      return this.buildEntryResult({
        group,
        status: STATUS_SKIPPED_MISSING_ENTRY_DATE,
        warnings,
        details: {
          reason:
            "Nota de entrada sem dataentrada valida para definir competencia mensal.",
          originalLines,
        },
      });
    }

    const manualLines = group.lines.filter(
      (line) => line.costCenterTypeVrId === null,
    );
    const typedGroups = this.groupTypeLines(group.lines);
    const manualPercentageTotal = this.roundPercentage2(
      manualLines.reduce((sum, line) => sum + (line.percentage ?? 0), 0),
    );
    const remainingPercentage = this.roundPercentage2(
      100 - manualPercentageTotal,
    );

    if (manualLines.some((line) => line.percentage === null)) {
      warnings.push(WARNING_MANUAL_LINE_WITHOUT_PERCENTAGE);
    }

    const effectiveGroupDecision =
      this.selectEffectiveEntryTypeGroup(typedGroups);
    if (!effectiveGroupDecision.group) {
      return this.buildEntryResult({
        group,
        status: effectiveGroupDecision.status,
        warnings,
        competence: dateRange.competence,
        details: {
          reason: effectiveGroupDecision.reason,
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          typeGroups: typedGroups.map((typeGroup) =>
            this.serializeTypeGroup(typeGroup),
          ),
        },
      });
    }

    const effectiveGroup = effectiveGroupDecision.group;

    if (remainingPercentage <= 0) {
      warnings.push(WARNING_NO_REMAINING_SHARE_FOR_TYPE);
      return this.buildEntryResult({
        group,
        status: STATUS_SKIPPED_NO_REMAINING_SHARE,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        details: {
          reason:
            "Percentual manual consome todo o rateio disponivel para este tipo de entrada.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          typeGroups: typedGroups.map((typeGroup) =>
            this.serializeTypeGroup(typeGroup),
          ),
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          finalPercentageTotal: manualPercentageTotal,
        },
      });
    }

    const costCenterType = await this.prisma.costCenterType.findUnique({
      where: { id_costcentertype_vr: effectiveGroup.costCenterTypeVrId },
      include: { costCenterTypeItems: true },
    });

    if (!costCenterType) {
      return this.buildEntryResult({
        group,
        status: STATUS_SKIPPED_TYPE_CONFIG_NOT_FOUND,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        details: {
          reason:
            "Tipo de centro de custo do VRMaster nao encontrado no cadastro do PDT Connect.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        },
      });
    }

    if (!costCenterType.useParticipationCostCenter) {
      return this.buildEntryResult({
        group,
        status: STATUS_SKIPPED_TYPE_NOT_PARTICIPATION,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Tipo de centro de custo nao esta configurado para participacao por centro de custo.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
        },
      });
    }

    const participationItems = costCenterType.costCenterTypeItems.filter(
      (item) =>
        item.participation === true && item.costCenterId && item.storeId,
    );
    const ignoredItems = costCenterType.costCenterTypeItems.filter(
      (item) =>
        item.participation !== true || !item.costCenterId || !item.storeId,
    );

    if (ignoredItems.length) {
      warnings.push(WARNING_INVALID_PARTICIPATION_ITEM_IGNORED);
    }

    if (!participationItems.length) {
      return this.buildEntryResult({
        group,
        status: STATUS_SKIPPED_NO_PARTICIPATION_ITEMS,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Tipo de centro de custo nao possui itens validos marcados para participacao.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
          ignoredItems,
        },
      });
    }

    const salesBase = [];
    for (const item of participationItems) {
      const saleValue = await this.getSalesValueForItem({
        storeId: item.storeId,
        costCenterId: item.costCenterId,
        initialDate: dateRange.initialDate,
        finalDate: dateRange.finalDate,
        salesCache,
      });

      salesBase.push({
        costCenterTypeItemId: item.id,
        storeId: item.storeId,
        costCenterId: item.costCenterId,
        saleValue,
      });
    }

    const totalSaleValue = this.roundCurrency(
      salesBase.reduce((sum, item) => sum + item.saleValue, 0),
    );

    if (totalSaleValue <= 0) {
      return this.buildEntryResult({
        group,
        status: STATUS_SKIPPED_NO_SALES_BASE,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Base de venda zerada para os centros de custo e lojas configurados no tipo.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
          salesBase,
          totalSaleValue,
        },
      });
    }

    const allocation = this.allocatePercentagesWithTwoDecimals(
      salesBase,
      remainingPercentage,
      totalSaleValue,
    );
    const recalculatedLines = allocation.lines.map((line) => {
      const originalLine = effectiveGroup.lines.find(
        (item) =>
          item.costCenterId === line.costCenterId &&
          item.storeId === line.storeId,
      );

      return {
        originalLineId: originalLine?.id ?? null,
        costCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        costCenterId: line.costCenterId,
        storeId: line.storeId,
        originalPercentage: originalLine?.percentage ?? null,
        suggestedPercentage: line.recalculatedPercentage,
        saleValue: line.saleValue,
        participation: line.participation,
        rawPercentage: line.rawPercentage,
        roundingResidue: line.roundingResidue,
        wouldCreateLine: !originalLine,
      };
    });

    const recalculatedPercentageTotal = this.roundPercentage2(
      recalculatedLines.reduce(
        (sum, line) => sum + line.suggestedPercentage,
        0,
      ),
    );
    const finalPercentageTotal = this.roundPercentage2(
      manualPercentageTotal + recalculatedPercentageTotal,
    );

    return this.buildEntryResult({
      group,
      status: STATUS_PREVIEW_CALCULATED,
      warnings,
      competence: dateRange.competence,
      effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
      effectiveCostCenterTypeId: costCenterType.id,
      details: {
        competence: dateRange,
        manualPercentageTotal,
        remainingPercentage,
        finalPercentageTotal,
        recalculatedPercentageTotal,
        rounding: allocation.rounding,
        originalLines,
        manualLines: manualLines.map((line) => this.serializeLine(line)),
        typeGroups: typedGroups.map((typeGroup) =>
          this.serializeTypeGroup(typeGroup),
        ),
        selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        costCenterType: this.serializeCostCenterType(costCenterType),
        salesBase: {
          totalSaleValue,
          items: salesBase,
        },
        suggestedLines: recalculatedLines,
        decision:
          "Percentuais sugeridos calculados em dry-run por id_notaentrada e id_tipoentrada; nenhum UPDATE foi executado no VRMaster.",
      },
    });
  }

  private async analyzeOtherExpenseDocument(
    document: OtherExpenseDocument,
    salesCache: SalesCache,
  ) {
    const warnings: string[] = [];
    const originalLines = document.lines.map((line) =>
      this.serializeLine(line),
    );
    const dateRange = this.getCompetenceDateRange(document.entryDate);

    if (!dateRange) {
      return this.buildOtherExpenseResult({
        document,
        status: STATUS_SKIPPED_MISSING_ENTRY_DATE,
        warnings,
        details: {
          reason:
            "Outras despesas sem dataentrada valida para definir competencia mensal.",
          originalLines,
        },
      });
    }

    const manualLines = document.lines.filter(
      (line) => line.costCenterTypeVrId === null,
    );
    const typedGroups = this.groupTypeLines(document.lines);
    const manualPercentageTotal = this.roundPercentage2(
      manualLines.reduce((sum, line) => sum + (line.percentage ?? 0), 0),
    );
    const remainingPercentage = this.roundPercentage2(
      100 - manualPercentageTotal,
    );

    if (manualLines.some((line) => line.percentage === null)) {
      warnings.push(WARNING_MANUAL_LINE_WITHOUT_PERCENTAGE);
    }

    const effectiveGroupDecision =
      this.selectEffectiveOtherExpenseTypeGroup(typedGroups);
    if (!effectiveGroupDecision.group) {
      return this.buildOtherExpenseResult({
        document,
        status: effectiveGroupDecision.status,
        warnings,
        competence: dateRange.competence,
        details: {
          reason: effectiveGroupDecision.reason,
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          typeGroups: typedGroups.map((typeGroup) =>
            this.serializeTypeGroup(typeGroup),
          ),
        },
      });
    }

    const effectiveGroup = effectiveGroupDecision.group;

    if (remainingPercentage <= 0) {
      warnings.push(WARNING_NO_REMAINING_SHARE_FOR_TYPE);
      return this.buildOtherExpenseResult({
        document,
        status: STATUS_SKIPPED_NO_REMAINING_SHARE,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        details: {
          reason:
            "Percentual manual consome todo o rateio disponivel para outras despesas.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          typeGroups: typedGroups.map((typeGroup) =>
            this.serializeTypeGroup(typeGroup),
          ),
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          finalPercentageTotal: manualPercentageTotal,
        },
      });
    }

    const costCenterType = await this.prisma.costCenterType.findUnique({
      where: { id_costcentertype_vr: effectiveGroup.costCenterTypeVrId },
      include: { costCenterTypeItems: true },
    });

    if (!costCenterType) {
      return this.buildOtherExpenseResult({
        document,
        status: STATUS_SKIPPED_TYPE_CONFIG_NOT_FOUND,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        details: {
          reason:
            "Tipo de centro de custo do VRMaster nao encontrado no cadastro do PDT Connect.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        },
      });
    }

    if (!costCenterType.useParticipationCostCenter) {
      return this.buildOtherExpenseResult({
        document,
        status: STATUS_SKIPPED_TYPE_NOT_PARTICIPATION,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Tipo de centro de custo nao esta configurado para participacao por centro de custo.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
        },
      });
    }

    const participationItems = costCenterType.costCenterTypeItems.filter(
      (item) =>
        item.participation === true && item.costCenterId && item.storeId,
    );
    const ignoredItems = costCenterType.costCenterTypeItems.filter(
      (item) =>
        item.participation !== true || !item.costCenterId || !item.storeId,
    );

    if (ignoredItems.length) {
      warnings.push(WARNING_INVALID_PARTICIPATION_ITEM_IGNORED);
    }

    if (!participationItems.length) {
      return this.buildOtherExpenseResult({
        document,
        status: STATUS_SKIPPED_NO_PARTICIPATION_ITEMS,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Tipo de centro de custo nao possui itens validos marcados para participacao.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
          ignoredItems,
        },
      });
    }

    const salesBase = [];
    for (const item of participationItems) {
      const saleValue = await this.getSalesValueForItem({
        storeId: item.storeId,
        costCenterId: item.costCenterId,
        initialDate: dateRange.initialDate,
        finalDate: dateRange.finalDate,
        salesCache,
      });

      salesBase.push({
        costCenterTypeItemId: item.id,
        storeId: item.storeId,
        costCenterId: item.costCenterId,
        saleValue,
      });
    }

    const totalSaleValue = this.roundCurrency(
      salesBase.reduce((sum, item) => sum + item.saleValue, 0),
    );

    if (totalSaleValue <= 0) {
      return this.buildOtherExpenseResult({
        document,
        status: STATUS_SKIPPED_NO_SALES_BASE,
        warnings,
        competence: dateRange.competence,
        effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        effectiveCostCenterTypeId: costCenterType.id,
        details: {
          reason:
            "Base de venda zerada para os centros de custo e lojas configurados no tipo.",
          competence: dateRange,
          manualPercentageTotal,
          remainingPercentage,
          originalLines,
          selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
          costCenterType: this.serializeCostCenterType(costCenterType),
          salesBase,
          totalSaleValue,
        },
      });
    }

    const allocation = this.allocatePercentagesWithTwoDecimals(
      salesBase,
      remainingPercentage,
      totalSaleValue,
    );
    const suggestedLines = allocation.lines.map((line) => {
      const originalLine = effectiveGroup.lines.find(
        (item) =>
          item.costCenterId === line.costCenterId &&
          item.storeId === line.storeId,
      );

      return {
        originalLineId: originalLine?.id ?? null,
        costCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
        costCenterId: line.costCenterId,
        storeId: line.storeId,
        originalPercentage: originalLine?.percentage ?? null,
        suggestedPercentage: line.recalculatedPercentage,
        saleValue: line.saleValue,
        participation: line.participation,
        rawPercentage: line.rawPercentage,
        roundingResidue: line.roundingResidue,
        wouldCreateLine: !originalLine,
      };
    });

    const recalculatedPercentageTotal = this.roundPercentage2(
      suggestedLines.reduce((sum, line) => sum + line.suggestedPercentage, 0),
    );
    const finalPercentageTotal = this.roundPercentage2(
      manualPercentageTotal + recalculatedPercentageTotal,
    );
    const analysisCostCenterPreview = this.applyAnalysisFinalizationGate(
      this.buildDocumentAnalysisCostCenterPreview({
        source: "PAGAR_OUTRAS_DESPESAS",
        baseValue: document.totalValue,
        baseValueSource: "pagaroutrasdespesas.valor",
        originIds: { id_pagaroutrasdespesas: document.otherExpenseId },
        percentageLines: [
          ...this.buildManualPercentageLines(manualLines),
          ...suggestedLines.map((line) => ({
            source: "AUTOMATIC_RECALCULATED" as const,
            originalLineId: line.originalLineId,
            costCenterTypeVrId: line.costCenterTypeVrId,
            costCenterId: line.costCenterId,
            storeId: line.storeId,
            percentage: line.suggestedPercentage,
          })),
        ],
      }),
      "PAGAR_OUTRAS_DESPESAS",
      document.statusId,
    );

    return this.buildOtherExpenseResult({
      document,
      status: STATUS_PREVIEW_CALCULATED,
      warnings,
      competence: dateRange.competence,
      effectiveCostCenterTypeVrId: effectiveGroup.costCenterTypeVrId,
      effectiveCostCenterTypeId: costCenterType.id,
      details: {
        competence: dateRange,
        manualPercentageTotal,
        remainingPercentage,
        finalPercentageTotal,
        recalculatedPercentageTotal,
        rounding: allocation.rounding,
        originalLines,
        manualLines: manualLines.map((line) => this.serializeLine(line)),
        typeGroups: typedGroups.map((typeGroup) =>
          this.serializeTypeGroup(typeGroup),
        ),
        selectedTypeGroup: this.serializeTypeGroup(effectiveGroup),
        costCenterType: this.serializeCostCenterType(costCenterType),
        salesBase: {
          totalSaleValue,
          items: salesBase,
        },
        suggestedLines,
        analysisCostCenterPreview,
        decision:
          "Percentuais sugeridos calculados em dry-run para id_pagaroutrasdespesas; nenhum UPDATE foi executado no VRMaster.",
      },
    });
  }

  private async buildEntryAnalysisCostCenterPreviews(
    analyzedGroups: AnalyzedEntryTypeGroup[],
  ) {
    const previews = new Map<number, Record<string, any>>();
    if (!analyzedGroups.length) return previews;

    const groupsByNote = new Map<number, AnalyzedEntryTypeGroup[]>();
    for (const analyzedGroup of analyzedGroups) {
      const groups = groupsByNote.get(analyzedGroup.group.noteEntryId) ?? [];
      groups.push(analyzedGroup);
      groupsByNote.set(analyzedGroup.group.noteEntryId, groups);
    }

    const noteEntryIds = Array.from(groupsByNote.keys());
    const [baseRows, ignoredRows] = await Promise.all([
      this.fetchEntryItemTotalsForCostCenterTypes(noteEntryIds),
      this.fetchEntryItemTotalsIgnoredByCostCenter(noteEntryIds),
    ]);

    const baseByType = new Map<string, number>();
    for (const row of baseRows) {
      baseByType.set(
        this.entryTypeKey(
          Number(row.noteEntryId),
          this.toNumberOrNull(row.entryTypeId),
        ),
        this.toNumberOrNull(row.baseValue) ?? 0,
      );
    }

    const ignoredByNote = new Map<
      number,
      Array<{ entryTypeId: number | null; baseValue: number }>
    >();
    for (const row of ignoredRows) {
      const noteEntryId = Number(row.noteEntryId);
      const ignored = ignoredByNote.get(noteEntryId) ?? [];
      ignored.push({
        entryTypeId: this.toNumberOrNull(row.entryTypeId),
        baseValue: this.toNumberOrNull(row.baseValue) ?? 0,
      });
      ignoredByNote.set(noteEntryId, ignored);
    }

    for (const [noteEntryId, noteGroups] of groupsByNote.entries()) {
      const blockingGroups = noteGroups
        .filter(({ result }) => result.status !== STATUS_PREVIEW_CALCULATED)
        .map(({ group, result }) => ({
          entryTypeId: group.entryTypeId,
          status: result.status,
          reason: result.details?.reason ?? null,
        }));

      if (blockingGroups.length) {
        const preview = {
          status: ANALYSIS_STATUS_BLOCKED_BY_PERCENTAGE_PREVIEW,
          targetTable: "analisecentrocusto",
          scope: "NOTE_ENTRY_CONSOLIDATED",
          mode: "DRY_RUN",
          vrMasterWrites: false,
          reason:
            "Preview financeiro bloqueado porque ao menos um grupo percentual da notaentrada nao gerou resultado confiavel.",
          blockingGroups,
          ignoredEntryTypeBaseValues: ignoredByNote.get(noteEntryId) ?? [],
          suggestedAnalysisCostCenterLines: [],
        };
        previews.set(
          noteEntryId,
          this.applyAnalysisFinalizationGate(
            preview,
            "NOTA_ENTRADA",
            noteGroups[0]?.group.statusId ?? null,
          ),
        );
        continue;
      }

      const missingBaseGroups: Array<{ entryTypeId: number | null }> = [];
      const groupPreviews: Array<{
        entryTypeId: number | null;
        baseValue: number;
        preview: Record<string, any>;
      }> = [];

      for (const { group, result } of noteGroups) {
        const key = this.entryTypeKey(group.noteEntryId, group.entryTypeId);
        const baseValue = baseByType.get(key);
        if (baseValue === undefined) {
          missingBaseGroups.push({ entryTypeId: group.entryTypeId });
          continue;
        }

        groupPreviews.push({
          entryTypeId: group.entryTypeId,
          baseValue,
          preview: this.buildAnalysisCostCenterPreview({
            scope: "NOTE_ENTRY_TYPE_GROUP",
            baseValue,
            baseValueSource: "notaentradaitem.valortotal",
            originIds: { id_notaentrada: group.noteEntryId },
            percentageLines: this.extractEntryGroupPercentageLines(
              group,
              result.details,
            ),
            metadata: {
              entryTypeId: group.entryTypeId,
              sourcePercentagePreviewStatus: result.status,
            },
          }),
        });
      }

      if (
        missingBaseGroups.length ||
        groupPreviews.some(
          (groupPreview) =>
            groupPreview.preview.status !== ANALYSIS_STATUS_PREVIEW_CALCULATED,
        )
      ) {
        const preview = {
          status: ANALYSIS_STATUS_SKIPPED_MISSING_BASE_VALUE,
          targetTable: "analisecentrocusto",
          scope: "NOTE_ENTRY_CONSOLIDATED",
          mode: "DRY_RUN",
          vrMasterWrites: false,
          reason:
            "Nao foi encontrada base financeira confiavel em notaentradaitem.valortotal para todos os tipos de entrada com centro de custo.",
          missingBaseGroups,
          groupPreviews,
          ignoredEntryTypeBaseValues: ignoredByNote.get(noteEntryId) ?? [],
          suggestedAnalysisCostCenterLines: [],
        };
        previews.set(
          noteEntryId,
          this.applyAnalysisFinalizationGate(
            preview,
            "NOTA_ENTRADA",
            noteGroups[0]?.group.statusId ?? null,
          ),
        );
        continue;
      }

      const suggestedAnalysisCostCenterLines =
        this.consolidateEntryAnalysisCostCenterLines(groupPreviews);
      const entryTypeBaseValues = groupPreviews.map((groupPreview) => ({
        entryTypeId: groupPreview.entryTypeId,
        baseValue: groupPreview.baseValue,
        targetValue: groupPreview.preview.targetValue,
        percentageTotal: groupPreview.preview.percentageTotal,
      }));
      const totalEligibleBaseValue = this.roundCurrency(
        entryTypeBaseValues.reduce((sum, item) => sum + item.baseValue, 0),
      );
      const totalSuggestedValue = this.roundCurrency(
        suggestedAnalysisCostCenterLines.reduce(
          (sum, line) => sum + Number(line.valor ?? 0),
          0,
        ),
      );

      const preview = {
        status: ANALYSIS_STATUS_PREVIEW_CALCULATED,
        targetTable: "analisecentrocusto",
        scope: "NOTE_ENTRY_CONSOLIDATED",
        mode: "DRY_RUN",
        vrMasterWrites: false,
        baseValueSource: "notaentradaitem.valortotal",
        entryTypeBaseValues,
        ignoredEntryTypeBaseValues: ignoredByNote.get(noteEntryId) ?? [],
        totalEligibleBaseValue,
        totalSuggestedValue,
        groupPreviews,
        suggestedAnalysisCostCenterLines,
        decision:
          "Valores sugeridos para analisecentrocusto calculados por id_notaentrada/id_tipoentrada e consolidados por id_loja, id_tipocentrocusto, id_centrocusto e id_notaentrada; nenhum DML foi executado no VRMaster.",
      };

      previews.set(
        noteEntryId,
        this.applyAnalysisFinalizationGate(
          preview,
          "NOTA_ENTRADA",
          noteGroups[0]?.group.statusId ?? null,
        ),
      );
    }

    return previews;
  }

  private async buildEntryWritingCostCenterPreviews(
    analyzedGroups: AnalyzedEntryTypeGroup[],
  ) {
    const previews = new Map<number, Record<string, any>>();
    if (!analyzedGroups.length) return previews;

    const groupsByNote = new Map<number, AnalyzedEntryTypeGroup[]>();
    for (const analyzedGroup of analyzedGroups) {
      const groups = groupsByNote.get(analyzedGroup.group.noteEntryId) ?? [];
      groups.push(analyzedGroup);
      groupsByNote.set(analyzedGroup.group.noteEntryId, groups);
    }

    const noteEntryIds = Array.from(groupsByNote.keys());
    const [writingRows, ignoredWritingRows] = await Promise.all([
      this.fetchEntryWritingRowsForCostCenterTypes(noteEntryIds),
      this.fetchEntryWritingRowsIgnoredByCostCenter(noteEntryIds),
    ]);
    const existingRows = await this.fetchExistingEntryWritingCostCenterRows(
      Array.from(new Set(writingRows.map((row) => Number(row.writingId)))),
    );

    const writingsByNoteType = new Map<string, EntryWritingRow[]>();
    for (const row of writingRows) {
      const noteEntryId = Number(row.noteEntryId);
      const entryTypeId = this.toNumberOrNull(row.entryTypeId);
      const key = this.entryTypeKey(noteEntryId, entryTypeId);
      const items = writingsByNoteType.get(key) ?? [];
      items.push({
        noteEntryId,
        writingId: Number(row.writingId),
        entryTypeId,
        storeId: this.toNumberOrNull(row.storeId),
      });
      writingsByNoteType.set(key, items);
    }

    const ignoredWritingsByNote = new Map<number, EntryWritingRow[]>();
    for (const row of ignoredWritingRows) {
      const noteEntryId = Number(row.noteEntryId);
      const items = ignoredWritingsByNote.get(noteEntryId) ?? [];
      items.push({
        noteEntryId,
        writingId: Number(row.writingId),
        entryTypeId: this.toNumberOrNull(row.entryTypeId),
        storeId: this.toNumberOrNull(row.storeId),
      });
      ignoredWritingsByNote.set(noteEntryId, items);
    }

    const existingByKey = new Map<string, EntryWritingCostCenterRow>();
    for (const row of existingRows) {
      existingByKey.set(
        this.writingCostCenterKey(
          Number(row.writingId),
          this.toNumberOrNull(row.entryTypeId),
          this.toNumberOrNull(row.costCenterId),
          this.toNumberOrNull(row.storeId),
        ),
        {
          writingCostCenterId: Number(row.writingCostCenterId),
          writingId: Number(row.writingId),
          entryTypeId: this.toNumberOrNull(row.entryTypeId),
          costCenterId: this.toNumberOrNull(row.costCenterId),
          storeId: this.toNumberOrNull(row.storeId),
          percentage: row.percentage,
        },
      );
    }

    for (const [noteEntryId, noteGroups] of groupsByNote.entries()) {
      const blockingGroups = noteGroups
        .filter(({ result }) => result.status !== STATUS_PREVIEW_CALCULATED)
        .map(({ group, result }) => ({
          entryTypeId: group.entryTypeId,
          status: result.status,
          reason: result.details?.reason ?? null,
        }));

      if (blockingGroups.length) {
        previews.set(noteEntryId, {
          status: WRITING_STATUS_BLOCKED_BY_PERCENTAGE_PREVIEW,
          targetTable: "escritacentrocusto",
          mode: "DRY_RUN",
          vrMasterWrites: false,
          relationship: {
            noteEntryToWriting: "escrita.id_notaentrada = notaentrada.id",
            entryTypeAlignment:
              "escrita.id_tipoentrada IS NOT DISTINCT FROM notaentradacentrocusto.id_tipoentrada",
          },
          reason:
            "Preview de escritacentrocusto bloqueado porque ao menos um grupo percentual da notaentrada nao gerou resultado confiavel.",
          blockingGroups,
          ignoredWritings: ignoredWritingsByNote.get(noteEntryId) ?? [],
          suggestedEscritaCostCenterLines: [],
        });
        continue;
      }

      if (!this.isFinalized(noteGroups[0]?.group.statusId ?? null)) {
        previews.set(
          noteEntryId,
          this.buildWritingFinalizationBlockedPreview(
            noteEntryId,
            noteGroups[0]?.group.statusId ?? null,
          ),
        );
        continue;
      }

      const missingWritingGroups: Array<{ entryTypeId: number | null }> = [];
      const groupPreviews = [];

      for (const { group, result } of noteGroups) {
        const key = this.entryTypeKey(group.noteEntryId, group.entryTypeId);
        const writings = writingsByNoteType.get(key) ?? [];
        if (!writings.length) {
          missingWritingGroups.push({ entryTypeId: group.entryTypeId });
          continue;
        }

        const percentageLines = this.extractEntryGroupPercentageLines(
          group,
          result.details,
        );
        const validPercentageLines = percentageLines.filter(
          (line) =>
            line.percentage !== null && Number.isFinite(line.percentage),
        );
        if (!validPercentageLines.length) {
          groupPreviews.push({
            entryTypeId: group.entryTypeId,
            status: WRITING_STATUS_SKIPPED_NO_PERCENTAGE_LINES,
            reason:
              "Nenhuma linha percentual valida do preview de notaentradacentrocusto para projetar escritacentrocusto.",
            writings,
            suggestedLines: [],
          });
          continue;
        }

        const writingPreviews = writings.map((writing) =>
          this.buildWritingCostCenterPreviewForEntryType({
            group,
            writing,
            percentageLines: validPercentageLines,
            existingByKey,
          }),
        );

        groupPreviews.push({
          entryTypeId: group.entryTypeId,
          status: WRITING_STATUS_PREVIEW_CALCULATED,
          percentageTotal: this.roundPercentage2(
            validPercentageLines.reduce(
              (sum, line) => sum + (line.percentage ?? 0),
              0,
            ),
          ),
          writings: writingPreviews,
        });
      }

      if (missingWritingGroups.length) {
        previews.set(noteEntryId, {
          status: WRITING_STATUS_SKIPPED_MISSING_WRITING,
          targetTable: "escritacentrocusto",
          mode: "DRY_RUN",
          vrMasterWrites: false,
          relationship: {
            noteEntryToWriting: "escrita.id_notaentrada = notaentrada.id",
            entryTypeAlignment:
              "escrita.id_tipoentrada IS NOT DISTINCT FROM notaentradacentrocusto.id_tipoentrada",
          },
          reason:
            "Nao foi encontrada escrita vinculada para todos os tipos de entrada com centro de custo.",
          missingWritingGroups,
          groupPreviews,
          ignoredWritings: ignoredWritingsByNote.get(noteEntryId) ?? [],
          suggestedEscritaCostCenterLines: [],
        });
        continue;
      }

      const suggestedEscritaCostCenterLines = groupPreviews.flatMap(
        (groupPreview) =>
          Array.isArray(groupPreview.writings)
            ? groupPreview.writings.flatMap(
                (writingPreview) => writingPreview.suggestedLines,
              )
            : [],
      );

      previews.set(noteEntryId, {
        status: WRITING_STATUS_PREVIEW_CALCULATED,
        targetTable: "escritacentrocusto",
        mode: "DRY_RUN",
        vrMasterWrites: false,
        relationship: {
          noteEntryToWriting: "escrita.id_notaentrada = notaentrada.id",
          entryTypeAlignment:
            "escrita.id_tipoentrada IS NOT DISTINCT FROM notaentradacentrocusto.id_tipoentrada",
        },
        groupPreviews,
        ignoredWritings: ignoredWritingsByNote.get(noteEntryId) ?? [],
        suggestedEscritaCostCenterLines,
        decision:
          "Percentuais sugeridos para escritacentrocusto derivados do preview de notaentradacentrocusto e projetados por id_escrita/id_tipoentrada/id_centrocusto/id_loja; nenhum DML foi executado no VRMaster.",
      });
    }

    return previews;
  }

  private buildWritingCostCenterPreviewForEntryType({
    group,
    writing,
    percentageLines,
    existingByKey,
  }: {
    group: EntryTypeGroup;
    writing: EntryWritingRow;
    percentageLines: AnalysisPercentageLine[];
    existingByKey: Map<string, EntryWritingCostCenterRow>;
  }) {
    const ignoredPercentageLines = [];
    const suggestedLines = [];

    for (const line of percentageLines) {
      const storeId = line.storeId ?? writing.storeId;
      if (storeId === null) {
        ignoredPercentageLines.push({
          source: line.source,
          originalLineId: line.originalLineId,
          costCenterId: line.costCenterId,
          percentage: line.percentage,
          reason:
            "Linha sem id_loja na origem percentual e sem id_loja na escrita vinculada.",
        });
        continue;
      }

      const existing = existingByKey.get(
        this.writingCostCenterKey(
          writing.writingId,
          group.entryTypeId,
          line.costCenterId,
          storeId,
        ),
      );

      suggestedLines.push({
        id_escrita: writing.writingId,
        id_tipoentrada: group.entryTypeId,
        id_centrocusto: line.costCenterId,
        id_loja: storeId,
        percentual: this.roundPercentage2(line.percentage ?? 0),
        percentual_origem: line.percentage,
        origem_percentual: "notaentradacentrocusto_preview",
        origem_linha_percentual: line.source,
        id_linha_rateio_origem: line.originalLineId,
        existingEscritaCostCenterId: existing?.writingCostCenterId ?? null,
        existingPercentage: this.toNumberOrNull(existing?.percentage),
        suggestedAction: existing ? "WOULD_UPDATE" : "WOULD_CREATE",
        metadata: line.metadata ?? null,
      });
    }

    return {
      id_escrita: writing.writingId,
      id_tipoentrada: group.entryTypeId,
      id_notaentrada: group.noteEntryId,
      id_loja_escrita: writing.storeId,
      status: suggestedLines.length
        ? WRITING_STATUS_PREVIEW_CALCULATED
        : WRITING_STATUS_SKIPPED_NO_PERCENTAGE_LINES,
      percentageTotal: this.roundPercentage2(
        suggestedLines.reduce(
          (sum, line) => sum + Number(line.percentual ?? 0),
          0,
        ),
      ),
      ignoredPercentageLines,
      suggestedLines,
    };
  }

  private buildDocumentAnalysisCostCenterPreview({
    source,
    baseValue,
    baseValueSource,
    originIds,
    percentageLines,
  }: {
    source: "NOTA_DESPESA" | "PAGAR_OUTRAS_DESPESAS";
    baseValue: number | null;
    baseValueSource: string;
    originIds: Record<string, number | null>;
    percentageLines: AnalysisPercentageLine[];
  }) {
    return this.buildAnalysisCostCenterPreview({
      scope: "DOCUMENT",
      baseValue,
      baseValueSource,
      originIds,
      percentageLines,
      metadata: {
        documentSource: source,
      },
    });
  }

  private applyAnalysisFinalizationGate(
    preview: Record<string, any>,
    source: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    statusId: number | null,
  ) {
    const finalization = this.buildFinalizationMaterializationInfo(
      source,
      "analisecentrocusto",
      statusId,
    );
    if (finalization.canWriteDerivedTables) {
      return {
        ...preview,
        materializationEligibility: finalization,
      };
    }

    if (preview.status !== ANALYSIS_STATUS_PREVIEW_CALCULATED) {
      return {
        ...preview,
        materializationEligibility: finalization,
      };
    }

    return {
      ...preview,
      status: ANALYSIS_STATUS_SKIPPED_NOT_FINALIZED,
      calculatedPreviewStatus: preview.status,
      materializationEligibility: finalization,
      reason: finalization.reason,
      decision:
        "Preview financeiro calculado para auditoria, mas a escrita real em analisecentrocusto fica bloqueada enquanto o lancamento nao estiver finalizado.",
    };
  }

  private buildWritingFinalizationBlockedPreview(
    noteEntryId: number,
    statusId: number | null,
  ) {
    const finalization = this.buildFinalizationMaterializationInfo(
      "NOTA_ENTRADA",
      "escritacentrocusto",
      statusId,
    );
    return {
      status: WRITING_STATUS_SKIPPED_NOT_FINALIZED,
      targetTable: "escritacentrocusto",
      mode: "DRY_RUN",
      vrMasterWrites: false,
      noteEntryId,
      materializationEligibility: finalization,
      relationship: {
        noteEntryToWriting: "escrita.id_notaentrada = notaentrada.id",
        entryTypeAlignment:
          "escrita.id_tipoentrada IS NOT DISTINCT FROM notaentradacentrocusto.id_tipoentrada",
      },
      reason: finalization.reason,
      suggestedEscritaCostCenterLines: [],
      decision:
        "Preview de escritacentrocusto bloqueado porque a notaentrada ainda nao esta finalizada; o rateio principal pode continuar sendo recalculado.",
    };
  }

  private buildFinalizationMaterializationInfo(
    source: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    targetTable: "analisecentrocusto" | "escritacentrocusto",
    statusId: number | null,
  ) {
    const finalized = this.isFinalized(statusId);
    const statusFieldBySource = {
      NOTA_DESPESA: "id_situacaonotadespesa",
      NOTA_ENTRADA: "id_situacaonotaentrada",
      PAGAR_OUTRAS_DESPESAS: "id_situacaopagaroutrasdespesas",
    } as const;

    return {
      targetTable,
      source,
      statusField: statusFieldBySource[source],
      statusId,
      finalized,
      canWriteDerivedTables: finalized,
      reason: finalized
        ? "Lancamento finalizado; tabela derivada liberada para apply real."
        : `${statusFieldBySource[source]} diferente de ${FINALIZED_STATUS_ID}; escrita real em ${targetTable} bloqueada para evitar duplicidade quando o VRMaster finalizar o lancamento.`,
    };
  }

  private buildAnalysisCostCenterPreview({
    scope,
    baseValue,
    baseValueSource,
    originIds,
    percentageLines,
    metadata,
  }: {
    scope: "DOCUMENT" | "NOTE_ENTRY_TYPE_GROUP";
    baseValue: number | null;
    baseValueSource: string;
    originIds: Record<string, number | null>;
    percentageLines: AnalysisPercentageLine[];
    metadata?: Record<string, any>;
  }) {
    if (baseValue === null || !Number.isFinite(baseValue)) {
      return {
        status: ANALYSIS_STATUS_SKIPPED_MISSING_BASE_VALUE,
        targetTable: "analisecentrocusto",
        scope,
        mode: "DRY_RUN",
        vrMasterWrites: false,
        baseValueSource,
        baseValue,
        metadata: metadata ?? null,
        reason:
          "Base financeira ausente para calcular o valor sugerido da analisecentrocusto.",
        suggestedAnalysisCostCenterLines: [],
      };
    }

    const validLines = percentageLines.filter(
      (line) => line.percentage !== null && Number.isFinite(line.percentage),
    );
    const ignoredPercentageLines = percentageLines
      .filter(
        (line) => line.percentage === null || !Number.isFinite(line.percentage),
      )
      .map((line) => ({
        source: line.source,
        originalLineId: line.originalLineId,
        costCenterTypeVrId: line.costCenterTypeVrId,
        costCenterId: line.costCenterId,
        storeId: line.storeId,
        percentage: line.percentage,
        metadata: line.metadata ?? null,
      }));

    if (!validLines.length) {
      return {
        status: ANALYSIS_STATUS_SKIPPED_NO_PERCENTAGE_LINES,
        targetTable: "analisecentrocusto",
        scope,
        mode: "DRY_RUN",
        vrMasterWrites: false,
        baseValueSource,
        baseValue,
        metadata: metadata ?? null,
        reason:
          "Nenhuma linha percentual valida disponivel para calcular analisecentrocusto.",
        ignoredPercentageLines,
        suggestedAnalysisCostCenterLines: [],
      };
    }

    const allocation = this.allocateAnalysisCostCenterValues(
      validLines,
      baseValue,
    );
    const suggestedAnalysisCostCenterLines = allocation.lines.map((line) => ({
      id_loja: line.storeId,
      id_tipocentrocusto: line.costCenterTypeVrId,
      id_centrocusto: line.costCenterId,
      ...originIds,
      valor: line.suggestedValue,
      percentual_usado: line.percentage,
      valor_bruto: line.rawValue,
      residuo_arredondamento: line.roundingResidue,
      origem_linha_percentual: line.source,
      id_linha_rateio_origem: line.originalLineId,
      metadata: line.metadata ?? null,
    }));

    return {
      status: ANALYSIS_STATUS_PREVIEW_CALCULATED,
      targetTable: "analisecentrocusto",
      scope,
      mode: "DRY_RUN",
      vrMasterWrites: false,
      baseValueSource,
      baseValue,
      metadata: metadata ?? null,
      percentageTotal: allocation.percentageTotal,
      targetValue: allocation.targetValue,
      totalSuggestedValue: this.roundCurrency(
        suggestedAnalysisCostCenterLines.reduce(
          (sum, line) => sum + Number(line.valor ?? 0),
          0,
        ),
      ),
      rounding: allocation.rounding,
      ignoredPercentageLines,
      suggestedAnalysisCostCenterLines,
    };
  }

  private allocateAnalysisCostCenterValues(
    lines: AnalysisPercentageLine[],
    baseValue: number,
  ) {
    const percentageTotal = this.roundPercentage(
      lines.reduce((sum, line) => sum + (line.percentage ?? 0), 0),
    );
    const allocatedLines = lines.map((line) => {
      const rawValue = (baseValue * (line.percentage ?? 0)) / 100;
      const suggestedValue = this.roundCurrency(rawValue);

      return {
        ...line,
        rawValue: this.roundPercentage(rawValue),
        suggestedValue,
        roundingResidue: this.roundPercentage(rawValue - suggestedValue),
      };
    });

    const roundedTotal = this.roundCurrency(
      allocatedLines.reduce((sum, line) => sum + line.suggestedValue, 0),
    );
    const targetValue = this.roundCurrency((baseValue * percentageTotal) / 100);
    const diff = this.roundCurrency(targetValue - roundedTotal);
    let adjustmentTarget: {
      costCenterId: number | null;
      storeId: number | null;
      originalLineId: number | null;
    } | null = null;

    if (diff !== 0 && allocatedLines.length > 0) {
      const target = [...allocatedLines].sort((a, b) => {
        const residueDiff =
          Math.abs(b.roundingResidue) - Math.abs(a.roundingResidue);
        if (residueDiff !== 0) return residueDiff;
        const rawDiff = b.rawValue - a.rawValue;
        if (rawDiff !== 0) return rawDiff;
        return (a.costCenterId ?? 0) - (b.costCenterId ?? 0);
      })[0];

      target.suggestedValue = this.roundCurrency(target.suggestedValue + diff);
      adjustmentTarget = {
        costCenterId: target.costCenterId,
        storeId: target.storeId,
        originalLineId: target.originalLineId,
      };
    }

    return {
      percentageTotal,
      targetValue,
      lines: allocatedLines,
      rounding: {
        scale: 2,
        roundedTotalBeforeAdjustment: roundedTotal,
        adjustmentApplied: diff,
        adjustmentTarget,
        finalTotal: this.roundCurrency(
          allocatedLines.reduce((sum, line) => sum + line.suggestedValue, 0),
        ),
      },
    };
  }

  private buildManualPercentageLines(
    lines: ExpenseCostCenterLine[],
  ): AnalysisPercentageLine[] {
    return lines.map((line) => ({
      source: "MANUAL_PRESERVED",
      originalLineId: line.id,
      costCenterTypeVrId: line.costCenterTypeVrId,
      costCenterId: line.costCenterId,
      storeId: line.storeId,
      percentage: line.percentage,
    }));
  }

  private extractEntryGroupPercentageLines(
    group: EntryTypeGroup,
    details: Record<string, any>,
  ): AnalysisPercentageLine[] {
    const manualLines = group.lines.filter(
      (line) => line.costCenterTypeVrId === null,
    );
    const suggestedLines = Array.isArray(details?.suggestedLines)
      ? details.suggestedLines
      : [];

    return [
      ...this.buildManualPercentageLines(manualLines),
      ...suggestedLines.map((line) => ({
        source: "AUTOMATIC_RECALCULATED" as const,
        originalLineId: this.toNumberOrNull(line.originalLineId),
        costCenterTypeVrId: this.toNumberOrNull(line.costCenterTypeVrId),
        costCenterId: this.toNumberOrNull(line.costCenterId),
        storeId: this.toNumberOrNull(line.storeId),
        percentage: this.toNumberOrNull(line.suggestedPercentage),
        metadata: {
          entryTypeId: group.entryTypeId,
        },
      })),
    ];
  }

  private consolidateEntryAnalysisCostCenterLines(
    groupPreviews: Array<{
      entryTypeId: number | null;
      baseValue: number;
      preview: Record<string, any>;
    }>,
  ) {
    const consolidated = new Map<string, Record<string, any>>();

    for (const groupPreview of groupPreviews) {
      const lines = Array.isArray(
        groupPreview.preview.suggestedAnalysisCostCenterLines,
      )
        ? groupPreview.preview.suggestedAnalysisCostCenterLines
        : [];

      for (const line of lines) {
        const key = [
          line.id_loja ?? "NULL",
          line.id_tipocentrocusto ?? "NULL",
          line.id_centrocusto ?? "NULL",
          line.id_notaentrada ?? "NULL",
        ].join("|");
        const existing = consolidated.get(key) ?? {
          id_loja: line.id_loja ?? null,
          id_tipocentrocusto: line.id_tipocentrocusto ?? null,
          id_centrocusto: line.id_centrocusto ?? null,
          id_notaentrada: line.id_notaentrada ?? null,
          valor: 0,
          entryTypeContributions: [],
        };

        existing.valor = this.roundCurrency(
          Number(existing.valor ?? 0) + Number(line.valor ?? 0),
        );
        existing.entryTypeContributions.push({
          entryTypeId: groupPreview.entryTypeId,
          baseValue: groupPreview.baseValue,
          valor: line.valor,
          percentual_usado: line.percentual_usado,
          valor_bruto: line.valor_bruto,
          origem_linha_percentual: line.origem_linha_percentual,
          id_linha_rateio_origem: line.id_linha_rateio_origem,
        });
        consolidated.set(key, existing);
      }
    }

    return Array.from(consolidated.values());
  }

  private entryTypeKey(noteEntryId: number, entryTypeId: number | null) {
    return `${noteEntryId}|${entryTypeId ?? "NULL"}`;
  }

  private writingCostCenterKey(
    writingId: number,
    entryTypeId: number | null,
    costCenterId: number | null,
    storeId: number | null,
  ) {
    return [
      writingId,
      entryTypeId ?? "NULL",
      costCenterId ?? "NULL",
      storeId ?? "NULL",
    ].join("|");
  }

  private groupTypeLines(lines: ExpenseCostCenterLine[]): TypeGroup[] {
    const groups = new Map<number, ExpenseCostCenterLine[]>();

    for (const line of lines) {
      if (line.costCenterTypeVrId === null) continue;
      const groupLines = groups.get(line.costCenterTypeVrId) ?? [];
      groupLines.push(line);
      groups.set(line.costCenterTypeVrId, groupLines);
    }

    return Array.from(groups.entries()).map(
      ([costCenterTypeVrId, groupLines]) => {
        const nullPercentageCount = groupLines.filter(
          (line) => line.percentage === null,
        ).length;
        const definedPercentageCount = groupLines.length - nullPercentageCount;
        const percentageTotal = this.roundPercentage(
          groupLines.reduce((sum, line) => sum + (line.percentage ?? 0), 0),
        );

        return {
          costCenterTypeVrId,
          lines: groupLines,
          nullPercentageCount,
          definedPercentageCount,
          percentageTotal,
          isComplete: nullPercentageCount === 0,
        };
      },
    );
  }

  private selectEffectiveTypeGroup(
    typedGroups: TypeGroup[],
    warnings: string[],
  ) {
    if (!typedGroups.length) {
      return {
        group: null,
        status: STATUS_CONFLICT_NO_CONSISTENT_TYPE_GROUP,
        reason: "Nota elegivel sem grupo tipado carregado para analise.",
      };
    }

    const completeGroups = typedGroups.filter((group) => group.isComplete);

    if (completeGroups.length > 1) {
      return {
        group: null,
        status: STATUS_CONFLICT_MULTIPLE_TYPES,
        reason:
          "Mais de um id_tipocentrocusto completo foi encontrado na mesma nota.",
      };
    }

    if (completeGroups.length === 1) {
      if (typedGroups.length > 1) {
        warnings.push(WARNING_IGNORED_INCOMPLETE_TYPE_GROUP);
      }

      return {
        group: completeGroups[0],
        status: STATUS_PREVIEW_CALCULATED,
        reason:
          "Grupo completo selecionado; grupos incompletos foram ignorados quando existiam.",
      };
    }

    if (typedGroups.length === 1) {
      return {
        group: typedGroups[0],
        status: STATUS_PREVIEW_CALCULATED,
        reason:
          "Unico grupo tipado selecionado mesmo com percentuais nulos, para permitir preview sobre percentual restante.",
      };
    }

    return {
      group: null,
      status: STATUS_CONFLICT_NO_CONSISTENT_TYPE_GROUP,
      reason:
        "Foram encontrados multiplos tipos incompletos e nenhum grupo consistente para escolha segura.",
    };
  }

  private selectEffectiveEntryTypeGroup(typedGroups: TypeGroup[]) {
    if (!typedGroups.length) {
      return {
        group: null,
        status: STATUS_CONFLICT_NO_CONSISTENT_TYPE_GROUP,
        reason:
          "Grupo de notaentrada elegivel sem id_tipocentrocusto carregado para analise.",
      };
    }

    if (typedGroups.length > 1) {
      return {
        group: null,
        status: STATUS_CONFLICT_MULTIPLE_TYPES_SAME_ENTRY_TYPE,
        reason:
          "Mais de um id_tipocentrocusto foi encontrado no mesmo par id_notaentrada/id_tipoentrada.",
      };
    }

    return {
      group: typedGroups[0],
      status: STATUS_PREVIEW_CALCULATED,
      reason:
        "Unico id_tipocentrocusto selecionado para recalculo do grupo, mesmo que os percentuais originais estejam nulos.",
    };
  }

  private selectEffectiveOtherExpenseTypeGroup(typedGroups: TypeGroup[]) {
    if (!typedGroups.length) {
      return {
        group: null,
        status: STATUS_CONFLICT_NO_CONSISTENT_TYPE_GROUP,
        reason:
          "Outras despesas elegivel sem id_tipocentrocusto carregado para analise.",
      };
    }

    if (typedGroups.length > 1) {
      return {
        group: null,
        status: STATUS_CONFLICT_MULTIPLE_TYPES,
        reason:
          "Mais de um id_tipocentrocusto foi encontrado na mesma outras despesas.",
      };
    }

    return {
      group: typedGroups[0],
      status: STATUS_PREVIEW_CALCULATED,
      reason:
        "Unico id_tipocentrocusto selecionado para recalculo de outras despesas, mesmo que os percentuais originais estejam nulos.",
    };
  }

  private allocatePercentagesWithTwoDecimals(
    salesBase: Array<{
      costCenterTypeItemId: number;
      storeId: number;
      costCenterId: number;
      saleValue: number;
    }>,
    remainingPercentage: number,
    totalSaleValue: number,
  ) {
    const lines = salesBase.map((base) => {
      const participation = base.saleValue / totalSaleValue;
      const rawPercentage = remainingPercentage * participation;
      const recalculatedPercentage = this.roundPercentage2(rawPercentage);

      return {
        ...base,
        participation: this.roundRatio(participation),
        rawPercentage: this.roundPercentage(rawPercentage),
        recalculatedPercentage,
        roundingResidue: this.roundPercentage(
          rawPercentage - recalculatedPercentage,
        ),
      };
    });

    const roundedTotal = this.roundPercentage2(
      lines.reduce((sum, line) => sum + line.recalculatedPercentage, 0),
    );
    const diff = this.roundPercentage2(remainingPercentage - roundedTotal);
    let adjustmentTarget: { costCenterId: number; storeId: number } | null =
      null;

    if (diff !== 0 && lines.length > 0) {
      const target = [...lines].sort((a, b) => {
        const aResiduePriority =
          diff > 0 ? a.roundingResidue : -a.roundingResidue;
        const bResiduePriority =
          diff > 0 ? b.roundingResidue : -b.roundingResidue;
        const residueDiff = bResiduePriority - aResiduePriority;
        if (residueDiff !== 0) return residueDiff;
        const saleDiff = b.saleValue - a.saleValue;
        if (saleDiff !== 0) return saleDiff;
        return a.costCenterId - b.costCenterId;
      })[0];

      target.recalculatedPercentage = this.roundPercentage2(
        target.recalculatedPercentage + diff,
      );
      adjustmentTarget = {
        costCenterId: target.costCenterId,
        storeId: target.storeId,
      };
    }

    return {
      lines,
      rounding: {
        scale: 2,
        roundedTotalBeforeAdjustment: roundedTotal,
        adjustmentApplied: diff,
        adjustmentTarget,
        finalAutomaticTotal: this.roundPercentage2(
          lines.reduce((sum, line) => sum + line.recalculatedPercentage, 0),
        ),
      },
    };
  }

  private async getSalesValueForItem({
    storeId,
    costCenterId,
    initialDate,
    finalDate,
    salesCache,
  }: {
    storeId: number;
    costCenterId: number;
    initialDate: string;
    finalDate: string;
    salesCache: SalesCache;
  }) {
    const key = `${initialDate}|${finalDate}|${storeId}|${costCenterId}`;
    let pending = salesCache.get(key);

    if (!pending) {
      pending = this.loadSalesValueForItem(
        storeId,
        costCenterId,
        initialDate,
        finalDate,
      );
      salesCache.set(key, pending);
    }

    return pending;
  }

  private async loadSalesValueForItem(
    storeId: number,
    costCenterId: number,
    initialDate: string,
    finalDate: string,
  ) {
    const rows = await this.costCenterSales.getCostCenterSales({
      storeId: [storeId],
      costCenterId: [costCenterId],
      initialDate,
      finalDate,
    });

    return this.roundCurrency(
      rows
        .filter((row) => Number(row.costCenterId) === costCenterId)
        .reduce((sum, row) => sum + Number(row.saleValue ?? 0), 0),
    );
  }

  private buildBlockedAnalysisCostCenterPreview(
    status: string,
    reason: string | null,
  ) {
    if (status === STATUS_PREVIEW_CALCULATED) {
      return null;
    }

    return {
      status: ANALYSIS_STATUS_BLOCKED_BY_PERCENTAGE_PREVIEW,
      targetTable: "analisecentrocusto",
      mode: "DRY_RUN",
      vrMasterWrites: false,
      sourcePercentagePreviewStatus: status,
      reason:
        reason ??
        "Preview financeiro bloqueado porque o preview percentual da origem nao gerou resultado confiavel.",
      suggestedAnalysisCostCenterLines: [],
    };
  }

  private buildResult({
    note,
    status,
    warnings,
    details,
    competence,
    effectiveCostCenterTypeVrId,
    effectiveCostCenterTypeId,
  }: {
    note: ExpenseNote;
    status: string;
    warnings: string[];
    details: Record<string, any>;
    competence?: string;
    effectiveCostCenterTypeVrId?: number | null;
    effectiveCostCenterTypeId?: number | null;
  }) {
    const analysisCostCenterPreview =
      details.analysisCostCenterPreview ??
      this.buildBlockedAnalysisCostCenterPreview(
        status,
        details.reason ?? null,
      );

    return {
      status,
      warnings,
      competence:
        competence ??
        this.getCompetenceDateRange(note.entryDate)?.competence ??
        "UNKNOWN",
      effectiveCostCenterTypeVrId: effectiveCostCenterTypeVrId ?? null,
      effectiveCostCenterTypeId: effectiveCostCenterTypeId ?? null,
      details: {
        note: {
          id: note.id,
          storeId: note.storeId,
          statusId: note.statusId,
          finalized: this.isFinalized(note.statusId),
          supplierId: note.supplierId,
          supplierName: note.supplierName,
          noteNumber: note.noteNumber,
          entryDate: this.toYmdOrNull(note.entryDate),
          totalValue: note.totalValue,
        },
        mode: "DRY_RUN",
        vrMasterWrites: false,
        warnings,
        ...details,
        analysisCostCenterPreview: analysisCostCenterPreview
          ? this.applyAnalysisFinalizationGate(
              analysisCostCenterPreview,
              "NOTA_DESPESA",
              note.statusId,
            )
          : analysisCostCenterPreview,
      },
    };
  }

  private buildEntryResult({
    group,
    status,
    warnings,
    details,
    competence,
    effectiveCostCenterTypeVrId,
    effectiveCostCenterTypeId,
  }: {
    group: EntryTypeGroup;
    status: string;
    warnings: string[];
    details: Record<string, any>;
    competence?: string;
    effectiveCostCenterTypeVrId?: number | null;
    effectiveCostCenterTypeId?: number | null;
  }) {
    const analysisCostCenterPreview =
      details.analysisCostCenterPreview ??
      this.buildBlockedAnalysisCostCenterPreview(
        status,
        details.reason ?? null,
      );

    return {
      status,
      warnings,
      competence:
        competence ??
        this.getCompetenceDateRange(group.entryDate)?.competence ??
        "UNKNOWN",
      effectiveCostCenterTypeVrId: effectiveCostCenterTypeVrId ?? null,
      effectiveCostCenterTypeId: effectiveCostCenterTypeId ?? null,
      details: {
        noteEntry: {
          id: group.noteEntryId,
          entryTypeId: group.entryTypeId,
          storeId: group.storeId,
          statusId: group.statusId,
          finalized: this.isFinalized(group.statusId),
          supplierId: group.supplierId,
          supplierName: group.supplierName,
          noteNumber: group.noteNumber,
          entryDate: this.toYmdOrNull(group.entryDate),
          totalValue: group.totalValue,
        },
        recalculationUnit: {
          noteEntryId: group.noteEntryId,
          entryTypeId: group.entryTypeId,
        },
        mode: "DRY_RUN",
        vrMasterWrites: false,
        warnings,
        ...details,
        analysisCostCenterPreview: analysisCostCenterPreview
          ? this.applyAnalysisFinalizationGate(
              analysisCostCenterPreview,
              "NOTA_ENTRADA",
              group.statusId,
            )
          : analysisCostCenterPreview,
      },
    };
  }

  private buildOtherExpenseResult({
    document,
    status,
    warnings,
    details,
    competence,
    effectiveCostCenterTypeVrId,
    effectiveCostCenterTypeId,
  }: {
    document: OtherExpenseDocument;
    status: string;
    warnings: string[];
    details: Record<string, any>;
    competence?: string;
    effectiveCostCenterTypeVrId?: number | null;
    effectiveCostCenterTypeId?: number | null;
  }) {
    const analysisCostCenterPreview =
      details.analysisCostCenterPreview ??
      this.buildBlockedAnalysisCostCenterPreview(
        status,
        details.reason ?? null,
      );

    return {
      status,
      warnings,
      competence:
        competence ??
        this.getCompetenceDateRange(document.entryDate)?.competence ??
        "UNKNOWN",
      effectiveCostCenterTypeVrId: effectiveCostCenterTypeVrId ?? null,
      effectiveCostCenterTypeId: effectiveCostCenterTypeId ?? null,
      details: {
        otherExpense: {
          id: document.otherExpenseId,
          entryTypeId: document.entryTypeId,
          storeId: document.storeId,
          statusId: document.statusId,
          finalized: this.isFinalized(document.statusId),
          supplierId: document.supplierId,
          supplierName: document.supplierName,
          documentNumber: document.documentNumber,
          entryDate: this.toYmdOrNull(document.entryDate),
          totalValue: document.totalValue,
        },
        recalculationUnit: {
          otherExpenseId: document.otherExpenseId,
        },
        mode: "DRY_RUN",
        vrMasterWrites: false,
        warnings,
        ...details,
        analysisCostCenterPreview: analysisCostCenterPreview
          ? this.applyAnalysisFinalizationGate(
              analysisCostCenterPreview,
              "PAGAR_OUTRAS_DESPESAS",
              document.statusId,
            )
          : analysisCostCenterPreview,
      },
    };
  }

  private createEmptySummary(
    previewRunId: number,
    startedAt: Date,
    period: PreviewPeriod,
    documentSource: "NOTA_DESPESA" | "NOTA_ENTRADA" | "PAGAR_OUTRAS_DESPESAS",
    context?: CodeJobExecutionContext,
  ) {
    return {
      previewRunId,
      codeJobRunId: context?.codeJobRunId ?? null,
      source: context?.source ?? "JOB",
      reason: context?.reason ?? null,
      documentSource,
      requestedParams: context?.params ?? null,
      processedPeriod: period,
      mode: "DRY_RUN",
      vrMasterWrites: false,
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      sourceRows: 0,
      eligibleNotes: 0,
      eligibleGroups: 0,
      calculatedNotes: 0,
      conflictNotes: 0,
      skippedNotes: 0,
      warningNotes: 0,
      byStatus: {} as Record<string, number>,
    };
  }

  private applySummary(
    summary: ReturnType<typeof this.createEmptySummary>,
    status: string,
    warnings: string[],
  ) {
    summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1;

    if (status === STATUS_PREVIEW_CALCULATED) {
      summary.calculatedNotes += 1;
    } else if (status.startsWith("CONFLICT_")) {
      summary.conflictNotes += 1;
    } else {
      summary.skippedNotes += 1;
    }

    if (warnings.length > 0) {
      summary.warningNotes += 1;
    }
  }

  private createEmptyConsolidatedSummary(
    startedAt: Date,
    period: PreviewPeriod,
    sources: CostCenterApportionmentSource[],
    mode: "DRY_RUN" | "APPLY",
    context?: CodeJobExecutionContext,
  ) {
    return {
      codeJobRunId: context?.codeJobRunId ?? null,
      source: context?.source ?? "JOB",
      reason: context?.reason ?? null,
      requestedParams: context?.params ?? null,
      processedPeriod: period,
      mode,
      selectedSources: sources,
      defaultSourcesApplied: !this.hasExplicitSources(context?.params),
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      bySource: {} as Partial<Record<CostCenterApportionmentSource, any>>,
      totals: {} as Record<string, any>,
    };
  }

  private aggregateConsolidatedSourceTotals(
    bySource: Partial<Record<CostCenterApportionmentSource, any>>,
  ) {
    const totals = {
      sourceRows: 0,
      eligibleNotes: 0,
      eligibleGroups: 0,
      calculatedNotes: 0,
      conflictNotes: 0,
      skippedNotes: 0,
      warningNotes: 0,
      appliedGroups: 0,
      skippedGroups: 0,
      conflictGroups: 0,
      failedGroups: 0,
      failedSources: 0,
      byStatus: {} as Record<string, number>,
      byDecision: {} as Record<string, number>,
      byTable: {} as Record<string, MutationSummary>,
    };

    for (const result of Object.values(bySource)) {
      if (!result) continue;
      if (result.status === "FAILED") {
        totals.failedSources += 1;
        continue;
      }

      for (const key of [
        "sourceRows",
        "eligibleNotes",
        "eligibleGroups",
        "calculatedNotes",
        "conflictNotes",
        "skippedNotes",
        "warningNotes",
        "appliedGroups",
        "skippedGroups",
        "conflictGroups",
        "failedGroups",
      ] as const) {
        totals[key] += Number(result[key] ?? 0);
      }

      for (const [status, count] of Object.entries(result.byStatus ?? {})) {
        totals.byStatus[status] =
          (totals.byStatus[status] ?? 0) + Number(count ?? 0);
      }
      for (const [decision, count] of Object.entries(result.byDecision ?? {})) {
        totals.byDecision[decision] =
          (totals.byDecision[decision] ?? 0) + Number(count ?? 0);
      }
      for (const [tableName, tableSummary] of Object.entries(
        result.byTable ?? {},
      ) as Array<[string, MutationSummary]>) {
        const target = totals.byTable[tableName] ?? this.emptyMutationSummary();
        this.addMutationSummary(target, tableSummary);
        totals.byTable[tableName] = target;
      }
    }

    return totals;
  }

  private resolveExecutionPeriod(
    params?: Record<string, unknown>,
  ): PreviewPeriod {
    const initialDate = params?.initialDate;
    const finalDate = params?.finalDate;

    if (initialDate || finalDate) {
      if (!initialDate || !finalDate) {
        throw new BadRequestException(
          "Informe initialDate e finalDate juntos, ou deixe ambos em branco.",
        );
      }
      if (typeof initialDate !== "string" || typeof finalDate !== "string") {
        throw new BadRequestException(
          "initialDate e finalDate devem usar o formato YYYY-MM-DD.",
        );
      }
      if (
        !this.isValidYmdDate(initialDate) ||
        !this.isValidYmdDate(finalDate)
      ) {
        throw new BadRequestException(
          "initialDate e finalDate devem ser datas validas no formato YYYY-MM-DD.",
        );
      }
      if (initialDate > finalDate) {
        throw new BadRequestException(
          "initialDate deve ser menor ou igual a finalDate.",
        );
      }

      return {
        initialDate,
        finalDate,
        source: "MANUAL_PARAMS",
      };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const monthText = String(month).padStart(2, "0");

    return {
      initialDate: `${year}-${monthText}-01`,
      finalDate: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
      source: "DEFAULT_CURRENT_MONTH",
    };
  }

  private resolveExecutionSources(
    params?: Record<string, unknown>,
  ): CostCenterApportionmentSource[] {
    const rawSources = params?.sources;
    if (this.isEmptySourceParam(rawSources)) {
      return [...COST_CENTER_APPORTIONMENT_SOURCES];
    }

    const sourceValues = Array.isArray(rawSources)
      ? rawSources
      : String(rawSources)
          .split(",")
          .map((source) => source.trim())
          .filter(Boolean);
    const sources = Array.from(
      new Set(sourceValues.map((source) => String(source).trim())),
    );
    const invalidSources = sources.filter(
      (source): source is string =>
        !COST_CENTER_APPORTIONMENT_SOURCES.includes(
          source as CostCenterApportionmentSource,
        ),
    );

    if (invalidSources.length > 0) {
      throw new BadRequestException(
        `sources contem valor(es) invalido(s): ${invalidSources.join(", ")}.`,
      );
    }

    return sources as CostCenterApportionmentSource[];
  }

  private hasExplicitSources(params?: Record<string, unknown>) {
    return !this.isEmptySourceParam(params?.sources);
  }

  private isEmptySourceParam(value: unknown) {
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  private getCompetenceDateRange(input: string | Date | null) {
    const parts = this.getDateParts(input);
    if (!parts) return null;

    const lastDay = new Date(parts.year, parts.month, 0).getDate();
    const month = String(parts.month).padStart(2, "0");

    return {
      competence: `${parts.year}-${month}`,
      initialDate: `${parts.year}-${month}-01`,
      finalDate: `${parts.year}-${month}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  private getDateParts(input: string | Date | null) {
    if (!input) return null;

    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) return null;
      return {
        year: input.getFullYear(),
        month: input.getMonth() + 1,
        day: input.getDate(),
      };
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(input));
    if (!match) return null;

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  private isValidYmdDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }

  private toYmdOrNull(input: string | Date | null) {
    const parts = this.getDateParts(input);
    if (!parts) return null;

    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }

  private toDateOrNull(input: string | Date | null) {
    const ymd = this.toYmdOrNull(input);
    if (!ymd) return null;
    return new Date(`${ymd}T00:00:00.000Z`);
  }

  private toNumberOrNull(input: string | number | null | undefined) {
    if (input === null || input === undefined) return null;
    const value = Number(input);
    return Number.isFinite(value) ? value : null;
  }

  private isFinalized(statusId: number | null | undefined) {
    return statusId === FINALIZED_STATUS_ID;
  }

  private roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundPercentage(value: number) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  private roundPercentage2(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundRatio(value: number) {
    return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
  }

  private serializeLine(line: ExpenseCostCenterLine) {
    return {
      id: line.id,
      costCenterId: line.costCenterId,
      storeId: line.storeId,
      percentage: line.percentage,
      costCenterTypeVrId: line.costCenterTypeVrId,
    };
  }

  private serializeTypeGroup(group: TypeGroup) {
    return {
      costCenterTypeVrId: group.costCenterTypeVrId,
      nullPercentageCount: group.nullPercentageCount,
      definedPercentageCount: group.definedPercentageCount,
      percentageTotal: group.percentageTotal,
      isComplete: group.isComplete,
      lines: group.lines.map((line) => this.serializeLine(line)),
    };
  }

  private serializeCostCenterType(costCenterType: {
    id: number;
    id_costcentertype_vr: number;
    description: string;
    activeStatus?: boolean | null;
    useParticipationStore: boolean;
    useParticipationCostCenter: boolean;
    costCenterTypeItems: Array<{
      id: number;
      costCenterId?: number | null;
      storeId?: number | null;
      percentage?: number | null;
      participation?: boolean | null;
    }>;
  }) {
    return {
      id: costCenterType.id,
      id_costcentertype_vr: costCenterType.id_costcentertype_vr,
      description: costCenterType.description,
      activeStatus: costCenterType.activeStatus,
      useParticipationStore: costCenterType.useParticipationStore,
      useParticipationCostCenter: costCenterType.useParticipationCostCenter,
      items: costCenterType.costCenterTypeItems.map((item) => ({
        id: item.id,
        costCenterId: item.costCenterId,
        storeId: item.storeId,
        percentage: item.percentage,
        participation: item.participation,
      })),
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
