import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { MobileSyncReceiptRow, MobileSyncReceiptStatus } from './mobile-sync.types';

type InsertReceiptInput = {
  receiptId: string;
  eventId: string;
  eventType: string;
  aggregateType: string | null;
  aggregateKey: string | null;
  storeId: number | null;
  userId: number;
  deviceId: string | null;
  schemaVersion: number;
  payloadHash: string;
  requestPayloadJson: string;
  createdAt: string;
};

@Injectable()
export class MobileSyncReceiptsRepository {
  async findByEventId(
    eventId: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<MobileSyncReceiptRow | null> {
    const result = await client.query<MobileSyncReceiptRow>(
      `
        SELECT
          receipt_id,
          event_id,
          event_type,
          aggregate_type,
          aggregate_key,
          store_id,
          user_id,
          device_id,
          schema_version,
          payload_hash,
          request_payload_json,
          response_payload_json,
          status,
          error_code,
          error_message,
          processed_at,
          created_at,
          updated_at
        FROM pdtconnect.mobile_event_receipts
        WHERE event_id = $1
        FOR UPDATE
        LIMIT 1
      `,
      [eventId],
    );

    return result.rows[0] ?? null;
  }

  async insertProcessingReceipt(
    input: InsertReceiptInput,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO pdtconnect.mobile_event_receipts (
          receipt_id,
          event_id,
          event_type,
          aggregate_type,
          aggregate_key,
          store_id,
          user_id,
          device_id,
          schema_version,
          payload_hash,
          request_payload_json,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'processing', $12, $12)
      `,
      [
        input.receiptId,
        input.eventId,
        input.eventType,
        input.aggregateType,
        input.aggregateKey,
        input.storeId,
        input.userId,
        input.deviceId,
        input.schemaVersion,
        input.payloadHash,
        input.requestPayloadJson,
        input.createdAt,
      ],
    );
  }

  async markProcessingForRetry(
    receiptId: string,
    updatedAt: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        UPDATE pdtconnect.mobile_event_receipts
        SET
          status = 'processing',
          error_code = NULL,
          error_message = NULL,
          updated_at = $2
        WHERE receipt_id = $1
      `,
      [receiptId, updatedAt],
    );
  }

  async markProcessed(
    receiptId: string,
    responsePayloadJson: string,
    processedAt: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        UPDATE pdtconnect.mobile_event_receipts
        SET
          status = 'processed',
          response_payload_json = $2::jsonb,
          error_code = NULL,
          error_message = NULL,
          processed_at = $3,
          updated_at = $3
        WHERE receipt_id = $1
      `,
      [receiptId, responsePayloadJson, processedAt],
    );
  }

  async markFailed(
    receiptId: string,
    status: Extract<MobileSyncReceiptStatus, 'temporary_error' | 'permanent_error'>,
    errorCode: string,
    errorMessage: string,
    updatedAt: string,
    client: Pick<PoolClient, 'query'>,
  ): Promise<void> {
    await client.query(
      `
        UPDATE pdtconnect.mobile_event_receipts
        SET
          status = $2,
          error_code = $3,
          error_message = $4,
          updated_at = $5
        WHERE receipt_id = $1
      `,
      [receiptId, status, errorCode, errorMessage, updatedAt],
    );
  }
}
