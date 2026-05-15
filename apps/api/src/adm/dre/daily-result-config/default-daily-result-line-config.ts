import {
  DailyResultLineFormat,
  DailyResultLineSourceType,
  Prisma,
} from "@prisma/client";

export type DefaultDailyResultLineConfig = {
  lineId: string;
  label: string;
  order: number;
  sourceType: DailyResultLineSourceType;
  format?: DailyResultLineFormat | null;
  visible?: boolean;
  bold?: boolean;
  shade?: boolean;
  sourceConfig?: Prisma.InputJsonValue | null;
  calculationConfig?: Prisma.InputJsonValue | null;
  styleConfig?: Prisma.InputJsonValue | null;
  vrDreId?: number | null;
  vrDreItemId?: number | null;
  vrDreType?: string | null;
  vrDreTotalizationType?: string | null;
  detailConfig?: Prisma.InputJsonValue | null;
  active?: boolean;
};

const DESPESA_PESSOAL_RECONCILIATION_GROUP = {
  groupId: "despesa-pessoal-total",
  description: "Despesa direta com pessoal total",
  localLineIds: ["despesaPessoal", "despesaPessoalRat"],
  vrDreTerms: [{ vrDreId: 8, multiplier: 1 }],
};

const PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT =
  "PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT";
const VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT =
  "VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT";

const lineDetailConfig = (lineId: string): Prisma.InputJsonValue => ({
  enabled: true,
  detailSourceType: "CUSTOM_SOURCE",
  detailSourceKey: lineId,
  levels: 1,
});

export const DEFAULT_DAILY_RESULT_LINE_CONFIG: DefaultDailyResultLineConfig[] =
  [
    {
      lineId: "participacao",
      label: "PARTICIPAÇÃO (%)",
      order: 1,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      calculationConfig: {
        numerator: { lineKey: "recBruta" },
        denominator: { lineKey: "recBruta", scope: "TOTAL" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "FIXED_VALUE",
        fixedTotalValue: 1,
      },
    },
    {
      lineId: "recBruta",
      label: "RECEITA BRUTA DE VENDAS",
      order: 2,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      bold: true,
      shade: true,
      sourceConfig: {
        sourceField: "recBruta",
        distributionStrategy: PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 1, multiplier: 1 }],
        vrDreIds: [1],
      },
      vrDreId: 1,
      detailConfig: lineDetailConfig("recBruta"),
    },
    {
      lineId: "devolucao",
      label: "DEVOLUÇÃO DE VENDAS",
      order: 3,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "devolucao",
        distributionStrategy: PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 45, multiplier: 1 }],
        vrDreIds: [45],
      },
      vrDreId: 45,
      detailConfig: lineDetailConfig("devolucao"),
    },
    {
      lineId: "imposto",
      label: "IMPOSTO SOBRE VENDAS",
      order: 4,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "imposto",
        distributionStrategy: PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 2, multiplier: 1 }],
        vrDreIds: [2],
      },
      vrDreId: 2,
      detailConfig: lineDetailConfig("imposto"),
    },
    {
      lineId: "receitaLiquida",
      label: "RECEITA LIQUIDA DE VENDAS",
      order: 5,
      sourceType: DailyResultLineSourceType.SUM,
      format: DailyResultLineFormat.money,
      bold: true,
      shade: true,
      calculationConfig: {
        terms: [
          { lineKey: "recBruta", multiplier: 1 },
          { lineKey: "devolucao", multiplier: 1 },
          { lineKey: "imposto", multiplier: 1 },
        ],
      },
    },
    {
      lineId: "custo",
      label: "CUSTO PRODUTO",
      order: 6,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "custo",
        distributionStrategy: PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 5, multiplier: 1 }],
        vrDreIds: [5],
      },
      vrDreId: 5,
      detailConfig: lineDetailConfig("custo"),
    },
    {
      lineId: "embalagem",
      label: "CUSTO EMBALAGEM",
      order: 7,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "embalagem",
        distributionStrategy:
          VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 46, multiplier: 1 }],
        vrDreIds: [46],
      },
      vrDreId: 46,
      detailConfig: lineDetailConfig("embalagem"),
    },
    {
      lineId: "lucroBruto",
      label: "LUCRO BRUTO",
      order: 8,
      sourceType: DailyResultLineSourceType.SUM,
      format: DailyResultLineFormat.money,
      bold: true,
      shade: true,
      calculationConfig: {
        terms: [
          { lineKey: "receitaLiquida", multiplier: 1 },
          { lineKey: "custo", multiplier: 1 },
          { lineKey: "embalagem", multiplier: 1 },
        ],
      },
    },
    {
      lineId: "margemLB",
      label: "MARGEM DE LUCRO BRUTO",
      order: 9,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      bold: true,
      shade: true,
      calculationConfig: {
        numerator: { lineKey: "lucroBruto" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "quebra",
      label: "DESPESA COM AVARIA E CONSUMO DE PRODUTOS",
      order: 10,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "quebra",
        distributionStrategy: PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 17, multiplier: 1 }],
        vrDreIds: [17],
      },
      vrDreId: 17,
      detailConfig: lineDetailConfig("quebra"),
    },
    {
      lineId: "percQuebra",
      label: "%",
      order: 11,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      calculationConfig: {
        numerator: { lineKey: "quebra" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "recCom",
      label: "RECEITAS COMERCIAIS",
      order: 12,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "recCom",
        distributionStrategy: PDT_RESULT_WITH_DIFFERENCE_APPORTIONMENT,
        vrDreTerms: [{ vrDreId: 22, multiplier: 1 }],
        vrDreIds: [22],
      },
      detailConfig: lineDetailConfig("recCom"),
    },
    {
      lineId: "percRecCom",
      label: "%",
      order: 13,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      calculationConfig: {
        numerator: { lineKey: "recCom" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "despesaPessoal",
      label: "DESPESA DIRETA COM O PESSOAL",
      order: 14,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "despesaPessoal",
        distributionStrategy:
          VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT,
        dreReconciliationGroups: [DESPESA_PESSOAL_RECONCILIATION_GROUP],
      },
      detailConfig: lineDetailConfig("despesaPessoal"),
    },
    {
      lineId: "percDespPes",
      label: "%",
      order: 15,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      calculationConfig: {
        numerator: { lineKey: "despesaPessoal" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "despesaPessoalRat",
      label: "DESPESA DIRETA COM O PESSOAL (Rateado)",
      order: 16,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "despesaPessoalRat",
        distributionStrategy:
          VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT,
        dreReconciliationGroups: [DESPESA_PESSOAL_RECONCILIATION_GROUP],
      },
      detailConfig: lineDetailConfig("despesaPessoalRat"),
    },
    {
      lineId: "percDespPesRat",
      label: "%",
      order: 17,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      calculationConfig: {
        numerator: { lineKey: "despesaPessoalRat" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "contribuicao",
      label: "CONTRIBUIÇÃO",
      order: 18,
      sourceType: DailyResultLineSourceType.SUM,
      format: DailyResultLineFormat.money,
      bold: true,
      shade: true,
      calculationConfig: {
        terms: [
          { lineKey: "lucroBruto", multiplier: 1 },
          { lineKey: "quebra", multiplier: 1 },
          { lineKey: "recCom", multiplier: 1 },
          { lineKey: "despesaPessoal", multiplier: 1 },
          { lineKey: "despesaPessoalRat", multiplier: 1 },
        ],
      },
    },
    {
      lineId: "margemContrib",
      label: "MARGEM DE CONTRIBUIÇÃO",
      order: 19,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      bold: true,
      shade: true,
      calculationConfig: {
        numerator: { lineKey: "contribuicao" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "despesaOperacional",
      label: "DESPESAS OPERACIONAIS",
      order: 20,
      sourceType: DailyResultLineSourceType.DIRECT_FIELD,
      format: DailyResultLineFormat.money,
      sourceConfig: {
        sourceField: "despesaOperacional",
        distributionStrategy:
          VRMASTER_COST_CENTER_BASE_WITH_FALLBACK_APPORTIONMENT,
        vrDreTerms: [
          { vrDreId: 36, multiplier: 1 },
          { vrDreId: 23, multiplier: 1 },
          { vrDreId: 21, multiplier: 1 },
          { vrDreId: 20, multiplier: 1 },
          { vrDreId: 19, multiplier: 1 },
          { vrDreId: 18, multiplier: 1 },
          { vrDreId: 16, multiplier: 1 },
          { vrDreId: 15, multiplier: 1 },
          { vrDreId: 14, multiplier: 1 },
          { vrDreId: 13, multiplier: 1 },
          { vrDreId: 12, multiplier: 1 },
          { vrDreId: 11, multiplier: 1 },
          { vrDreId: 10, multiplier: 1 },
          { vrDreId: 9, multiplier: 1 },
        ],
        vrDreIds: [36, 23, 21, 20, 19, 18, 16, 15, 14, 13, 12, 11, 10, 9],
      },
      vrDreId: 36,
      detailConfig: lineDetailConfig("despesaOperacional"),
    },
    {
      lineId: "percDespOper",
      label: "%",
      order: 21,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      calculationConfig: {
        numerator: { lineKey: "despesaOperacional" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
    {
      lineId: "ebitida",
      label: "EBITIDA",
      order: 22,
      sourceType: DailyResultLineSourceType.SUM,
      format: DailyResultLineFormat.money,
      bold: true,
      shade: true,
      calculationConfig: {
        terms: [
          { lineKey: "contribuicao", multiplier: 1 },
          { lineKey: "despesaOperacional", multiplier: 1 },
        ],
      },
    },
    {
      lineId: "margemEbitida",
      label: "MARGEM EBITIDA",
      order: 23,
      sourceType: DailyResultLineSourceType.PARTICIPATION,
      format: DailyResultLineFormat.percent,
      bold: true,
      shade: true,
      calculationConfig: {
        numerator: { lineKey: "ebitida" },
        denominator: { lineKey: "recBruta" },
        baseMetric: { lineKey: "recBruta" },
        totalMode: "RATIO_OF_TOTALS",
      },
    },
  ];
