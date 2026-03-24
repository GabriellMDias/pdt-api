import {
  calculateAssociatedCostValue,
  calculateAssociatedStockQuantity,
  calculateAverageCost,
  calculateCostWithoutTaxFromProducedProductTaxes,
} from "./stock-movement-formulas";

describe("stock movement formulas", () => {
  it("calculates associated stock quantity with packaging conversion", () => {
    expect(
      calculateAssociatedStockQuantity({
        requestedQuantity: 10,
        primaryPackageQuantity: 7,
        associatedPackageQuantity: 2,
        percentage: 0,
      }),
    ).toBe(35);
  });

  it("calculates associated stock quantity with percentage increment", () => {
    expect(
      calculateAssociatedStockQuantity({
        requestedQuantity: 10,
        primaryPackageQuantity: 1,
        associatedPackageQuantity: 1,
        percentage: 50,
      }),
    ).toBe(15);
  });

  it("calculates associated cost with inverse packaging conversion", () => {
    expect(
      calculateAssociatedCostValue({
        baseCost: 100,
        primaryPackageQuantity: 5,
        associatedPackageQuantity: 2,
        percentage: 50,
      }),
    ).toBe(60);
  });

  it("calculates weighted average cost following the legacy rule", () => {
    expect(
      calculateAverageCost({
        actualStock: 10,
        actualAverageCost: 8,
        quantityToEnter: 5,
        costToEnter: 12,
      }),
    ).toBe(9.333);
  });

  it("derives cost without tax from the produced product taxes", () => {
    expect(
      calculateCostWithoutTaxFromProducedProductTaxes({
        costWithTax: 15,
        pisCofinsRate: 9.25,
        consumerTaxRate: 18,
      }),
    ).toBe(10.913);
  });
});
