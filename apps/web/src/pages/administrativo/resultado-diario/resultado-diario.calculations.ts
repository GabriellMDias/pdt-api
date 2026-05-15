import type { DRE, DREByCostCenter } from "./types";
import {
  RESULTADO_DIARIO_DIRECT_FIELDS,
  RESULTADO_DIARIO_LINE_CONFIG,
  type ResultadoDiarioDirectField,
  type ResultadoDiarioLineConfig,
  type ResultadoDiarioValueReference,
} from "./resultado-diario.config";

export type ResultadoDiarioResolvedValues = Record<string, number>;

export type ResultadoDiarioResolvedTable = {
  byCostCenter: Record<number, ResultadoDiarioResolvedValues>;
  total: ResultadoDiarioResolvedValues;
};

type ResolveScope = "CURRENT" | "TOTAL";

type ResolveContext = {
  raw: DRE;
  totalRaw: DRE;
  values: ResultadoDiarioResolvedValues;
  totalValues?: ResultadoDiarioResolvedValues;
  linesByKey: Map<string, ResultadoDiarioLineConfig>;
  scope: ResolveScope;
  resolving: Set<string>;
};

const emptyDre = (): DRE => ({
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
});

export function resolveResultadoDiarioTable(
  data: DREByCostCenter[],
  lines: readonly ResultadoDiarioLineConfig[] = RESULTADO_DIARIO_LINE_CONFIG,
): ResultadoDiarioResolvedTable {
  const totalRaw = calculateDirectTotals(data);
  const linesByKey = new Map(lines.map((line) => [line.key, line]));

  const total = resolveValuesForRaw({
    raw: totalRaw,
    totalRaw,
    lines,
    linesByKey,
    scope: "TOTAL",
  });

  const byCostCenter: Record<number, ResultadoDiarioResolvedValues> = {};

  for (const row of data) {
    byCostCenter[row.costCenterId] = resolveValuesForRaw({
      raw: row.data,
      totalRaw,
      totalValues: total,
      lines,
      linesByKey,
      scope: "CURRENT",
    });
  }

  return { byCostCenter, total };
}

function calculateDirectTotals(data: DREByCostCenter[]): DRE {
  return data.reduce((acc, row) => {
    for (const field of RESULTADO_DIARIO_DIRECT_FIELDS) {
      acc[field] += row.data[field] ?? 0;
    }

    return acc;
  }, emptyDre());
}

function resolveValuesForRaw({
  raw,
  totalRaw,
  totalValues,
  lines,
  linesByKey,
  scope,
}: {
  raw: DRE;
  totalRaw: DRE;
  totalValues?: ResultadoDiarioResolvedValues;
  lines: readonly ResultadoDiarioLineConfig[];
  linesByKey: Map<string, ResultadoDiarioLineConfig>;
  scope: ResolveScope;
}): ResultadoDiarioResolvedValues {
  const values: ResultadoDiarioResolvedValues = {};
  const context: ResolveContext = {
    raw,
    totalRaw,
    totalValues,
    values,
    linesByKey,
    scope,
    resolving: new Set<string>(),
  };

  for (const line of lines) {
    values[line.key] = resolveLineValue(line.key, context);
  }

  return values;
}

function resolveLineValue(key: string, context: ResolveContext): number {
  if (context.values[key] !== undefined) return context.values[key];

  const line = context.linesByKey.get(key);
  if (!line) return 0;

  if (context.resolving.has(key)) {
    throw new Error(`Circular Resultado Diario line configuration: ${key}`);
  }

  context.resolving.add(key);

  let value = 0;

  switch (line.kind) {
    case "DIRECT_FIELD":
      value = getFieldValue(context.raw, line.sourceField);
      break;
    case "SUM":
      value = line.terms.reduce((sum, term) => {
        const multiplier = term.multiplier ?? 1;
        return sum + resolveLineValue(term.lineKey, context) * multiplier;
      }, 0);
      break;
    case "PARTICIPATION": {
      if (context.scope === "TOTAL" && line.totalMode === "FIXED_VALUE") {
        value = line.fixedTotalValue ?? 0;
        break;
      }

      const denominator = resolveReference(line.denominator, context);
      value = denominator ? resolveReference(line.numerator, context) / denominator : 0;
      break;
    }
    case "DRE_VRMASTER":
    case "GROUP":
      value = 0;
      break;
  }

  context.values[key] = value;
  context.resolving.delete(key);

  return value;
}

function resolveReference(
  reference: ResultadoDiarioValueReference,
  context: ResolveContext,
): number {
  const scope = reference.scope ?? "CURRENT";

  if ("sourceField" in reference) {
    return getFieldValue(scope === "TOTAL" ? context.totalRaw : context.raw, reference.sourceField);
  }

  if (scope === "TOTAL" && context.scope !== "TOTAL") {
    return context.totalValues?.[reference.lineKey] ?? 0;
  }

  return resolveLineValue(reference.lineKey, context);
}

function getFieldValue(raw: DRE, field: ResultadoDiarioDirectField): number {
  return raw[field] ?? 0;
}
