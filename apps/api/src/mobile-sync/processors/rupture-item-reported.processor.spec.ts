import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RupturaService } from '../../adm/ruptura/ruptura.service';
import { MobileSyncPermanentError } from '../mobile-sync.errors';
import { RuptureItemReportedProcessor } from './rupture-item-reported.processor';

describe('RuptureItemReportedProcessor', () => {
  let processor: RuptureItemReportedProcessor;

  const rupturaServiceMock = {
    registerCollectorItem: jest.fn(),
  };

  const context = {
    event: {
      eventId: '6d35fc53-c87e-4766-b3f6-70d43f112f8c',
      eventType: 'rupture.item.reported',
      storeId: 1,
      schemaVersion: 1,
      payload: {
        shelfCode: '12',
        productId: 99,
        barcode: '789123',
        productDescription: 'Produto Teste',
      },
    },
    user: {
      id: 10,
      email: 'user@test.com',
      permissions: [],
    },
    client: {
      query: jest.fn(),
    },
    receiptId: 'receipt-1',
    receivedAt: '2026-03-18T12:00:00.000Z',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuptureItemReportedProcessor,
        { provide: RupturaService, useValue: rupturaServiceMock },
      ],
    }).compile();

    processor = module.get<RuptureItemReportedProcessor>(RuptureItemReportedProcessor);
  });

  it('deve registrar item de ruptura valido', async () => {
    rupturaServiceMock.registerCollectorItem.mockResolvedValue({
      productId: 99,
      description: 'Produto Teste',
    });

    const response = await processor.process(context as never);

    expect(rupturaServiceMock.registerCollectorItem).toHaveBeenCalledWith(
      {
        storeId: 1,
        productId: 99,
        shelfCode: '12',
      },
      context.client,
    );
    expect(response).toMatchObject({
      accepted: true,
      domain: 'rupture',
      productId: 99,
      shelfCode: '12',
    });
  });

  it('deve rejeitar payload invalido como erro permanente', async () => {
    await expect(
      processor.process({
        ...context,
        event: {
          ...context.event,
          payload: {
            shelfCode: '',
            productId: 99,
          },
        },
      } as never),
    ).rejects.toBeInstanceOf(MobileSyncPermanentError);
  });

  it('deve converter produto inexistente em erro permanente', async () => {
    rupturaServiceMock.registerCollectorItem.mockRejectedValue(
      new NotFoundException('Produto 99 nao encontrado para a loja 1.'),
    );

    await expect(processor.process(context as never)).rejects.toMatchObject({
      code: 'rupture_product_not_found',
    });
  });
});
