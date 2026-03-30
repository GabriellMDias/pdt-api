import { ProductAssociationResolverService } from "./product-association-resolver.service";
import { StockFreezeResolverService } from "./stock-freeze-resolver.service";
import { StockMovementService } from "./stock-movement.service";
import { QueryExecutor } from "./stock-movement.types";

type MockQuery = jest.Mock<
  Promise<{ rows: any[] }>,
  [string, (readonly unknown[] | undefined)?]
>;

function createQueryExecutorWithSnapshots(snapshots: Record<string, any>): {
  client: QueryExecutor;
  queryMock: MockQuery;
} {
  const queryMock = jest.fn(
    async (queryText: string, values?: readonly unknown[]) => {
      if (queryText.includes("FROM produtocomplemento pc")) {
        const storeId = Number(values?.[0]);
        const productId = Number(values?.[1]);
        return {
          rows: [snapshots[`${storeId}:${productId}`]].filter(Boolean),
        };
      }

      return { rows: [] };
    },
  ) as MockQuery;

  return {
    client: {
      query: queryMock as unknown as QueryExecutor["query"],
    } as QueryExecutor,
    queryMock,
  };
}

describe("StockMovementService", () => {
  let service: StockMovementService;
  let stockFreezeResolver: jest.Mocked<StockFreezeResolverService>;
  let associationResolver: jest.Mocked<ProductAssociationResolverService>;

  beforeEach(() => {
    stockFreezeResolver = {
      isStockFrozen: jest.fn(),
    } as unknown as jest.Mocked<StockFreezeResolverService>;

    associationResolver = {
      resolveStockMovement: jest.fn(),
      listCostAssociations: jest.fn(),
      calculatePropagatedCost: jest.fn(),
    } as unknown as jest.Mocked<ProductAssociationResolverService>;

    associationResolver.listCostAssociations.mockResolvedValue([]);

    service = new StockMovementService(
      stockFreezeResolver,
      associationResolver,
    );
  });

  it("movimenta estoque normalmente quando nao esta congelado e o produto nao tem associado", async () => {
    associationResolver.resolveStockMovement.mockResolvedValue(null);
    stockFreezeResolver.isStockFrozen.mockResolvedValue(false);

    const { client, queryMock } = createQueryExecutorWithSnapshots({
      "1:191": {
        product_id: 191,
        active_status: true,
        stock_quantity: 10,
        cost_without_tax: 5,
        cost_with_tax: 6,
        average_cost_without_tax: 5,
        average_cost_with_tax: 6,
      },
    });

    const result = await service.applyMovement(
      {
        storeId: 1,
        originalProductId: 191,
        codigoUsuarioVrMaster: 7,
        movementTypeId: 11,
        quantity: 3,
        stockEntryType: 1,
        updateCost: false,
        stockObservation: "TESTE CONSUMO",
      },
      client,
    );

    expect(result.stockFrozen).toBe(false);
    expect(result.stockApplied).toBe(true);
    expect(result.stockProductId).toBe(191);
    expect(result.movedQuantity).toBe(3);
    expect(result.stockAfter).toBe(7);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO logestoque"),
      expect.arrayContaining([1, 191, 3, 11, 7, "TESTE CONSUMO", 10, 7, 1]),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE produtocomplemento"),
      [1, 191, 7],
    );
  });

  it("quando o estoque esta congelado nao atualiza estoque direto e registra em estoquecongelado", async () => {
    associationResolver.resolveStockMovement.mockResolvedValue(null);
    stockFreezeResolver.isStockFrozen.mockResolvedValue(true);

    const { client, queryMock } = createQueryExecutorWithSnapshots({
      "1:191": {
        product_id: 191,
        active_status: true,
        stock_quantity: 10,
        cost_without_tax: 5,
        cost_with_tax: 6,
        average_cost_without_tax: 5,
        average_cost_with_tax: 6,
      },
    });

    const result = await service.applyMovement(
      {
        storeId: 1,
        originalProductId: 191,
        codigoUsuarioVrMaster: 7,
        movementTypeId: 18,
        quantity: 2,
        stockEntryType: 1,
        updateCost: false,
      },
      client,
    );

    expect(result.stockFrozen).toBe(true);
    expect(result.stockApplied).toBe(false);
    expect(result.stockAfter).toBeNull();

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO estoquecongelado"),
      [191, 1, 18, 2, false, true, false, 1],
    );

    expect(
      queryMock.mock.calls.some(([query]) =>
        String(query).includes("INSERT INTO logestoque"),
      ),
    ).toBe(false);
    expect(
      queryMock.mock.calls.some(([query]) =>
        String(query).includes(
          "UPDATE produtocomplemento\n        SET estoque",
        ),
      ),
    ).toBe(false);
  });

  it("movimenta o produto associado correto com quantidade ajustada", async () => {
    associationResolver.resolveStockMovement.mockResolvedValue({
      originalProductId: 3639,
      resolvedProductId: 191,
      requestedQuantity: 10,
      resolvedQuantity: 15,
      primaryPackageQuantity: 1,
      associatedPackageQuantity: 1,
      percentage: 50,
    });
    stockFreezeResolver.isStockFrozen.mockResolvedValue(false);

    const { client, queryMock } = createQueryExecutorWithSnapshots({
      "1:191": {
        product_id: 191,
        active_status: true,
        stock_quantity: 20,
        cost_without_tax: 5,
        cost_with_tax: 6,
        average_cost_without_tax: 5,
        average_cost_with_tax: 6,
      },
    });

    const result = await service.applyMovement(
      {
        storeId: 1,
        originalProductId: 3639,
        codigoUsuarioVrMaster: 7,
        movementTypeId: 11,
        quantity: 10,
        stockEntryType: 1,
        updateCost: false,
      },
      client,
    );

    expect(queryMock.mock.calls[0]?.[1]).toEqual([1, 191]);
    expect(result.stockProductId).toBe(191);
    expect(result.movedQuantity).toBe(15);
    expect(result.stockAfter).toBe(5);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO logestoque"),
      expect.arrayContaining([1, 191, 15, 11, 7, "", 20, 5, 1]),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE produtocomplemento"),
      [1, 191, 5],
    );
  });
});
