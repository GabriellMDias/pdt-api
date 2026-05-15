import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyResultLineFormat,
  DailyResultLineSourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { PgService } from 'src/db/pg/pg.service';
import { CreateDailyResultLineConfigDto } from './dto/create-daily-result-line-config.dto';
import { UpdateDailyResultLineConfigDto } from './dto/update-daily-result-line-config.dto';
import { DEFAULT_DAILY_RESULT_LINE_CONFIG } from './default-daily-result-line-config';

const DIRECT_FIELDS = new Set([
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

const TOTAL_MODES = new Set(['RATIO_OF_TOTALS', 'FIXED_VALUE']);
const REFERENCE_SCOPES = new Set(['CURRENT', 'TOTAL']);
const DETAIL_SOURCE_TYPES = new Set(['CHILDREN', 'CUSTOM_SOURCE', 'DRE_VRMASTER']);
const DISTRIBUTION_STRATEGIES = new Set([
  'PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT',
  'VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT',
  'VRMASTER_COST_CENTER_EXACT',
]);
const IMPLEMENTED_DETAIL_SOURCES = new Map([
  ['recBruta', { lineId: 'recBruta', sourceType: 'CUSTOM_SOURCE' }],
  ['devolucao', { lineId: 'devolucao', sourceType: 'CUSTOM_SOURCE' }],
  ['imposto', { lineId: 'imposto', sourceType: 'CUSTOM_SOURCE' }],
  ['custo', { lineId: 'custo', sourceType: 'CUSTOM_SOURCE' }],
  ['embalagem', { lineId: 'embalagem', sourceType: 'CUSTOM_SOURCE' }],
  ['quebra', { lineId: 'quebra', sourceType: 'CUSTOM_SOURCE' }],
  ['recCom', { lineId: 'recCom', sourceType: 'CUSTOM_SOURCE' }],
  ['despesaPessoal', { lineId: 'despesaPessoal', sourceType: 'CUSTOM_SOURCE' }],
  ['despesaPessoalRat', { lineId: 'despesaPessoalRat', sourceType: 'CUSTOM_SOURCE' }],
  ['despesaOperacional', { lineId: 'despesaOperacional', sourceType: 'CUSTOM_SOURCE' }],
]);

type JsonRecord = Record<string, unknown>;

type LineValidationInput = {
  lineId?: string;
  label?: string;
  order?: number;
  sourceType?: DailyResultLineSourceType;
  format?: DailyResultLineFormat | null;
  sourceConfig?: unknown;
  calculationConfig?: unknown;
  vrDreId?: number | null;
  vrDreType?: string | null;
  vrDreTotalizationType?: string | null;
  detailConfig?: unknown;
};

type LineValidationOptions = {
  requireDirectFieldVrDreTerms?: boolean;
};

@Injectable()
export class DailyResultConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pg: PgService,
  ) {}

  findAll(includeInactive = false) {
    return this.prisma.dailyResultLineConfig.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  async findVrMasterDreOptions() {
    const query = `
      SELECT
        d.id,
        d.descricao AS "description",
        d.tipo AS "type",
        d.titulo AS "title",
        d.ordem AS "order",
        d.tipototalizacao AS "totalizationType",
        COUNT(di.id)::int AS "itemCount",
        COUNT(di.id_contacontabilfiscal)::int AS "accountItemCount",
        COUNT(di.id_dregrupo)::int AS "groupItemCount"
      FROM contabilidade.dre d
      LEFT JOIN contabilidade.dreitem di
        ON di.id_dre = d.id
      GROUP BY
        d.id,
        d.descricao,
        d.tipo,
        d.titulo,
        d.ordem,
        d.tipototalizacao
      ORDER BY
        COALESCE(d.ordem, d.id),
        d.id;
    `;

    const result = await this.pg.query<{
      id: number;
      description: string;
      type: number;
      title: boolean | null;
      order: number | null;
      totalizationType: number | null;
      itemCount: number;
      accountItemCount: number;
      groupItemCount: number;
    }>(query);

    return result.rows.map((row) => ({
      ...row,
      typeLabel: row.type === 1 ? 'Conta' : row.type === 2 ? 'Grupo' : 'Outro',
      totalizationTypeLabel:
        row.totalizationType === 1
          ? 'Grupo'
          : row.totalizationType === 2
            ? 'Conta'
            : null,
    }));
  }

  async create(dto: CreateDailyResultLineConfigDto) {
    this.validateLineConfig(dto);

    const existing = await this.prisma.dailyResultLineConfig.findUnique({
      where: { lineId: dto.lineId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(`Line '${dto.lineId}' already exists`);
    }

    return this.prisma.dailyResultLineConfig.create({
      data: this.toCreateData(dto),
    });
  }

  async update(id: number, dto: UpdateDailyResultLineConfigDto) {
    const current = await this.findByIdOrThrow(id);
    const merged = { ...current, ...dto };
    this.validateLineConfig(merged);

    if (dto.lineId && dto.lineId !== current.lineId) {
      const existing = await this.prisma.dailyResultLineConfig.findUnique({
        where: { lineId: dto.lineId },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Line '${dto.lineId}' already exists`);
      }
    }

    return this.prisma.dailyResultLineConfig.update({
      where: { id },
      data: this.toUpdateData(dto),
    });
  }

  async remove(id: number) {
    await this.findByIdOrThrow(id);

    return this.prisma.dailyResultLineConfig.update({
      where: { id },
      data: {
        active: false,
        visible: false,
      },
    });
  }

  async seedDefault() {
    const lines = await this.prisma.$transaction(
      DEFAULT_DAILY_RESULT_LINE_CONFIG.map((line) => {
        this.validateLineConfig(line, {
          requireDirectFieldVrDreTerms: false,
        });
        const data = this.toCreateData({
          ...line,
          visible: line.visible ?? true,
          bold: line.bold ?? false,
          shade: line.shade ?? false,
          active: line.active ?? true,
        });

        return this.prisma.dailyResultLineConfig.upsert({
          where: { lineId: line.lineId },
          update: data,
          create: data,
        });
      }),
    );

    return {
      count: lines.length,
      lines,
    };
  }

  private async findByIdOrThrow(id: number) {
    const line = await this.prisma.dailyResultLineConfig.findUnique({
      where: { id },
    });

    if (!line) {
      throw new NotFoundException(`Daily result line config ${id} not found`);
    }

    return line;
  }

  private validateLineConfig(
    line: LineValidationInput,
    options: LineValidationOptions = {},
  ) {
    const requireDirectFieldVrDreTerms =
      options.requireDirectFieldVrDreTerms ?? true;

    if (!line.lineId?.trim()) {
      throw new BadRequestException('lineId is required');
    }
    if (!line.label?.trim()) {
      throw new BadRequestException('label is required');
    }
    if (!Number.isInteger(line.order)) {
      throw new BadRequestException('order is required and must be an integer');
    }
    if (!line.sourceType) {
      throw new BadRequestException('sourceType is required');
    }

    if (
      line.sourceType !== DailyResultLineSourceType.GROUP &&
      !line.format
    ) {
      throw new BadRequestException('format is required for value lines');
    }

    switch (line.sourceType) {
      case DailyResultLineSourceType.DIRECT_FIELD:
        this.validateDirectField(line, requireDirectFieldVrDreTerms);
        break;
      case DailyResultLineSourceType.PARTICIPATION:
        this.validateParticipation(line);
        break;
      case DailyResultLineSourceType.SUM:
        this.validateSum(line);
        break;
      case DailyResultLineSourceType.DRE_VRMASTER:
        this.validateDreVrMaster(line);
        break;
      case DailyResultLineSourceType.GROUP:
        break;
      default:
        throw new BadRequestException('Invalid sourceType');
    }

    this.validateDetailConfig(line);
  }

  private validateDetailConfig(line: LineValidationInput) {
    if (line.detailConfig === undefined || line.detailConfig === null) return;

    const detailConfig = this.requireRecord(
      line.detailConfig,
      'detailConfig',
    );

    if (detailConfig.enabled === false || detailConfig.detailEnabled === false) {
      return;
    }

    const enabled =
      detailConfig.enabled === true ||
      detailConfig.detailEnabled === true ||
      Boolean(
        detailConfig.detailSourceKey ||
          detailConfig.detailSourceType ||
          detailConfig.children,
      );

    if (!enabled) return;

    if (
      typeof detailConfig.detailSourceType !== 'string' ||
      !DETAIL_SOURCE_TYPES.has(detailConfig.detailSourceType)
    ) {
      throw new BadRequestException(
        'detailConfig.detailSourceType must be a controlled detail source type',
      );
    }

    if (
      typeof detailConfig.detailSourceKey !== 'string' ||
      !detailConfig.detailSourceKey.trim()
    ) {
      throw new BadRequestException('detailConfig.detailSourceKey is required');
    }

    const implementedSource = IMPLEMENTED_DETAIL_SOURCES.get(
      detailConfig.detailSourceKey,
    );

    if (!implementedSource) {
      throw new BadRequestException(
        `detailConfig.detailSourceKey '${detailConfig.detailSourceKey}' is not implemented`,
      );
    }

    if (implementedSource.sourceType !== detailConfig.detailSourceType) {
      throw new BadRequestException(
        `detailConfig.detailSourceKey '${detailConfig.detailSourceKey}' is not available for ${detailConfig.detailSourceType}`,
      );
    }

    if (line.lineId !== implementedSource.lineId) {
      throw new BadRequestException(
        `detailConfig.detailSourceKey '${detailConfig.detailSourceKey}' is implemented only for line '${implementedSource.lineId}'`,
      );
    }

    const levels = Number(detailConfig.levels);
    if (
      detailConfig.levels !== undefined &&
      (!Number.isInteger(levels) || levels < 1)
    ) {
      throw new BadRequestException('detailConfig.levels must be a positive integer');
    }

    if (
      detailConfig.children !== undefined &&
      (!Array.isArray(detailConfig.children) ||
        detailConfig.children.some((child) => typeof child !== 'string' || !child.trim()))
    ) {
      throw new BadRequestException('detailConfig.children must be a string array');
    }
  }

  private validateDirectField(
    line: LineValidationInput,
    requireVrDreTerms: boolean,
  ) {
    const sourceConfig = this.requireRecord(
      line.sourceConfig,
      'sourceConfig',
    );
    const sourceField = sourceConfig.sourceField;

    if (typeof sourceField !== 'string' || !DIRECT_FIELDS.has(sourceField)) {
      throw new BadRequestException(
        'DIRECT_FIELD requires sourceConfig.sourceField with a supported field',
      );
    }

    if (
      sourceConfig.distributionStrategy !== undefined &&
      (typeof sourceConfig.distributionStrategy !== 'string' ||
        !DISTRIBUTION_STRATEGIES.has(sourceConfig.distributionStrategy))
    ) {
      throw new BadRequestException(
        'DIRECT_FIELD sourceConfig.distributionStrategy must be a controlled strategy',
      );
    }

    const directTerms = this.readDirectFieldVrDreTerms(line, sourceConfig);
    const reconciliationGroups = this.readDirectFieldReconciliationGroups(
      line,
      sourceConfig,
    );

    if (
      requireVrDreTerms &&
      directTerms.length === 0 &&
      reconciliationGroups.length === 0
    ) {
      throw new BadRequestException(
        'DIRECT_FIELD requires at least one VRMaster DRE link or reconciliation group',
      );
    }
  }

  private readDirectFieldVrDreTerms(
    line: LineValidationInput,
    sourceConfig: JsonRecord,
  ) {
    if (Array.isArray(sourceConfig.vrDreTerms)) {
      return sourceConfig.vrDreTerms.map((term, index) => {
        const termRecord = this.requireRecord(
          term,
          `sourceConfig.vrDreTerms[${index}]`,
        );
        const vrDreId = Number(termRecord.vrDreId);

        if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
          throw new BadRequestException(
            `sourceConfig.vrDreTerms[${index}].vrDreId must be positive`,
          );
        }

        if (termRecord.multiplier !== 1 && termRecord.multiplier !== -1) {
          throw new BadRequestException(
            `sourceConfig.vrDreTerms[${index}].multiplier must be 1 or -1`,
          );
        }

        return {
          vrDreId,
          multiplier: termRecord.multiplier,
        };
      });
    }

    const ids = Array.isArray(sourceConfig.vrDreIds)
      ? sourceConfig.vrDreIds
      : [];

    return [
      ...ids,
      ...(line.vrDreId !== undefined && line.vrDreId !== null
        ? [line.vrDreId]
        : []),
    ]
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .map((vrDreId) => ({ vrDreId, multiplier: 1 }));
  }

  private readDirectFieldReconciliationGroups(
    line: LineValidationInput,
    sourceConfig: JsonRecord,
  ) {
    const rawGroups =
      Array.isArray(sourceConfig.dreReconciliationGroups)
        ? sourceConfig.dreReconciliationGroups
        : sourceConfig.dreReconciliationGroup
          ? [sourceConfig.dreReconciliationGroup]
          : [];

    return rawGroups
      .map((group, index) => {
        const groupRecord = this.requireRecord(
          group,
          `sourceConfig.dreReconciliationGroups[${index}]`,
        );
        const localLineIds = groupRecord.localLineIds;
        const vrDreTerms = groupRecord.vrDreTerms;

        if (typeof groupRecord.groupId !== 'string' || !groupRecord.groupId.trim()) {
          throw new BadRequestException(
            `sourceConfig.dreReconciliationGroups[${index}].groupId is required`,
          );
        }

        if (
          !Array.isArray(localLineIds) ||
          localLineIds.some((lineId) => typeof lineId !== 'string' || !lineId.trim())
        ) {
          throw new BadRequestException(
            `sourceConfig.dreReconciliationGroups[${index}].localLineIds must be a string array`,
          );
        }

        if (!Array.isArray(vrDreTerms) || vrDreTerms.length === 0) {
          throw new BadRequestException(
            `sourceConfig.dreReconciliationGroups[${index}].vrDreTerms is required`,
          );
        }

        const terms = vrDreTerms.map((term, termIndex) => {
          const termRecord = this.requireRecord(
            term,
            `sourceConfig.dreReconciliationGroups[${index}].vrDreTerms[${termIndex}]`,
          );
          const vrDreId = Number(termRecord.vrDreId);

          if (!Number.isInteger(vrDreId) || vrDreId <= 0) {
            throw new BadRequestException(
              `sourceConfig.dreReconciliationGroups[${index}].vrDreTerms[${termIndex}].vrDreId must be positive`,
            );
          }

          if (termRecord.multiplier !== 1 && termRecord.multiplier !== -1) {
            throw new BadRequestException(
              `sourceConfig.dreReconciliationGroups[${index}].vrDreTerms[${termIndex}].multiplier must be 1 or -1`,
            );
          }

          return {
            vrDreId,
            multiplier: termRecord.multiplier,
          };
        });

        return {
          groupId: groupRecord.groupId,
          description:
            typeof groupRecord.description === 'string'
              ? groupRecord.description
              : groupRecord.groupId,
          localLineIds,
          vrDreTerms: terms,
        };
      })
      .filter((group) =>
        typeof line.lineId === 'string' && group.localLineIds.includes(line.lineId),
      );
  }

  private validateParticipation(line: LineValidationInput) {
    if (line.format !== DailyResultLineFormat.percent) {
      throw new BadRequestException('PARTICIPATION lines must use percent format');
    }

    const calculationConfig = this.requireRecord(
      line.calculationConfig,
      'calculationConfig',
    );

    this.validateReference(calculationConfig.numerator, 'numerator');
    this.validateReference(calculationConfig.denominator, 'denominator');
    this.validateReference(calculationConfig.baseMetric, 'baseMetric');

    if (
      typeof calculationConfig.totalMode !== 'string' ||
      !TOTAL_MODES.has(calculationConfig.totalMode)
    ) {
      throw new BadRequestException(
        'PARTICIPATION requires calculationConfig.totalMode',
      );
    }

    if (
      calculationConfig.totalMode === 'FIXED_VALUE' &&
      typeof calculationConfig.fixedTotalValue !== 'number'
    ) {
      throw new BadRequestException(
        'FIXED_VALUE participation requires fixedTotalValue',
      );
    }
  }

  private validateSum(line: LineValidationInput) {
    const calculationConfig = this.requireRecord(
      line.calculationConfig,
      'calculationConfig',
    );
    const terms = calculationConfig.terms;

    if (!Array.isArray(terms) || terms.length === 0) {
      throw new BadRequestException('SUM requires calculationConfig.terms');
    }

    for (const [index, term] of terms.entries()) {
      const termRecord = this.requireRecord(term, `terms[${index}]`);
      if (typeof termRecord.lineKey !== 'string' || !termRecord.lineKey.trim()) {
        throw new BadRequestException(`SUM term ${index} requires lineKey`);
      }

      if (
        termRecord.multiplier !== undefined &&
        termRecord.multiplier !== 1 &&
        termRecord.multiplier !== -1
      ) {
        throw new BadRequestException(
          `SUM term ${index} multiplier must be 1 or -1`,
        );
      }
    }
  }

  private validateDreVrMaster(line: LineValidationInput) {
    if (
      line.vrDreId === null &&
      line.vrDreType === null &&
      line.vrDreTotalizationType === null
    ) {
      return;
    }

    if (line.vrDreId !== undefined && line.vrDreId !== null && line.vrDreId <= 0) {
      throw new BadRequestException('vrDreId must be positive when provided');
    }
  }

  private validateReference(value: unknown, name: string) {
    const reference = this.requireRecord(value, name);
    const lineKey = reference.lineKey;
    const sourceField = reference.sourceField;

    if (
      (typeof lineKey !== 'string' || !lineKey.trim()) &&
      (typeof sourceField !== 'string' || !DIRECT_FIELDS.has(sourceField))
    ) {
      throw new BadRequestException(
        `${name} must reference lineKey or supported sourceField`,
      );
    }

    if (
      reference.scope !== undefined &&
      (typeof reference.scope !== 'string' || !REFERENCE_SCOPES.has(reference.scope))
    ) {
      throw new BadRequestException(`${name}.scope must be CURRENT or TOTAL`);
    }
  }

  private requireRecord(value: unknown, name: string): JsonRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(`${name} must be an object`);
    }

    return value as JsonRecord;
  }

  private toCreateData(
    line: CreateDailyResultLineConfigDto,
  ): Prisma.DailyResultLineConfigUncheckedCreateInput {
    return {
      lineId: line.lineId,
      label: line.label,
      order: line.order,
      sourceType: line.sourceType,
      format: line.format ?? null,
      visible: line.visible ?? true,
      bold: line.bold ?? false,
      shade: line.shade ?? false,
      sourceConfig: this.toNullableJson(line.sourceConfig),
      calculationConfig: this.toNullableJson(line.calculationConfig),
      styleConfig: this.toNullableJson(line.styleConfig),
      vrDreId: line.vrDreId ?? null,
      vrDreItemId: line.vrDreItemId ?? null,
      vrDreType: line.vrDreType ?? null,
      vrDreTotalizationType: line.vrDreTotalizationType ?? null,
      detailConfig: this.toNullableJson(line.detailConfig),
      active: line.active ?? true,
    };
  }

  private toUpdateData(
    dto: UpdateDailyResultLineConfigDto,
  ): Prisma.DailyResultLineConfigUncheckedUpdateInput {
    const data: Prisma.DailyResultLineConfigUncheckedUpdateInput = {};

    this.assignDefined(data, 'lineId', dto.lineId);
    this.assignDefined(data, 'label', dto.label);
    this.assignDefined(data, 'order', dto.order);
    this.assignDefined(data, 'sourceType', dto.sourceType);
    this.assignDefined(data, 'format', dto.format);
    this.assignDefined(data, 'visible', dto.visible);
    this.assignDefined(data, 'bold', dto.bold);
    this.assignDefined(data, 'shade', dto.shade);
    this.assignDefined(data, 'vrDreId', dto.vrDreId);
    this.assignDefined(data, 'vrDreItemId', dto.vrDreItemId);
    this.assignDefined(data, 'vrDreType', dto.vrDreType);
    this.assignDefined(data, 'vrDreTotalizationType', dto.vrDreTotalizationType);
    this.assignDefined(data, 'active', dto.active);

    if (dto.sourceConfig !== undefined) {
      data.sourceConfig = this.toNullableJson(dto.sourceConfig);
    }
    if (dto.calculationConfig !== undefined) {
      data.calculationConfig = this.toNullableJson(dto.calculationConfig);
    }
    if (dto.styleConfig !== undefined) {
      data.styleConfig = this.toNullableJson(dto.styleConfig);
    }
    if (dto.detailConfig !== undefined) {
      data.detailConfig = this.toNullableJson(dto.detailConfig);
    }

    return data;
  }

  private toNullableJson(value: unknown) {
    return value === undefined || value === null
      ? Prisma.JsonNull
      : (value as Prisma.InputJsonValue);
  }

  private assignDefined<
    T extends Prisma.DailyResultLineConfigUncheckedUpdateInput,
    K extends keyof T,
  >(target: T, key: K, value: T[K] | undefined) {
    if (value !== undefined) {
      target[key] = value;
    }
  }
}
