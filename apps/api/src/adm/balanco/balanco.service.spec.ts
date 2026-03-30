import { BalancoService } from './balanco.service';
import { QueryExecutor } from 'src/stock-movement/stock-movement.types';
import { TransactionLogService } from 'src/stock-movement/transaction-log.service';

type MockQuery = jest.Mock<
  Promise<{ rows: any[] }>,
  [string, (readonly unknown[] | undefined)?]
>;

function createRegisterMobileEntryClient(): {
  client: QueryExecutor;
  queryMock: MockQuery;
} {
  const queryMock = jest.fn(
    async (queryText: string) => {
      if (queryText.includes('FROM balanco b')) {
        return {
          rows: [
            {
              id: 77,
              description: 'Balanco Rotativo',
              stock_label: 'Loja',
              status_code: 0,
            },
          ],
        };
      }

      if (queryText.includes('FROM produto p')) {
        return {
          rows: [
            {
              id: 191,
              description: 'Produto Teste',
              active_status: true,
              cost_without_tax: 5,
              cost_with_tax: 6,
              average_cost_without_tax: 5,
              average_cost_with_tax: 6,
            },
          ],
        };
      }

      if (queryText.includes('FROM balancoestoque')) {
        return {
          rows: [{ quantity: 10 }],
        };
      }

      return { rows: [] };
    },
  ) as MockQuery;

  return {
    client: {
      query: queryMock as unknown as QueryExecutor['query'],
    } as QueryExecutor,
    queryMock,
  };
}

describe('BalancoService', () => {
  let service: BalancoService;
  let transactionLogService: jest.Mocked<TransactionLogService>;

  beforeEach(() => {
    transactionLogService = {
      register: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TransactionLogService>;

    service = new BalancoService({} as never, transactionLogService);
  });

  it('reutiliza TransactionLogService e nao faz insert manual em logtransacao', async () => {
    const { client, queryMock } = createRegisterMobileEntryClient();

    await service.registerMobileEntry(
      {
        storeId: 1,
        balanceId: 77,
        productId: 191,
        signedQuantity: 2,
        totalQuantity: 2,
        quantityInput: 2,
        packageCount: 1,
        codigoUsuarioVrMaster: 501,
      },
      client,
    );

    expect(transactionLogService.register).toHaveBeenCalledWith(
      {
        storeId: 1,
        productId: 191,
        formId: 61,
        transactionTypeId: 2,
        codigoUsuarioVrMaster: 501,
        ipTerminal: 'MOBILE-SYNC',
      },
      client,
    );

    expect(
      queryMock.mock.calls.some(([query]) =>
        String(query).includes('INSERT INTO logtransacao'),
      ),
    ).toBe(false);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE balancoestoque'),
      [77, 191, 1, 12, 5, 6, 5, 6],
    );
  });
});
