import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PgService } from 'src/db/pg/pg.service';
import { MobileSyncEventDto, PushMobileSyncEventsDto } from './dto/push-mobile-sync-events.dto';
import {
  MobileSyncEventAckEntity,
  MobileSyncPushResponseEntity,
} from './entities/mobile-sync-ack.entity';
import { MobileSyncPermanentError, MobileSyncTemporaryError } from './mobile-sync.errors';
import { MobileSyncProcessorRegistry } from './mobile-sync.processor.registry';
import { MobileSyncReceiptsRepository } from './mobile-sync.receipts.repository';
import {
  AuthenticatedMobileUser,
  MobileSyncAckStatus,
  MobileSyncReceiptRow,
} from './mobile-sync.types';

@Injectable()
export class MobileSyncService {
  constructor(
    private readonly pg: PgService,
    private readonly receiptsRepository: MobileSyncReceiptsRepository,
    private readonly processorRegistry: MobileSyncProcessorRegistry,
  ) {}

  async pushEvents(
    user: AuthenticatedMobileUser,
    dto: PushMobileSyncEventsDto,
  ): Promise<MobileSyncPushResponseEntity> {
    const acknowledgements: MobileSyncEventAckEntity[] = [];

    for (const event of dto.events) {
      acknowledgements.push(await this.handleEvent(user, event));
    }

    return {
      acknowledgements,
      summary: {
        processed: acknowledgements.filter((ack) => ack.status === 'processed').length,
        duplicates: acknowledgements.filter((ack) => ack.status === 'duplicate').length,
        temporaryErrors: acknowledgements.filter((ack) => ack.status === 'temporary_error').length,
        permanentErrors: acknowledgements.filter((ack) => ack.status === 'permanent_error').length,
      },
    };
  }

  private async handleEvent(
    user: AuthenticatedMobileUser,
    event: MobileSyncEventDto,
  ): Promise<MobileSyncEventAckEntity> {
    const payloadHash = this.computePayloadHash(event);

    try {
      return await this.pg.transaction(async (client) => {
        const existingReceipt = await this.receiptsRepository.findByEventId(event.eventId, client);

        if (existingReceipt) {
          return this.handleExistingReceipt(user, event, payloadHash, existingReceipt, client);
        }

        const receiptId = randomUUID();
        const receivedAt = new Date().toISOString();

        await this.receiptsRepository.insertProcessingReceipt(
          {
            receiptId,
            eventId: event.eventId,
            eventType: event.eventType,
            aggregateType: event.aggregateType ?? null,
            aggregateKey: event.aggregateKey ?? null,
            storeId: event.storeId ?? null,
            userId: user.id,
            deviceId: event.deviceId ?? null,
            schemaVersion: event.schemaVersion,
            payloadHash,
            requestPayloadJson: JSON.stringify(event),
            createdAt: receivedAt,
          },
          client,
        );

        return this.processReceipt(user, event, receiptId, receivedAt, client);
      });
    } catch (error) {
      if (!this.isDuplicateEventConflict(error)) {
        throw error;
      }

      return this.pg.transaction(async (client) => {
        const existingReceipt = await this.receiptsRepository.findByEventId(event.eventId, client);

        if (!existingReceipt) {
          throw error;
        }

        return this.handleExistingReceipt(user, event, payloadHash, existingReceipt, client);
      });
    }
  }

  private async handleExistingReceipt(
    user: AuthenticatedMobileUser,
    event: MobileSyncEventDto,
    payloadHash: string,
    existingReceipt: MobileSyncReceiptRow,
    client: any,
  ): Promise<MobileSyncEventAckEntity> {
    if (existingReceipt.payload_hash !== payloadHash) {
      return this.buildAck({
        eventId: event.eventId,
        status: 'permanent_error',
        receiptId: existingReceipt.receipt_id,
        processedAt: this.toIsoString(existingReceipt.processed_at),
        errorCode: 'event_id_payload_mismatch',
        errorMessage: 'O mesmo event_id foi reenviado com payload diferente.',
      });
    }

    if (existingReceipt.status === 'processed') {
      return this.buildAck({
        eventId: event.eventId,
        status: 'duplicate',
        receiptId: existingReceipt.receipt_id,
        processedAt: this.toIsoString(existingReceipt.processed_at),
        errorCode: null,
        errorMessage: null,
      });
    }

    if (existingReceipt.status === 'permanent_error') {
      return this.buildAck({
        eventId: event.eventId,
        status: 'permanent_error',
        receiptId: existingReceipt.receipt_id,
        processedAt: this.toIsoString(existingReceipt.processed_at),
        errorCode: existingReceipt.error_code,
        errorMessage: existingReceipt.error_message,
      });
    }

    if (existingReceipt.status === 'processing') {
      return this.buildAck({
        eventId: event.eventId,
        status: 'temporary_error',
        receiptId: existingReceipt.receipt_id,
        processedAt: this.toIsoString(existingReceipt.processed_at),
        errorCode: 'event_in_progress',
        errorMessage: 'O evento ainda esta em processamento.',
      });
    }

    const retryAt = new Date().toISOString();
    await this.receiptsRepository.markProcessingForRetry(
      existingReceipt.receipt_id,
      retryAt,
      client,
    );

    return this.processReceipt(user, event, existingReceipt.receipt_id, retryAt, client);
  }

  private async processReceipt(
    user: AuthenticatedMobileUser,
    event: MobileSyncEventDto,
    receiptId: string,
    receivedAt: string,
    client: any,
  ): Promise<MobileSyncEventAckEntity> {
    const processor = this.processorRegistry.resolve(event.eventType);

    try {
      if (!processor) {
        throw new MobileSyncPermanentError(
          'unsupported_event_type',
          `Nenhum processor registrado para ${event.eventType}.`,
        );
      }

      const processorResponse =
        (await processor.process({
          event,
          user,
          client,
          receiptId,
          receivedAt,
        })) ?? { accepted: true };

      const processedAt = new Date().toISOString();
      await this.receiptsRepository.markProcessed(
        receiptId,
        JSON.stringify(processorResponse),
        processedAt,
        client,
      );

      return this.buildAck({
        eventId: event.eventId,
        status: 'processed',
        receiptId,
        processedAt,
        errorCode: null,
        errorMessage: null,
      });
    } catch (error) {
      if (error instanceof MobileSyncPermanentError) {
        await this.receiptsRepository.markFailed(
          receiptId,
          'permanent_error',
          error.code,
          error.message,
          new Date().toISOString(),
          client,
        );

        return this.buildAck({
          eventId: event.eventId,
          status: 'permanent_error',
          receiptId,
          processedAt: null,
          errorCode: error.code,
          errorMessage: error.message,
        });
      }

      const temporaryError =
        error instanceof MobileSyncTemporaryError
          ? error
          : new MobileSyncTemporaryError(
              'temporary_processing_error',
              error instanceof Error ? error.message : 'Falha temporaria ao processar evento.',
            );

      await this.receiptsRepository.markFailed(
        receiptId,
        'temporary_error',
        temporaryError.code,
        temporaryError.message,
        new Date().toISOString(),
        client,
      );

      return this.buildAck({
        eventId: event.eventId,
        status: 'temporary_error',
        receiptId,
        processedAt: null,
        errorCode: temporaryError.code,
        errorMessage: temporaryError.message,
      });
    }
  }

  private buildAck(payload: {
    eventId: string;
    status: MobileSyncAckStatus;
    receiptId: string;
    processedAt: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  }): MobileSyncEventAckEntity {
    return {
      eventId: payload.eventId,
      status: payload.status,
      receiptId: payload.receiptId,
      processedAt: payload.processedAt,
      errorCode: payload.errorCode,
      errorMessage: payload.errorMessage,
      retryable: payload.status === 'temporary_error',
    };
  }

  private computePayloadHash(event: MobileSyncEventDto): string {
    const canonical = this.stableStringify({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType ?? null,
      aggregateKey: event.aggregateKey ?? null,
      storeId: event.storeId ?? null,
      deviceId: event.deviceId ?? null,
      schemaVersion: event.schemaVersion,
      payload: event.payload,
    });

    return createHash('sha256').update(canonical).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );

    return `{${entries
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${this.stableStringify(nestedValue)}`)
      .join(',')}}`;
  }

  private toIsoString(value: Date | string | null): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  }

  private isDuplicateEventConflict(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const pgError = error as { code?: string; constraint?: string; message?: string };

    if (pgError.code !== '23505') {
      return false;
    }

    return (
      pgError.constraint === 'uq_mobile_event_receipts_event_id' ||
      pgError.message?.includes('uq_mobile_event_receipts_event_id') === true
    );
  }
}
