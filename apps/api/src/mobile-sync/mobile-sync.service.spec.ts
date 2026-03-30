import { Test, TestingModule } from '@nestjs/testing';
import { PgService } from '../db/pg/pg.service';
import { MobileSyncPermanentError } from './mobile-sync.errors';
import { MobileSyncProcessorRegistry } from './mobile-sync.processor.registry';
import { MobileSyncReceiptsRepository } from './mobile-sync.receipts.repository';
import { MobileSyncService } from './mobile-sync.service';

describe('MobileSyncService', () => {
  let service: MobileSyncService;

  const pgMock = {
    transaction: jest.fn(),
  };

  const receiptsRepositoryMock = {
    findByEventId: jest.fn(),
    insertProcessingReceipt: jest.fn(),
    markProcessingForRetry: jest.fn(),
    markProcessed: jest.fn(),
    markFailed: jest.fn(),
  };

  const processorRegistryMock = {
    resolve: jest.fn(),
  };

  const user = {
    id: 10,
    email: 'user@test.com',
    permissions: [],
    codigoUsuarioVrMaster: 501,
  };

  const event = {
    eventId: '6d35fc53-c87e-4766-b3f6-70d43f112f8c',
    eventType: 'mobile.noop',
    schemaVersion: 1,
    payload: { ok: true },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    pgMock.transaction.mockImplementation(async (callback: any) => callback({ query: jest.fn() }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileSyncService,
        { provide: PgService, useValue: pgMock },
        { provide: MobileSyncReceiptsRepository, useValue: receiptsRepositoryMock },
        { provide: MobileSyncProcessorRegistry, useValue: processorRegistryMock },
      ],
    }).compile();

    service = module.get<MobileSyncService>(MobileSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve processar normalmente no primeiro envio', async () => {
    receiptsRepositoryMock.findByEventId.mockResolvedValue(null);
    receiptsRepositoryMock.insertProcessingReceipt.mockResolvedValue(undefined);
    processorRegistryMock.resolve.mockReturnValue({
      canHandle: () => true,
      process: jest.fn().mockResolvedValue({ accepted: true }),
    });

    const response = await service.pushEvents(user, { events: [event] });

    expect(receiptsRepositoryMock.insertProcessingReceipt).toHaveBeenCalledTimes(1);
    expect(receiptsRepositoryMock.markProcessed).toHaveBeenCalledTimes(1);
    expect(response.acknowledgements[0].status).toBe('processed');
    expect(response.summary.processed).toBe(1);
  });

  it('deve retornar duplicate quando o mesmo event_id for reenviado', async () => {
    jest.spyOn(service as any, 'computePayloadHash').mockReturnValue('fixed-hash');
    receiptsRepositoryMock.findByEventId.mockResolvedValue({
      receipt_id: 'receipt-1',
      event_id: event.eventId,
      event_type: event.eventType,
      aggregate_type: null,
      aggregate_key: null,
      store_id: null,
      user_id: user.id,
      device_id: null,
      schema_version: 1,
      payload_hash: 'fixed-hash',
      request_payload_json: event,
      response_payload_json: { accepted: true },
      status: 'processed',
      error_code: null,
      error_message: null,
      processed_at: '2026-03-18T12:00:00.000Z',
      created_at: '2026-03-18T12:00:00.000Z',
      updated_at: '2026-03-18T12:00:00.000Z',
    });

    const response = await service.pushEvents(user, { events: [event] });

    expect(receiptsRepositoryMock.insertProcessingReceipt).not.toHaveBeenCalled();
    expect(receiptsRepositoryMock.markProcessed).not.toHaveBeenCalled();
    expect(response.acknowledgements[0].status).toBe('duplicate');
    expect(response.summary.duplicates).toBe(1);
  });

  it('deve tratar erro de regra de negocio como permanente', async () => {
    receiptsRepositoryMock.findByEventId.mockResolvedValue(null);
    receiptsRepositoryMock.insertProcessingReceipt.mockResolvedValue(undefined);
    processorRegistryMock.resolve.mockReturnValue({
      canHandle: () => true,
      process: jest
        .fn()
        .mockRejectedValue(
          new MobileSyncPermanentError('business_rule_failed', 'Evento rejeitado pela regra.'),
        ),
    });

    const response = await service.pushEvents(user, { events: [event] });

    expect(receiptsRepositoryMock.markFailed).toHaveBeenCalledWith(
      expect.any(String),
      'permanent_error',
      'business_rule_failed',
      'Evento rejeitado pela regra.',
      expect.any(String),
      expect.anything(),
    );
    expect(response.acknowledgements[0].status).toBe('permanent_error');
    expect(response.acknowledgements[0].retryable).toBe(false);
  });

  it('deve retornar temporary_error quando o evento ja estiver em processamento', async () => {
    jest.spyOn(service as any, 'computePayloadHash').mockReturnValue('fixed-hash');
    receiptsRepositoryMock.findByEventId.mockResolvedValue({
      receipt_id: 'receipt-1',
      event_id: event.eventId,
      event_type: event.eventType,
      aggregate_type: null,
      aggregate_key: null,
      store_id: null,
      user_id: user.id,
      device_id: null,
      schema_version: 1,
      payload_hash: 'fixed-hash',
      request_payload_json: event,
      response_payload_json: null,
      status: 'processing',
      error_code: null,
      error_message: null,
      processed_at: null,
      created_at: '2026-03-18T12:00:00.000Z',
      updated_at: '2026-03-18T12:00:00.000Z',
    });

    const response = await service.pushEvents(user, { events: [event] });

    expect(response.acknowledgements[0].status).toBe('temporary_error');
    expect(response.acknowledgements[0].errorCode).toBe('event_in_progress');
    expect(response.acknowledgements[0].retryable).toBe(true);
    expect(receiptsRepositoryMock.insertProcessingReceipt).not.toHaveBeenCalled();
  });
});
