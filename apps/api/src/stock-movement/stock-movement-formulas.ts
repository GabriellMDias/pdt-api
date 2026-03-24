function assertPositivePackagingValue(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Valor invalido para ${fieldName} na configuracao de associado.`,
    );
  }
}

function assertPercentageRate(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Valor invalido para ${fieldName} no calculo tributario.`);
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateAssociatedStockQuantity(payload: {
  requestedQuantity: number;
  primaryPackageQuantity: number;
  associatedPackageQuantity: number;
  percentage: number;
}): number {
  assertPositivePackagingValue(
    payload.primaryPackageQuantity,
    "qtdembalagem_pri",
  );
  assertPositivePackagingValue(
    payload.associatedPackageQuantity,
    "qtdembalagem_ass",
  );

  const baseQuantity =
    payload.requestedQuantity *
    (payload.primaryPackageQuantity / payload.associatedPackageQuantity);

  const quantity = baseQuantity + (payload.percentage / 100) * baseQuantity;

  return Number(quantity.toFixed(3));
}

export function calculateAssociatedCostValue(payload: {
  baseCost: number;
  primaryPackageQuantity: number;
  associatedPackageQuantity: number;
  percentage: number;
}): number {
  assertPositivePackagingValue(
    payload.primaryPackageQuantity,
    "qtdembalagem_pri",
  );
  assertPositivePackagingValue(
    payload.associatedPackageQuantity,
    "qtdembalagem_ass",
  );

  const convertedCost =
    payload.baseCost /
    (payload.primaryPackageQuantity / payload.associatedPackageQuantity);

  const cost = convertedCost + (payload.percentage / 100) * convertedCost;

  return Number(cost.toFixed(4));
}

export function calculateAverageCost(payload: {
  actualStock: number;
  actualAverageCost: number;
  quantityToEnter: number;
  costToEnter: number;
}): number {
  if (payload.actualStock <= 0) {
    return Number(payload.costToEnter.toFixed(3));
  }

  const value =
    (payload.actualStock * payload.actualAverageCost +
      payload.quantityToEnter * payload.costToEnter) /
    (payload.actualStock + payload.quantityToEnter);

  return Number(value.toFixed(3));
}

export function calculateCostWithoutTaxFromProducedProductTaxes(payload: {
  costWithTax: number;
  pisCofinsRate: number;
  consumerTaxRate: number;
}): number {
  if (!Number.isFinite(payload.costWithTax) || payload.costWithTax < 0) {
    throw new Error(
      "Valor invalido para custocomimposto no calculo tributario da producao.",
    );
  }

  assertPercentageRate(payload.pisCofinsRate, "valorpis + valorcofins");
  assertPercentageRate(payload.consumerTaxRate, "porcentagemfinal");

  const totalRate = payload.pisCofinsRate + payload.consumerTaxRate;
  if (totalRate >= 100) {
    throw new Error(
      "Soma das aliquotas do produto produzido invalida para calcular custosemimposto.",
    );
  }

  const value = (payload.costWithTax * (100 - totalRate)) / 100;

  return roundTo(value, 3);
}
