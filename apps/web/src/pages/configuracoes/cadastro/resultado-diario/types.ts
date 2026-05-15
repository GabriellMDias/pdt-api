export type DailyResultLineSourceType =
  | "DIRECT_FIELD"
  | "PARTICIPATION"
  | "SUM"
  | "GROUP"
  | "DRE_VRMASTER";

export type DailyResultLineFormat = "money" | "percent";
export type DailyResultReferenceScope = "CURRENT" | "TOTAL";
export type DailyResultTotalMode = "RATIO_OF_TOTALS" | "FIXED_VALUE";
export type DailyResultDistributionStrategy =
  | "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT"
  | "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT"
  | "VRMASTER_COST_CENTER_EXACT";

export type DailyResultValueReference = {
  lineKey: string;
  scope?: DailyResultReferenceScope;
};

export type DailyResultSumTerm = {
  lineKey: string;
  multiplier: 1 | -1;
};

export type DailyResultVrDreTerm = {
  vrDreId: number;
  multiplier: 1 | -1;
};

export type DailyResultDreReconciliationGroup = {
  groupId: string;
  description: string;
  localLineIds: string[];
  vrDreTerms: DailyResultVrDreTerm[];
};

export type DailyResultDetailSourceType =
  | "CHILDREN"
  | "CUSTOM_SOURCE"
  | "DRE_VRMASTER";

export type DailyResultDetailConfig = {
  enabled?: boolean;
  detailEnabled?: boolean;
  detailSourceType?: DailyResultDetailSourceType;
  detailSourceKey?: string;
  children?: string[];
  levels?: number;
};

export type DailyResultLineConfig = {
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

export type DailyResultLinePayload = {
  lineId: string;
  label: string;
  order: number;
  sourceType: DailyResultLineSourceType;
  format?: DailyResultLineFormat | null;
  visible?: boolean;
  bold?: boolean;
  shade?: boolean;
  sourceConfig?: unknown;
  calculationConfig?: unknown;
  styleConfig?: unknown;
  vrDreId?: number | null;
  vrDreItemId?: number | null;
  vrDreType?: string | null;
  vrDreTotalizationType?: string | null;
  detailConfig?: unknown;
  active?: boolean;
};

export const DIRECT_FIELD_OPTIONS = [
  { value: "recBruta", label: "Receita bruta" },
  { value: "devolucao", label: "Devolucao" },
  { value: "imposto", label: "Imposto" },
  { value: "custo", label: "Custo produto" },
  { value: "embalagem", label: "Custo embalagem" },
  { value: "quebra", label: "Quebra / avaria / consumo" },
  { value: "recCom", label: "Receitas comerciais" },
  { value: "despesaPessoal", label: "Despesa pessoal" },
  { value: "despesaPessoalRat", label: "Despesa pessoal rateada" },
  { value: "despesaOperacional", label: "Despesa operacional" },
] as const;

export const SOURCE_TYPE_OPTIONS: Array<{
  value: DailyResultLineSourceType;
  label: string;
}> = [
  { value: "DIRECT_FIELD", label: "Campo direto" },
  { value: "PARTICIPATION", label: "Participacao / percentual" },
  { value: "SUM", label: "Soma de linhas" },
];

export const FORMAT_OPTIONS: Array<{
  value: DailyResultLineFormat;
  label: string;
}> = [
  { value: "money", label: "Valor monetario" },
  { value: "percent", label: "Percentual" },
];

export const DISTRIBUTION_STRATEGY_OPTIONS: Array<{
  value: DailyResultDistributionStrategy;
  label: string;
}> = [
  {
    value: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
    label: "Resultado atual + rateio da diferenca",
  },
  {
    value: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
    label: "Base VRMaster + rateio do que estiver sem centro de custo",
  },
  {
    value: "VRMASTER_COST_CENTER_EXACT",
    label: "Base VRMaster exata por centro de custo",
  },
];

export const DEFAULT_DISTRIBUTION_STRATEGY_BY_SOURCE_FIELD: Partial<
  Record<(typeof DIRECT_FIELD_OPTIONS)[number]["value"], DailyResultDistributionStrategy>
> = {
  recBruta: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  devolucao: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  imposto: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  custo: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  embalagem: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
  quebra: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  recCom: "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT",
  despesaPessoal: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
  despesaPessoalRat: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
  despesaOperacional: "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT",
};

export const DETAIL_SOURCE_OPTIONS: Array<{
  value: string;
  label: string;
  detailSourceType: DailyResultDetailSourceType;
  detailSourceKey: string;
  implementedLineIds: string[];
  defaultLevels: number;
}> = [
  {
    value: "recBruta",
    label: "Receita bruta",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "recBruta",
    implementedLineIds: ["recBruta"],
    defaultLevels: 1,
  },
  {
    value: "devolucao",
    label: "Devolucao",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "devolucao",
    implementedLineIds: ["devolucao"],
    defaultLevels: 1,
  },
  {
    value: "imposto",
    label: "Imposto",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "imposto",
    implementedLineIds: ["imposto"],
    defaultLevels: 1,
  },
  {
    value: "custo",
    label: "Custo produto",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "custo",
    implementedLineIds: ["custo"],
    defaultLevels: 1,
  },
  {
    value: "embalagem",
    label: "Custo embalagem",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "embalagem",
    implementedLineIds: ["embalagem"],
    defaultLevels: 1,
  },
  {
    value: "quebra",
    label: "Quebra / avaria / consumo",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "quebra",
    implementedLineIds: ["quebra"],
    defaultLevels: 1,
  },
  {
    value: "recCom",
    label: "Receitas comerciais",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "recCom",
    implementedLineIds: ["recCom"],
    defaultLevels: 1,
  },
  {
    value: "despesaPessoal",
    label: "Despesa pessoal",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "despesaPessoal",
    implementedLineIds: ["despesaPessoal"],
    defaultLevels: 1,
  },
  {
    value: "despesaPessoalRat",
    label: "Despesa pessoal rateada",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "despesaPessoalRat",
    implementedLineIds: ["despesaPessoalRat"],
    defaultLevels: 1,
  },
  {
    value: "despesaOperacional",
    label: "Despesa operacional",
    detailSourceType: "CUSTOM_SOURCE",
    detailSourceKey: "despesaOperacional",
    implementedLineIds: ["despesaOperacional"],
    defaultLevels: 1,
  },
];

export type VrMasterDreOption = {
  id: number;
  description: string;
  type: number;
  typeLabel: string;
  title?: boolean | null;
  order?: number | null;
  totalizationType?: number | null;
  totalizationTypeLabel?: string | null;
  itemCount?: number;
  accountItemCount?: number;
  groupItemCount?: number;
};
