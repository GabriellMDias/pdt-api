import { PoolClient } from 'pg';
import { MobileSyncEventDto } from './dto/push-mobile-sync-events.dto';

export type MobileSyncReceiptStatus =
  | 'processing'
  | 'processed'
  | 'temporary_error'
  | 'permanent_error';

export type MobileSyncAckStatus =
  | 'processed'
  | 'duplicate'
  | 'temporary_error'
  | 'permanent_error';

export type AuthenticatedMobileUser = {
  id: number;
  email: string;
  permissions: string[];
};

export type MobileSyncReceiptRow = {
  receipt_id: string;
  event_id: string;
  event_type: string;
  aggregate_type: string | null;
  aggregate_key: string | null;
  store_id: number | null;
  user_id: number;
  device_id: string | null;
  schema_version: number;
  payload_hash: string;
  request_payload_json: Record<string, unknown>;
  response_payload_json: Record<string, unknown> | null;
  status: MobileSyncReceiptStatus;
  error_code: string | null;
  error_message: string | null;
  processed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type MobileSyncProcessorContext = {
  event: MobileSyncEventDto;
  user: AuthenticatedMobileUser;
  client: PoolClient;
  receiptId: string;
  receivedAt: string;
};

export interface MobileSyncEventProcessor {
  canHandle(eventType: string): boolean;
  process(context: MobileSyncProcessorContext): Promise<unknown>;
}
