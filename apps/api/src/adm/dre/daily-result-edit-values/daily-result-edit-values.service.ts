import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DailyResultLineConfig,
  DailyResultLineSourceType,
  MonthlyResult,
} from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { GetDailyResultEditValuesQueryDto } from './dto/get-daily-result-edit-values.query.dto';
import {
  DailyResultEditValueChangeDto,
  UpdateDailyResultEditValuesDto,
} from './dto/update-daily-result-edit-values.dto';

const DIRECT_FIELDS = [
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

type DirectField = (typeof DIRECT_FIELDS)[number];
type DirectValues = Record<DirectField, number>;
type LineValues = Record<string, number>;
type ReferenceScope = 'CURRENT' | 'TOTAL';
type JsonRecord = Record<string, unknown>;

type NormalizedChange = {
  costCenterId: number;
  lineId: string | null;
  field: DirectField;
  value: number;
};

type ResolveContext = {
  raw: DirectValues;
  totalRaw: DirectValues;
  values: LineValues;
  totalValues?: LineValues;
  linesById: Map<string, DailyResultLineConfig>;
  scope: ReferenceScope;
  resolving: Set<string>;
};

@Injectable()
export class DailyResultEditValuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findEditableValues(dto: GetDailyResultEditValuesQueryDto) {
    const month = this.parseMonth(dto.month);
    const nextMonth = this.addMonths(month, 1);

    const [store, costCenters, lines, monthlyResults] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: dto.storeId },
        select: { id: true, storeName: true, description: true },
      }),
      this.prisma.costCenter.findMany({
        orderBy: [{ id: 'asc' }],
        select: { id: true, description: true, activeStatus: true },
      }),
      this.loadActiveLines(),
      this.prisma.monthlyResult.findMany({
        where: {
          storeId: dto.storeId,
          date: {
            gte: month,
            lt: nextMonth,
          },
        },
        orderBy: [{ costCenterId: 'asc' }, { id: 'asc' }],
      }),
    ]);

    if (!store) {
      throw new BadRequestException(`Store ${dto.storeId} not found`);
    }

    const editableByLineId = this.getEditableFieldsByLineId(lines);
    const monthlyResultsByCostCenter =
      this.groupMonthlyResultsByCostCenter(monthlyResults);
    const totalRaw = this.calculateTotalRaw(costCenters, monthlyResultsByCostCenter);
    const totalValues = this.resolveValuesForRaw({
      raw: totalRaw,
      totalRaw,
      lines,
      scope: 'TOTAL',
    });

    const responseLines = lines.map((line) =>
      this.toResponseLine(line, editableByLineId),
    );

    const responseCostCenters = costCenters.map((costCenter) => {
      const rows = monthlyResultsByCostCenter.get(costCenter.id) ?? [];
      const duplicateMonthlyResultCount = rows.length;
      const hasDuplicateMonthlyResults = duplicateMonthlyResultCount > 1;
      const raw = this.sumMonthlyResults(rows);
      const values = this.resolveValuesForRaw({
        raw,
        totalRaw,
        totalValues,
        lines,
        scope: 'CURRENT',
      });

      return {
        costCenterId: costCenter.id,
        costCenterName: costCenter.description,
        activeStatus: costCenter.activeStatus,
        monthlyResultId: rows.length === 1 ? rows[0].id : null,
        hasMonthlyResult: rows.length > 0,
        duplicateMonthlyResultCount,
        hasDuplicateMonthlyResults,
        directValues: raw,
        values,
        cells: this.buildCells({
          lines,
          values,
          editableByLineId,
          hasDuplicateMonthlyResults,
        }),
      };
    });

    return {
      month: this.monthToDateString(month),
      storeId: store.id,
      storeName: this.storeLabel(store),
      sourceModel: 'MonthlyResult',
      editableSourceType: DailyResultLineSourceType.DIRECT_FIELD,
      editableFields: [...new Set(editableByLineId.values())],
      calculatedLinesReadonly: true,
      createsMonthlyResultWhenMissing: true,
      affectsConsolidationInferenceWhenCreated: true,
      lines: responseLines,
      costCenters: responseCostCenters,
      total: {
        directValues: totalRaw,
        values: totalValues,
        cells: this.buildCells({
          lines,
          values: totalValues,
          editableByLineId,
          hasDuplicateMonthlyResults: false,
          forceReadonlyReason: 'TOTAL_CELL',
        }),
      },
    };
  }

  async updateEditableValues(
    dto: UpdateDailyResultEditValuesDto,
    userId?: number | null,
  ) {
    const month = this.parseMonth(dto.month);
    const nextMonth = this.addMonths(month, 1);
    const [store, lines] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: dto.storeId },
        select: { id: true },
      }),
      this.loadActiveLines(),
    ]);

    if (!store) {
      throw new BadRequestException(`Store ${dto.storeId} not found`);
    }

    const editableByLineId = this.getEditableFieldsByLineId(lines);
    const lineById = new Map(lines.map((line) => [line.lineId, line]));
    const editableFields = new Set(editableByLineId.values());
    const normalizedChanges = this.normalizeChanges(
      dto.changes,
      lineById,
      editableByLineId,
      editableFields,
    );

    await this.ensureCostCentersExist(normalizedChanges);

    const changesByCostCenter = this.groupChangesByCostCenter(normalizedChanges);

    const result = await this.prisma.$transaction(async (tx) => {
      const appliedChanges: Array<{
        monthlyResultId: number;
        costCenterId: number;
        lineId: string | null;
        field: DirectField;
        previousValue: number | null;
        newValue: number;
        action: 'CREATED' | 'UPDATED';
      }> = [];
      let createdRows = 0;
      let updatedRows = 0;
      let skippedChanges = 0;

      for (const [costCenterId, changes] of changesByCostCenter.entries()) {
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
            `Cannot edit cost center ${costCenterId}: duplicate MonthlyResult rows exist for this store and month`,
          );
        }

        const existing = existingRows[0] ?? null;
        const data = this.buildMonthlyResultUpdateData(existing, changes);
        skippedChanges += data.skippedChanges;

        if (Object.keys(data.updateData).length === 0) {
          continue;
        }

        const persisted = existing
          ? await tx.monthlyResult.update({
              where: { id: existing.id },
              data: data.updateData,
            })
          : await tx.monthlyResult.create({
              data: {
                storeId: dto.storeId,
                costCenterId,
                date: month,
                ...this.emptyDirectValues(),
                ...data.updateData,
              },
            });

        if (existing) {
          updatedRows += 1;
        } else {
          createdRows += 1;
        }

        for (const log of data.logs) {
          appliedChanges.push({
            monthlyResultId: persisted.id,
            costCenterId,
            lineId: log.lineId,
            field: log.field,
            previousValue: log.previousValue,
            newValue: log.newValue,
            action: existing ? 'UPDATED' : 'CREATED',
          });
        }

        if (data.logs.length > 0) {
          await tx.monthlyResultManualEditLog.createMany({
            data: data.logs.map((log) => ({
              monthlyResultId: persisted.id,
              storeId: dto.storeId,
              costCenterId,
              month,
              field: log.field,
              previousValue: log.previousValue,
              newValue: log.newValue,
              userId: userId ?? null,
            })),
          });
        }
      }

      return {
        month: this.monthToDateString(month),
        storeId: dto.storeId,
        sourceModel: 'MonthlyResult',
        createdRows,
        updatedRows,
        appliedChanges,
        skippedChanges,
        createsMonthlyResultWhenMissing: true,
        affectedConsolidationInference: createdRows > 0,
      };
    });

    return result;
  }

  private loadActiveLines() {
    return this.prisma.dailyResultLineConfig.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  private getEditableFieldsByLineId(lines: DailyResultLineConfig[]) {
    const editable = new Map<string, DirectField>();

    for (const line of lines) {
      if (
        line.sourceType !== DailyResultLineSourceType.DIRECT_FIELD ||
        line.visible === false
      ) {
        continue;
      }

      const sourceField = this.getSourceField(line);
      if (sourceField) {
        editable.set(line.lineId, sourceField);
      }
    }

    return editable;
  }

  private toResponseLine(
    line: DailyResultLineConfig,
    editableByLineId: Map<string, DirectField>,
  ) {
    const sourceField = this.getSourceField(line);
    const editable = editableByLineId.has(line.lineId);

    return {
      id: line.id,
      lineId: line.lineId,
      label: line.label,
      order: line.order,
      sourceType: line.sourceType,
      format: line.format,
      visible: line.visible,
      bold: line.bold,
      shade: line.shade,
      sourceField,
      editable,
      readonlyReason: editable
        ? null
        : line.sourceType === DailyResultLineSourceType.DIRECT_FIELD
          ? 'DIRECT_FIELD_WITHOUT_SUPPORTED_SOURCE_FIELD'
          : 'CALCULATED_LINE',
    };
  }

  private buildCells(input: {
    lines: DailyResultLineConfig[];
    values: LineValues;
    editableByLineId: Map<string, DirectField>;
    hasDuplicateMonthlyResults: boolean;
    forceReadonlyReason?: string;
  }) {
    return Object.fromEntries(
      input.lines.map((line) => {
        const field = input.editableByLineId.get(line.lineId) ?? null;
        const editable = Boolean(field) && !input.hasDuplicateMonthlyResults && !input.forceReadonlyReason;

        return [
          line.lineId,
          {
            value: input.values[line.lineId] ?? 0,
            editable,
            field,
            readonlyReason: editable
              ? null
              : input.forceReadonlyReason
                ? input.forceReadonlyReason
                : input.hasDuplicateMonthlyResults
                ? 'DUPLICATE_MONTHLY_RESULT'
                : field
                  ? 'TOTAL_CELL'
                  : line.sourceType === DailyResultLineSourceType.DIRECT_FIELD
                    ? 'DIRECT_FIELD_WITHOUT_SUPPORTED_SOURCE_FIELD'
                    : 'CALCULATED_LINE',
          },
        ];
      }),
    );
  }

  private normalizeChanges(
    changes: DailyResultEditValueChangeDto[],
    lineById: Map<string, DailyResultLineConfig>,
    editableByLineId: Map<string, DirectField>,
    editableFields: Set<DirectField>,
  ) {
    const seen = new Set<string>();

    return changes.map((change, index) => {
      if (!change.lineId?.trim() && !change.field?.trim()) {
        throw new BadRequestException(
          `changes[${index}] requires lineId or field`,
        );
      }

      if (!Number.isFinite(change.value)) {
        throw new BadRequestException(`changes[${index}].value must be finite`);
      }

      const lineId = change.lineId?.trim() || null;
      let field = this.toDirectField(change.field);

      if (lineId) {
        const line = lineById.get(lineId);
        if (!line) {
          throw new BadRequestException(`Line '${lineId}' is not configured`);
        }

        const editableField = editableByLineId.get(lineId);
        if (!editableField) {
          throw new BadRequestException(
            `Line '${lineId}' is not editable. Only DIRECT_FIELD lines can be edited`,
          );
        }

        if (field && field !== editableField) {
          throw new BadRequestException(
            `changes[${index}].field does not match line '${lineId}' source field`,
          );
        }

        field = editableField;
      }

      if (!field || !editableFields.has(field)) {
        throw new BadRequestException(
          `Field '${change.field}' is not editable. Only configured DIRECT_FIELD fields can be edited`,
        );
      }

      const key = `${change.costCenterId}:${field}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate change for cost center ${change.costCenterId} and field '${field}'`,
        );
      }
      seen.add(key);

      return {
        costCenterId: change.costCenterId,
        lineId,
        field,
        value: change.value,
      };
    });
  }

  private async ensureCostCentersExist(changes: NormalizedChange[]) {
    const ids = [...new Set(changes.map((change) => change.costCenterId))];
    const costCenters = await this.prisma.costCenter.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundIds = new Set(costCenters.map((costCenter) => costCenter.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Cost center(s) not found: ${missingIds.join(', ')}`,
      );
    }
  }

  private groupChangesByCostCenter(changes: NormalizedChange[]) {
    const byCostCenter = new Map<number, NormalizedChange[]>();

    for (const change of changes) {
      const group = byCostCenter.get(change.costCenterId) ?? [];
      group.push(change);
      byCostCenter.set(change.costCenterId, group);
    }

    return byCostCenter;
  }

  private buildMonthlyResultUpdateData(
    existing: MonthlyResult | null,
    changes: NormalizedChange[],
  ) {
    const updateData: Partial<Record<DirectField, number>> = {};
    const logs: Array<{
      lineId: string | null;
      field: DirectField;
      previousValue: number | null;
      newValue: number;
    }> = [];
    let skippedChanges = 0;

    for (const change of changes) {
      const previousValue = existing ? Number(existing[change.field] ?? 0) : null;
      const comparablePreviousValue = previousValue ?? 0;

      if (this.sameNumber(comparablePreviousValue, change.value)) {
        skippedChanges += 1;
        continue;
      }

      updateData[change.field] = change.value;
      logs.push({
        lineId: change.lineId,
        field: change.field,
        previousValue,
        newValue: change.value,
      });
    }

    return { updateData, logs, skippedChanges };
  }

  private groupMonthlyResultsByCostCenter(rows: MonthlyResult[]) {
    const byCostCenter = new Map<number, MonthlyResult[]>();

    for (const row of rows) {
      const group = byCostCenter.get(row.costCenterId) ?? [];
      group.push(row);
      byCostCenter.set(row.costCenterId, group);
    }

    return byCostCenter;
  }

  private calculateTotalRaw(
    costCenters: Array<{ id: number }>,
    monthlyResultsByCostCenter: Map<number, MonthlyResult[]>,
  ) {
    return costCenters.reduce((total, costCenter) => {
      const raw = this.sumMonthlyResults(
        monthlyResultsByCostCenter.get(costCenter.id) ?? [],
      );

      for (const field of DIRECT_FIELDS) {
        total[field] += raw[field];
      }

      return total;
    }, this.emptyDirectValues());
  }

  private sumMonthlyResults(rows: MonthlyResult[]) {
    const sum = this.emptyDirectValues();

    for (const row of rows) {
      for (const field of DIRECT_FIELDS) {
        sum[field] += Number(row[field] ?? 0);
      }
    }

    return sum;
  }

  private resolveValuesForRaw(input: {
    raw: DirectValues;
    totalRaw: DirectValues;
    totalValues?: LineValues;
    lines: DailyResultLineConfig[];
    scope: ReferenceScope;
  }) {
    const values: LineValues = {};
    const context: ResolveContext = {
      raw: input.raw,
      totalRaw: input.totalRaw,
      totalValues: input.totalValues,
      values,
      linesById: new Map(input.lines.map((line) => [line.lineId, line])),
      scope: input.scope,
      resolving: new Set(),
    };

    for (const line of input.lines) {
      values[line.lineId] = this.resolveLineValue(line.lineId, context);
    }

    return values;
  }

  private resolveLineValue(lineId: string, context: ResolveContext): number {
    if (context.values[lineId] !== undefined) {
      return context.values[lineId];
    }

    const line = context.linesById.get(lineId);
    if (!line) {
      return 0;
    }

    if (context.resolving.has(lineId)) {
      throw new BadRequestException(
        `Circular daily result line configuration: ${lineId}`,
      );
    }

    context.resolving.add(lineId);

    let value = 0;
    if (line.sourceType === DailyResultLineSourceType.DIRECT_FIELD) {
      const sourceField = this.getSourceField(line);
      value = sourceField ? context.raw[sourceField] ?? 0 : 0;
    } else if (line.sourceType === DailyResultLineSourceType.SUM) {
      value = this.sumConfiguredTerms(line, context);
    } else if (line.sourceType === DailyResultLineSourceType.PARTICIPATION) {
      value = this.resolveParticipationValue(line, context);
    }

    context.values[lineId] = value;
    context.resolving.delete(lineId);

    return value;
  }

  private sumConfiguredTerms(
    line: DailyResultLineConfig,
    context: ResolveContext,
  ) {
    const calculationConfig = this.asRecord(line.calculationConfig);
    const terms = Array.isArray(calculationConfig?.terms)
      ? calculationConfig.terms
      : [];

    return terms.reduce((sum, term) => {
      const termRecord = this.asRecord(term);
      const lineKey = typeof termRecord?.lineKey === 'string'
        ? termRecord.lineKey
        : '';
      const multiplier = termRecord?.multiplier === -1 ? -1 : 1;

      return sum + this.resolveLineValue(lineKey, context) * multiplier;
    }, 0);
  }

  private resolveParticipationValue(
    line: DailyResultLineConfig,
    context: ResolveContext,
  ) {
    const calculationConfig = this.asRecord(line.calculationConfig);
    if (
      context.scope === 'TOTAL' &&
      calculationConfig?.totalMode === 'FIXED_VALUE'
    ) {
      return typeof calculationConfig.fixedTotalValue === 'number'
        ? calculationConfig.fixedTotalValue
        : 0;
    }

    const denominator = this.resolveReference(
      calculationConfig?.denominator,
      context,
    );

    if (!denominator) {
      return 0;
    }

    return this.resolveReference(calculationConfig?.numerator, context) / denominator;
  }

  private resolveReference(value: unknown, context: ResolveContext): number {
    const reference = this.asRecord(value);
    if (!reference) {
      return 0;
    }

    const scope = reference.scope === 'TOTAL' ? 'TOTAL' : 'CURRENT';
    const sourceField = this.toDirectField(reference.sourceField);

    if (sourceField) {
      return scope === 'TOTAL'
        ? context.totalRaw[sourceField] ?? 0
        : context.raw[sourceField] ?? 0;
    }

    if (typeof reference.lineKey !== 'string') {
      return 0;
    }

    if (scope === 'TOTAL' && context.scope !== 'TOTAL') {
      return context.totalValues?.[reference.lineKey] ?? 0;
    }

    return this.resolveLineValue(reference.lineKey, context);
  }

  private getSourceField(line: DailyResultLineConfig) {
    const sourceConfig = this.asRecord(line.sourceConfig);
    return this.toDirectField(sourceConfig?.sourceField);
  }

  private toDirectField(value: unknown): DirectField | null {
    if (typeof value !== 'string') {
      return null;
    }

    return DIRECT_FIELDS.includes(value as DirectField)
      ? (value as DirectField)
      : null;
  }

  private asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as JsonRecord;
  }

  private emptyDirectValues(): DirectValues {
    return DIRECT_FIELDS.reduce((acc, field) => {
      acc[field] = 0;
      return acc;
    }, {} as DirectValues);
  }

  private parseMonth(value: string) {
    const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
    if (!match) {
      throw new BadRequestException('Month must use YYYY-MM or YYYY-MM-DD');
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('Month must be between 01 and 12');
    }

    return new Date(Date.UTC(year, monthIndex, 1));
  }

  private monthToDateString(month: Date) {
    const year = month.getUTCFullYear();
    const monthNumber = String(month.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${monthNumber}-01`;
  }

  private addMonths(month: Date, amount: number) {
    return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + amount, 1));
  }

  private storeLabel(store: {
    id: number;
    storeName?: string | null;
    description?: string | null;
  }) {
    return store.storeName?.trim() || store.description?.trim() || `Loja ${store.id}`;
  }

  private sameNumber(a: number, b: number) {
    return Math.abs(a - b) < 1e-9;
  }
}
