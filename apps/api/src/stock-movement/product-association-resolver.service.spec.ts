import { ProductAssociationResolverService } from "./product-association-resolver.service";
import { QueryExecutor } from "./stock-movement.types";

describe("ProductAssociationResolverService", () => {
  let service: ProductAssociationResolverService;

  beforeEach(() => {
    service = new ProductAssociationResolverService();
  });

  it("resolve associado de estoque aplicando conversao e percentual", async () => {
    const client: QueryExecutor = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            primary_package_quantity: 1,
            associated_product_id: 191,
            associated_package_quantity: 1,
            percentage: 50,
          },
        ],
      }),
    };

    const result = await service.resolveStockMovement(3639, 10, client);

    expect(result).toEqual({
      originalProductId: 3639,
      resolvedProductId: 191,
      requestedQuantity: 10,
      resolvedQuantity: 15,
      primaryPackageQuantity: 1,
      associatedPackageQuantity: 1,
      percentage: 50,
    });
  });

  it("calcula custo propagado considerando embalagem e percentual", () => {
    const result = service.calculatePropagatedCost(
      {
        sourceProductId: 191,
        targetProductId: 3639,
        primaryPackageQuantity: 5,
        associatedPackageQuantity: 2,
        percentage: 50,
      },
      100,
    );

    expect(result).toBe(60);
  });
});
