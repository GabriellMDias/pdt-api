import { QueryExecutor } from "./stock-movement.types";
import { TransactionLogService } from "./transaction-log.service";

describe("TransactionLogService", () => {
  let service: TransactionLogService;

  beforeEach(() => {
    service = new TransactionLogService();
  });

  it("centraliza o insert em logtransacao com fallback de referencia e ipterminal normalizado", async () => {
    const client: QueryExecutor = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await service.register(
      {
        storeId: 1,
        productId: 191,
        formId: 9,
        transactionTypeId: 1,
        userId: 99,
        ipTerminal: "MOBILE-SYNC",
      },
      client,
    );

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO logtransacao"),
      [1, 191, 9, 1, "", 99, "/MOBILE-SYNC", 191, ""],
    );
  });

  it("preserva referenceId explicito e remove barras duplicadas do ipterminal", async () => {
    const client: QueryExecutor = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };

    await service.register(
      {
        storeId: 5,
        productId: 3639,
        formId: 196,
        transactionTypeId: 1,
        userId: 7,
        ipTerminal: "/10.0.0.20",
        observation: "ALTERA ESTOQUE",
        referenceId: 0,
        alteracao: "X",
      },
      client,
    );

    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO logtransacao"),
      [5, 3639, 196, 1, "ALTERA ESTOQUE", 7, "/10.0.0.20", 0, "X"],
    );
  });
});
