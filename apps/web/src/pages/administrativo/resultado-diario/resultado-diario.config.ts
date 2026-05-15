import type { DRE } from "./types";

export const RESULTADO_DIARIO_DIRECT_FIELDS = [
  "recBruta",
  "devolucao",
  "imposto",
  "custo",
  "embalagem",
  "quebra",
  "recCom",
  "despesaPessoal",
  "despesaPessoalRat",
  "despesaOperacional",
] as const satisfies readonly (keyof DRE)[];

export type ResultadoDiarioDirectField =
  (typeof RESULTADO_DIARIO_DIRECT_FIELDS)[number];

export type ResultadoDiarioLineKind =
  | "DIRECT_FIELD"
  | "PARTICIPATION"
  | "SUM"
  | "GROUP"
  | "DRE_VRMASTER";

export type ResultadoDiarioValueFormat = "money" | "percent";
export type ResultadoDiarioReferenceScope = "CURRENT" | "TOTAL";
export type ResultadoDiarioDistributionStrategy =
  | "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT"
  | "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT"
  | "VRMASTER_COST_CENTER_EXACT";

export type ResultadoDiarioVrDreType = "ACCOUNT" | "GROUP";
export type ResultadoDiarioVrDreTotalizationType = "ACCOUNT" | "GROUP" | "NONE";

export type ResultadoDiarioVrMasterLink = {
  vrDreId?: number;
  vrDreItemId?: number;
  vrDreType?: ResultadoDiarioVrDreType;
  vrDreTotalizationType?: ResultadoDiarioVrDreTotalizationType | null;
};

export type ResultadoDiarioDetailSourceType =
  | "CHILDREN"
  | "CUSTOM_SOURCE"
  | "DRE_VRMASTER";

export type ResultadoDiarioDetailConfig = {
  enabled?: boolean;
  detailEnabled?: boolean;
  detailSourceType?: ResultadoDiarioDetailSourceType;
  detailSourceKey?: string;
  children?: readonly string[];
  levels?: number;
};

export type ResultadoDiarioValueReference =
  | {
      lineKey: string;
      scope?: ResultadoDiarioReferenceScope;
    }
  | {
      sourceField: ResultadoDiarioDirectField;
      scope?: ResultadoDiarioReferenceScope;
    };

type ResultadoDiarioLineBase = {
  key: string;
  label: string;
  visible?: boolean;
  active?: boolean;
  bold?: boolean;
  shade?: boolean;
  vrMaster?: ResultadoDiarioVrMasterLink;
  detail?: ResultadoDiarioDetailConfig;
};

export type ResultadoDiarioDirectFieldLineConfig = ResultadoDiarioLineBase & {
  kind: "DIRECT_FIELD";
  format: ResultadoDiarioValueFormat;
  sourceField: ResultadoDiarioDirectField;
  distributionStrategy?: ResultadoDiarioDistributionStrategy;
};

export type ResultadoDiarioParticipationLineConfig =
  ResultadoDiarioLineBase & {
    kind: "PARTICIPATION";
    format: "percent";
    numerator: ResultadoDiarioValueReference;
    denominator: ResultadoDiarioValueReference;
    baseMetric: ResultadoDiarioValueReference;
    totalMode: "RATIO_OF_TOTALS" | "FIXED_VALUE";
    fixedTotalValue?: number;
  };

export type ResultadoDiarioSumLineConfig = ResultadoDiarioLineBase & {
  kind: "SUM";
  format: ResultadoDiarioValueFormat;
  terms: ReadonlyArray<{
    lineKey: string;
    multiplier?: 1 | -1;
  }>;
};

export type ResultadoDiarioGroupLineConfig = ResultadoDiarioLineBase & {
  kind: "GROUP";
};

export type ResultadoDiarioDreVrMasterLineConfig =
  ResultadoDiarioLineBase & {
    kind: "DRE_VRMASTER";
    format: ResultadoDiarioValueFormat;
    vrMaster: ResultadoDiarioVrMasterLink;
  };

export type ResultadoDiarioLineConfig =
  | ResultadoDiarioDirectFieldLineConfig
  | ResultadoDiarioParticipationLineConfig
  | ResultadoDiarioSumLineConfig
  | ResultadoDiarioGroupLineConfig
  | ResultadoDiarioDreVrMasterLineConfig;

export type ResultadoDiarioValueLineConfig = Exclude<
  ResultadoDiarioLineConfig,
  ResultadoDiarioGroupLineConfig
>;

export const isResultadoDiarioValueLine = (
  line: ResultadoDiarioLineConfig,
): line is ResultadoDiarioValueLineConfig => line.kind !== "GROUP";

export const RESULTADO_DIARIO_IMPLEMENTED_DETAIL_SOURCES = [
  {
    lineKey: "recBruta",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "recBruta",
    label: "Receita bruta",
    defaultLevels: 1,
  },
  {
    lineKey: "devolucao",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "devolucao",
    label: "Devolucao",
    defaultLevels: 1,
  },
  {
    lineKey: "imposto",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "imposto",
    label: "Imposto",
    defaultLevels: 1,
  },
  {
    lineKey: "custo",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "custo",
    label: "Custo produto",
    defaultLevels: 1,
  },
  {
    lineKey: "embalagem",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "embalagem",
    label: "Custo embalagem",
    defaultLevels: 1,
  },
  {
    lineKey: "quebra",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "quebra",
    label: "Quebra / avaria / consumo",
    defaultLevels: 1,
  },
  {
    lineKey: "recCom",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "recCom",
    label: "Receitas comerciais",
    defaultLevels: 1,
  },
  {
    lineKey: "despesaPessoal",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "despesaPessoal",
    label: "Despesa pessoal",
    defaultLevels: 1,
  },
  {
    lineKey: "despesaPessoalRat",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "despesaPessoalRat",
    label: "Despesa pessoal rateada",
    defaultLevels: 1,
  },
  {
    lineKey: "despesaOperacional",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "despesaOperacional",
    label: "Despesa operacional",
    defaultLevels: 1,
  },
] as const satisfies ReadonlyArray<{
  lineKey: string;
  detailSourceType: ResultadoDiarioDetailSourceType;
  detailSourceKey: string;
  label: string;
  defaultLevels: number;
}>;

export function getResultadoDiarioDefaultDetailConfig(
  lineKey: string,
): ResultadoDiarioDetailConfig | undefined {
  const source = RESULTADO_DIARIO_IMPLEMENTED_DETAIL_SOURCES.find(
    (item) => item.lineKey === lineKey,
  );

  if (!source) return undefined;

  return {
    enabled: true,
    detailSourceType: source.detailSourceType,
    detailSourceKey: source.detailSourceKey,
    levels: source.defaultLevels,
  };
}

export function getResultadoDiarioImplementedDetailKey(
  line: ResultadoDiarioLineConfig,
) {
  const detail = line.detail ?? getResultadoDiarioDefaultDetailConfig(line.key);
  if (!detail) return null;
  if (detail.enabled === false || detail.detailEnabled === false) return null;

  const enabled =
    detail.enabled === true ||
    detail.detailEnabled === true ||
    Boolean(detail.detailSourceKey || detail.detailSourceType);

  const detailSourceType =
    detail.detailSourceType ??
    (RESULTADO_DIARIO_IMPLEMENTED_DETAIL_SOURCES.some(
      (item) => item.detailSourceKey === detail.detailSourceKey,
    )
      ? "CUSTOM_SOURCE"
      : undefined);

  if (!enabled || detailSourceType !== "CUSTOM_SOURCE") return null;

  const source = RESULTADO_DIARIO_IMPLEMENTED_DETAIL_SOURCES.find(
    (item) =>
      item.lineKey === line.key &&
      item.detailSourceType === detailSourceType &&
      item.detailSourceKey === detail.detailSourceKey,
  );

  return source?.detailSourceKey ?? null;
}

export const RESULTADO_DIARIO_LINE_CONFIG: readonly ResultadoDiarioLineConfig[] = [
  {
    kind: "PARTICIPATION",
    key: "participacao",
    label: "PARTICIPAÇÃO (%)",
    format: "percent",
    numerator: { lineKey: "recBruta" },
    denominator: { lineKey: "recBruta", scope: "TOTAL" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "FIXED_VALUE",
    fixedTotalValue: 1,
  },

  {
    kind: "DIRECT_FIELD",
    key: "recBruta",
    label: "RECEITA BRUTA DE VENDAS",
    format: "money",
    sourceField: "recBruta",
    distributionStrategy: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
    bold: true,
    shade: true,
    detail: {
      enabled: true,
      detailSourceType: "CUSTOM_SOURCE",
      detailSourceKey: "recBruta",
      levels: 1,
    },
  },
  {
    kind: "DIRECT_FIELD",
    key: "devolucao",
    label: "DEVOLUÇÃO DE VENDAS",
    format: "money",
    sourceField: "devolucao",
    distributionStrategy: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  },
  {
    kind: "DIRECT_FIELD",
    key: "imposto",
    label: "IMPOSTO SOBRE VENDAS",
    format: "money",
    sourceField: "imposto",
    distributionStrategy: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  },

  {
    kind: "SUM",
    key: "receitaLiquida",
    label: "RECEITA LIQUIDA DE VENDAS",
    format: "money",
    terms: [
      { lineKey: "recBruta", multiplier: 1 },
      { lineKey: "devolucao", multiplier: 1 },
      { lineKey: "imposto", multiplier: 1 },
    ],
    bold: true,
    shade: true,
  },

  {
    kind: "DIRECT_FIELD",
    key: "custo",
    label: "CUSTO PRODUTO",
    format: "money",
    sourceField: "custo",
    distributionStrategy: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  },
  {
    kind: "DIRECT_FIELD",
    key: "embalagem",
    label: "CUSTO EMBALAGEM",
    format: "money",
    sourceField: "embalagem",
    distributionStrategy: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
  },

  {
    kind: "SUM",
    key: "lucroBruto",
    label: "LUCRO BRUTO",
    format: "money",
    terms: [
      { lineKey: "receitaLiquida", multiplier: 1 },
      { lineKey: "custo", multiplier: 1 },
      { lineKey: "embalagem", multiplier: 1 },
    ],
    bold: true,
    shade: true,
  },
  {
    kind: "PARTICIPATION",
    key: "margemLB",
    label: "MARGEM DE LUCRO BRUTO",
    format: "percent",
    numerator: { lineKey: "lucroBruto" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
    bold: true,
    shade: true,
  },

  {
    kind: "DIRECT_FIELD",
    key: "quebra",
    label: "DESPESA COM AVARIA E CONSUMO DE PRODUTOS",
    format: "money",
    sourceField: "quebra",
    distributionStrategy: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  },
  {
    kind: "PARTICIPATION",
    key: "percQuebra",
    label: "%",
    format: "percent",
    numerator: { lineKey: "quebra" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
  },

  {
    kind: "DIRECT_FIELD",
    key: "recCom",
    label: "RECEITAS COMERCIAIS",
    format: "money",
    sourceField: "recCom",
    distributionStrategy: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  },
  {
    kind: "PARTICIPATION",
    key: "percRecCom",
    label: "%",
    format: "percent",
    numerator: { lineKey: "recCom" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
  },

  {
    kind: "DIRECT_FIELD",
    key: "despesaPessoal",
    label: "DESPESA DIRETA COM O PESSOAL",
    format: "money",
    sourceField: "despesaPessoal",
    distributionStrategy: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
    detail: {
      enabled: true,
      detailSourceType: "CUSTOM_SOURCE",
      detailSourceKey: "despesaPessoal",
      levels: 1,
    },
  },
  {
    kind: "PARTICIPATION",
    key: "percDespPes",
    label: "%",
    format: "percent",
    numerator: { lineKey: "despesaPessoal" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
  },
  {
    kind: "DIRECT_FIELD",
    key: "despesaPessoalRat",
    label: "DESPESA DIRETA COM O PESSOAL (Rateado)",
    format: "money",
    sourceField: "despesaPessoalRat",
    distributionStrategy: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
    detail: {
      enabled: true,
      detailSourceType: "CUSTOM_SOURCE",
      detailSourceKey: "despesaPessoalRat",
      levels: 1,
    },
  },
  {
    kind: "PARTICIPATION",
    key: "percDespPesRat",
    label: "%",
    format: "percent",
    numerator: { lineKey: "despesaPessoalRat" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
  },

  {
    kind: "SUM",
    key: "contribuicao",
    label: "CONTRIBUIÇÃO",
    format: "money",
    terms: [
      { lineKey: "lucroBruto", multiplier: 1 },
      { lineKey: "quebra", multiplier: 1 },
      { lineKey: "recCom", multiplier: 1 },
      { lineKey: "despesaPessoal", multiplier: 1 },
      { lineKey: "despesaPessoalRat", multiplier: 1 },
    ],
    bold: true,
    shade: true,
  },
  {
    kind: "PARTICIPATION",
    key: "margemContrib",
    label: "MARGEM DE CONTRIBUIÇÃO",
    format: "percent",
    numerator: { lineKey: "contribuicao" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
    bold: true,
    shade: true,
  },

  {
    kind: "DIRECT_FIELD",
    key: "despesaOperacional",
    label: "DESPESAS OPERACIONAIS",
    format: "money",
    sourceField: "despesaOperacional",
    distributionStrategy: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
    detail: {
      enabled: true,
      detailSourceType: "CUSTOM_SOURCE",
      detailSourceKey: "despesaOperacional",
      levels: 1,
    },
  },
  {
    kind: "PARTICIPATION",
    key: "percDespOper",
    label: "%",
    format: "percent",
    numerator: { lineKey: "despesaOperacional" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
  },

  {
    kind: "SUM",
    key: "ebitida",
    label: "EBITIDA",
    format: "money",
    terms: [
      { lineKey: "contribuicao", multiplier: 1 },
      { lineKey: "despesaOperacional", multiplier: 1 },
    ],
    bold: true,
    shade: true,
  },
  {
    kind: "PARTICIPATION",
    key: "margemEbitida",
    label: "MARGEM EBITIDA",
    format: "percent",
    numerator: { lineKey: "ebitida" },
    denominator: { lineKey: "recBruta" },
    baseMetric: { lineKey: "recBruta" },
    totalMode: "RATIO_OF_TOTALS",
    bold: true,
    shade: true,
  },
];
