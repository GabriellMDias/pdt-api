import { BadRequestException } from "@nestjs/common";
import { ProducaoService } from "./producao.service";
import { StockMovementService } from "src/stock-movement/stock-movement.service";
import { TransactionLogService } from "src/stock-movement/transaction-log.service";
import {
  AppliedCostUpdate,
  QueryExecutor,
  StockMovementResult,
} from "src/stock-movement/stock-movement.types";

type MockQuery = jest.Mock<
  Promise<{ rows: any[] }>,
  [string, (readonly unknown[] | undefined)?]
>;

function createRegisterMobileEntryClient(overrides?: {
  producedProductRow?: Record<string, unknown>;
  ingredientRows?: Record<string, unknown>[];
}): {
  client: QueryExecutor;
  queryMock: MockQuery;
} {
  const producedProductRow = {
    id: 5691,
    description: "Produto produzido",
    active_status: true,
    cost_without_tax: 0,
    cost_with_tax: 0,
    average_cost_without_tax: 0,
    average_cost_with_tax: 0,
    credit_tax_id: 10,
    debit_tax_id: 11,
    pis_cofins_rate: 9.25,
    consumer_tax_rate: 18,
    ...overrides?.producedProductRow,
  };

  const ingredientRows = overrides?.ingredientRows ?? [
    {
      product_id: 4746,
      quantity_used: 4,
      cost_with_tax_used: 30,
    },
  ];

  const queryMock = jest.fn(
    async (queryText: string) => {
      if (
        queryText.includes("FROM receita r") &&
        queryText.includes("JOIN receitaproduto rp") &&
        queryText.includes("LIMIT 1")
      ) {
        return {
          rows: [
            {
              id: 792,
              description: "FLV MIX",
              product_id: 5691,
              active_status: true,
              yield_quantity: 1,
            },
          ],
        };
      }

      if (queryText.includes("FROM produto p")) {
        return { rows: [producedProductRow] };
      }

      if (queryText.includes("FROM receitaitem ri")) {
        return { rows: ingredientRows };
      }

      if (queryText.includes("INSERT INTO producao (")) {
        return { rows: [{ id: 99 }] };
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

function createStockMovementResult(payload?: {
  originalProductId?: number;
  quantity?: number;
  baseCostUpdate?: AppliedCostUpdate | null;
}): StockMovementResult {
  return {
    originalProductId: payload?.originalProductId ?? 0,
    stockProductId: payload?.originalProductId ?? 0,
    requestedQuantity: payload?.quantity ?? 0,
    movedQuantity: payload?.quantity ?? 0,
    stockFrozen: false,
    stockApplied: true,
    stockTargetActive: true,
    stockBefore: 0,
    stockAfter: 0,
    stockAssociation: null,
    baseCostUpdate: payload?.baseCostUpdate ?? null,
    propagatedCostUpdates: [],
  };
}

describe("ProducaoService", () => {
  let service: ProducaoService;
  let stockMovementService: jest.Mocked<StockMovementService>;
  let transactionLogService: jest.Mocked<TransactionLogService>;

  beforeEach(() => {
    stockMovementService = {
      applyMovement: jest.fn(async (input) =>
        createStockMovementResult({
          originalProductId: input.originalProductId,
          quantity: input.quantity,
          baseCostUpdate: input.updateCost
            ? {
                productId: input.originalProductId,
                previousCostWithoutTax: 0,
                nextCostWithoutTax: input.costs?.costWithoutTax ?? 0,
                previousCostWithTax: 0,
                nextCostWithTax: input.costs?.costWithTax ?? 0,
                previousAverageCostWithoutTax: 0,
                nextAverageCostWithoutTax: input.costs?.costWithoutTax ?? 0,
                previousAverageCostWithTax: 0,
                nextAverageCostWithTax: input.costs?.costWithTax ?? 0,
                propagatedFromProductId: null,
              }
            : null,
        }),
      ),
    } as unknown as jest.Mocked<StockMovementService>;

    transactionLogService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TransactionLogService>;

    service = new ProducaoService(
      {} as never,
      stockMovementService,
      transactionLogService,
    );
  });

  it("derives costWithoutTax from the produced product taxes instead of the recipe item net cost", async () => {
    const { client } = createRegisterMobileEntryClient();

    await service.registerMobileEntry(
      {
        storeId: 1,
        recipeId: 792,
        productId: 5691,
        quantityInput: 2,
        userId: 7,
      },
      client,
    );

    expect(stockMovementService.applyMovement).toHaveBeenCalledTimes(2);
    expect(stockMovementService.applyMovement).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        storeId: 1,
        originalProductId: 5691,
        updateCost: true,
        quantity: 2,
        costs: {
          costWithTax: 15,
          costWithoutTax: 10.913,
        },
      }),
      client,
    );
  });

  it("fails safely when the produced product is missing the consumer tax configuration", async () => {
    const { client } = createRegisterMobileEntryClient({
      producedProductRow: {
        consumer_tax_rate: null,
      },
    });

    await expect(
      service.registerMobileEntry(
        {
          storeId: 1,
          recipeId: 792,
          productId: 5691,
          quantityInput: 2,
          userId: 7,
        },
        client,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(stockMovementService.applyMovement).not.toHaveBeenCalled();
  });
});
