import type {
  ResultadoDiarioLineConfig,
  ResultadoDiarioDistributionStrategy,
  ResultadoDiarioValueFormat,
  ResultadoDiarioValueReference,
  ResultadoDiarioVrDreTotalizationType,
  ResultadoDiarioVrDreType,
} from "./resultado-diario.config";
import {
  RESULTADO_DIARIO_IMPLEMENTED_DETAIL_SOURCES,
  getResultadoDiarioDefaultDetailConfig,
} from "./resultado-diario.config";

export type DailyResultLineSourceType =
  | "DIRECT_FIELD"
  | "PARTICIPATION"
  | "SUM"
  | "GROUP"
  | "DRE_VRMASTER";

export type DailyResultLineFormat = "money" | "percent";

export type DailyResultLineConfigDto = {
  id: number;
  lineId: string;
  label: string;
  order: number;
  sourceType: DailyResultLineSourceType;
  format?: DailyResultLineFormat | null;
  visible: boolean;
  bold: boolean;
  shade: boolean;
  sourceConfig?: unknown;
  calculationConfig?: unknown;
  styleConfig?: unknown;
  vrDreId?: number | null;
  vrDreItemId?: number | null;
  vrDreType?: string | null;
  vrDreTotalizationType?: string | null;
  detailConfig?: unknown;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type JsonRecord = Record<string, unknown>;

export function dailyResultDtoToLineConfig(
  dto: DailyResultLineConfigDto,
): ResultadoDiarioLineConfig | null {
  const base = {
    key: dto.lineId,
    label: dto.label,
    visible: dto.visible,
    active: dto.active,
    bold: dto.bold,
    shade: dto.shade,
    vrMaster: {
      vrDreId: dto.vrDreId ?? undefined,
      vrDreItemId: dto.vrDreItemId ?? undefined,
      vrDreType: normalizeVrDreType(dto.vrDreType),
      vrDreTotalizationType: normalizeVrDreTotalizationType(
        dto.vrDreTotalizationType,
      ),
    },
    detail: normalizeDetailConfig(dto.detailConfig, dto.lineId),
  };

  switch (dto.sourceType) {
    case "DIRECT_FIELD": {
      const sourceConfig = asRecord(dto.sourceConfig);
      const sourceField = sourceConfig?.sourceField;
      if (typeof sourceField !== "string") return null;

      return {
        ...base,
        kind: "DIRECT_FIELD",
        format: normalizeFormat(dto.format),
        sourceField,
        distributionStrategy: normalizeDistributionStrategy(
          sourceConfig?.distributionStrategy,
        ),
      } as ResultadoDiarioLineConfig;
    }
    case "PARTICIPATION": {
      const calculationConfig = asRecord(dto.calculationConfig);
      if (!calculationConfig) return null;

      const numerator = normalizeReference(calculationConfig.numerator);
      const denominator = normalizeReference(calculationConfig.denominator);
      const baseMetric = normalizeReference(calculationConfig.baseMetric);
      const totalMode =
        calculationConfig.totalMode === "FIXED_VALUE"
          ? "FIXED_VALUE"
          : "RATIO_OF_TOTALS";
      if (!numerator || !denominator || !baseMetric) return null;

      return {
        ...base,
        kind: "PARTICIPATION",
        format: "percent",
        numerator,
        denominator,
        baseMetric,
        totalMode,
        fixedTotalValue:
          typeof calculationConfig.fixedTotalValue === "number"
            ? calculationConfig.fixedTotalValue
            : undefined,
      };
    }
    case "SUM": {
      const calculationConfig = asRecord(dto.calculationConfig);
      const rawTerms = calculationConfig?.terms;
      const terms = Array.isArray(rawTerms)
        ? rawTerms
            .map((term) => {
              const record = asRecord(term);
              if (!record) return null;
              const lineKey = record?.lineKey;
              if (typeof lineKey !== "string" || !lineKey.trim()) return null;

              return {
                lineKey,
                multiplier: record.multiplier === -1 ? -1 : 1,
              } as const;
            })
            .filter((term): term is { lineKey: string; multiplier: 1 | -1 } =>
              Boolean(term),
            )
        : [];

      if (terms.length === 0) return null;

      return {
        ...base,
        kind: "SUM",
        format: normalizeFormat(dto.format),
        terms,
      };
    }
    case "GROUP":
      return {
        ...base,
        kind: "GROUP",
      };
    case "DRE_VRMASTER":
      return {
        ...base,
        kind: "DRE_VRMASTER",
        format: normalizeFormat(dto.format),
        vrMaster: base.vrMaster,
      };
    default:
      return null;
  }
}

export function dailyResultDtosToLineConfig(
  rows: DailyResultLineConfigDto[],
): ResultadoDiarioLineConfig[] {
  return rows
    .slice()
    .sort((a, b) => a.order - b.order || a.id - b.id)
    .map(dailyResultDtoToLineConfig)
    .filter((line): line is ResultadoDiarioLineConfig => Boolean(line));
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function normalizeFormat(format?: DailyResultLineFormat | null) {
  return (format === "percent" ? "percent" : "money") as ResultadoDiarioValueFormat;
}

function normalizeReference(value: unknown): ResultadoDiarioValueReference | null {
  const record = asRecord(value);
  if (!record) return null;

  const scope = record.scope === "TOTAL" ? "TOTAL" : undefined;

  if (typeof record.lineKey === "string" && record.lineKey.trim()) {
    return { lineKey: record.lineKey, scope };
  }

  if (typeof record.sourceField === "string" && record.sourceField.trim()) {
    return { sourceField: record.sourceField, scope } as ResultadoDiarioValueReference;
  }

  return null;
}

function normalizeDistributionStrategy(
  value: unknown,
): ResultadoDiarioDistributionStrategy | undefined {
  if (
    value === "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT" ||
    value === "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT" ||
    value === "VRMASTER_COST_CENTER_EXACT"
  ) {
    return value;
  }

  return undefined;
}

function normalizeDetailConfig(value: unknown, lineId: string) {
  const record = asRecord(value);
  if (!record) return getResultadoDiarioDefaultDetailConfig(lineId);

  if (record.enabled === false || record.detailEnabled === false) {
    return { enabled: false } as ResultadoDiarioLineConfig["detail"];
  }

  const children = Array.isArray(record.children)
    ? record.children.filter((child): child is string => typeof child === "string")
    : undefined;

  const enabled =
    record.enabled === true ||
    record.detailEnabled === true ||
    Boolean(record.detailSourceKey || record.detailSourceType || children?.length);

  return {
    enabled,
    detailEnabled: enabled,
    detailSourceType:
      typeof record.detailSourceType === "string"
        ? record.detailSourceType
        : RESULTADO_DIARIO_IMPLEMENTED_DETAIL_SOURCES.some(
            (item) => item.detailSourceKey === record.detailSourceKey,
          )
          ? "CUSTOM_SOURCE"
        : undefined,
    detailSourceKey:
      typeof record.detailSourceKey === "string"
        ? record.detailSourceKey
        : undefined,
    children,
    levels: typeof record.levels === "number" ? record.levels : undefined,
  } as ResultadoDiarioLineConfig["detail"];
}

function normalizeVrDreType(value?: string | null): ResultadoDiarioVrDreType | undefined {
  return value === "ACCOUNT" || value === "GROUP" ? value : undefined;
}

function normalizeVrDreTotalizationType(
  value?: string | null,
): ResultadoDiarioVrDreTotalizationType | undefined {
  return value === "ACCOUNT" || value === "GROUP" || value === "NONE"
    ? value
    : undefined;
}
