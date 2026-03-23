import * as Crypto from 'expo-crypto';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import {
  countExchangeEntriesByStore,
  deleteExchangeEntryWithOutboxByEventId,
  getExchangeReasonById,
  getExchangeSignedBalanceByProductAndReason,
  getPendingExchangeSignedBalanceByProductAndReason,
  insertExchangeEntry,
  insertSyncOutboxEvent,
  listExchangeEntriesByStore,
  listExchangeReasons,
} from '@/src/database/repositories';
import type { ExchangeEntryListRow, ExchangeReasonRow } from '@/src/database/types';
import { buildSyncPayloadHash, ensureSyncDeviceId } from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  getLocalCatalogCount,
  getLocalCatalogProductById,
  getProductCatalogLastSyncedAt,
  searchLocalCatalogProducts,
} from '@/src/features/shared/products/data/product-catalog-db';
import type {
  CreateLocalTrocaEntryResult,
  CreateTrocaEntryInput,
  LocalExchangeReason,
  LocalTrocaCatalogProduct,
  LocalTrocaEntry,
} from '@/src/features/troca/types';

const EXCHANGE_EVENT_TYPE = 'exchange.item.recorded';
const EXCHANGE_SCHEMA_VERSION = 1;

function mapExchangeReason(row: ExchangeReasonRow): LocalExchangeReason {
  return {
    id: row.id,
    description: row.description,
    activeStatus: row.active_status === 1,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function resolveSyncStatus(row: ExchangeEntryListRow): LocalTrocaEntry['syncStatus'] {
  if (row.outbox_status === 'sending') {
    return 'sending';
  }

  if (row.outbox_status === 'success') {
    return 'sent';
  }

  if (row.outbox_status === 'failed' && row.failure_class === 'temporary') {
    return 'error_temporary';
  }

  if (row.outbox_status === 'failed' && row.failure_class === 'permanent') {
    return 'error_permanent';
  }

  return 'pending';
}

function mapExchangeEntry(row: ExchangeEntryListRow): LocalTrocaEntry {
  const signedQuantity = row.movement_type === 'add' ? row.total_quantity : -row.total_quantity;

  return {
    localId: row.local_id,
    eventId: row.event_id,
    userId: row.user_id,
    storeId: row.store_id,
    reasonId: row.reason_id,
    reasonDescription: row.reason_description,
    productId: row.product_id,
    barcode: row.barcode,
    productDescription: row.product_description,
    movementType: row.movement_type,
    quantityInput: row.quantity_input,
    packageCount: row.package_count,
    totalQuantity: row.total_quantity,
    signedQuantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    outboxStatus: row.outbox_status,
    failureClass: row.failure_class,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    serverAckStatus: row.server_ack_status,
    serverReceiptId: row.server_receipt_id,
    serverProcessedAt: row.server_processed_at,
    syncStatus: resolveSyncStatus(row),
  };
}

export function computeSignedTrocaQuantity(
  movementType: CreateTrocaEntryInput['movementType'],
  totalQuantity: number,
): number {
  return movementType === 'add' ? totalQuantity : -totalQuantity;
}

export async function listLocalExchangeReasons(): Promise<LocalExchangeReason[]> {
  const rows = await listExchangeReasons();
  return rows.map(mapExchangeReason);
}

export async function getLocalExchangeReasonById(
  reasonId: number,
): Promise<LocalExchangeReason | null> {
  const row = await getExchangeReasonById(reasonId);
  return row ? mapExchangeReason(row) : null;
}

export async function getTrocaCatalogLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  return getProductCatalogLastSyncedAt(userId, storeId);
}

export async function searchLocalTrocaCatalog(payload: {
  storeId: number;
  query: string;
  limit?: number;
}): Promise<LocalTrocaCatalogProduct[]> {
  return searchLocalCatalogProducts(payload);
}

export async function getLocalTrocaCatalogProductById(
  storeId: number,
  productId: number,
): Promise<LocalTrocaCatalogProduct | null> {
  return getLocalCatalogProductById(storeId, productId);
}

export async function getLocalTrocaCatalogCount(storeId: number): Promise<number> {
  return getLocalCatalogCount(storeId);
}

export async function listLocalTrocaEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<LocalTrocaEntry[]> {
  const rows = await listExchangeEntriesByStore(payload);
  return rows.map(mapExchangeEntry);
}

export async function countLocalTrocaEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
}): Promise<number> {
  return countExchangeEntriesByStore(payload);
}

export async function createLocalTrocaEntry(
  input: CreateTrocaEntryInput,
): Promise<CreateLocalTrocaEntryResult> {
  if (input.quantityInput <= 0 || input.packageCount <= 0 || input.totalQuantity <= 0) {
    throw new Error('Informe quantidade e embalagem validas para salvar a troca.');
  }

  const signedQuantity = computeSignedTrocaQuantity(input.movementType, input.totalQuantity);
  const now = new Date().toISOString();
  const deviceId = await ensureSyncDeviceId();
  const db = await getReadyDatabase();

  if (signedQuantity < 0) {
    const pendingBalance = await getPendingExchangeSignedBalanceByProductAndReason({
      userId: input.userId,
      storeId: input.storeId,
      reasonId: input.reason.id,
      productId: input.product.id,
      db,
    });

    if (Math.abs(signedQuantity) > pendingBalance) {
      throw new Error('Quantidade removida maior que o total coletado!');
    }
  }

  const eventId = Crypto.randomUUID();
  const payload = {
    reasonId: input.reason.id,
    reasonDescription: input.reason.description,
    productId: input.product.id,
    barcode: input.product.barcode ?? null,
    productDescription: input.product.description,
    movementType: input.movementType,
    quantityInput: input.quantityInput,
    packageCount: input.packageCount,
    totalQuantity: input.totalQuantity,
    signedQuantity,
    capturedAt: now,
  };

  const payloadHash = await buildSyncPayloadHash({
    eventId,
    eventType: EXCHANGE_EVENT_TYPE,
    aggregateType: 'exchange_entry',
    aggregateKey: `exchange-entry:${eventId}`,
    storeId: input.storeId,
    deviceId,
    schemaVersion: EXCHANGE_SCHEMA_VERSION,
    payload,
  });

  await runInTransaction(db, async () => {
    await insertExchangeEntry(
      {
        eventId,
        userId: input.userId,
        storeId: input.storeId,
        reasonId: input.reason.id,
        reasonDescription: input.reason.description,
        productId: input.product.id,
        barcode: input.product.barcode ?? null,
        productDescription: input.product.description,
        movementType: input.movementType,
        quantityInput: input.quantityInput,
        packageCount: input.packageCount,
        totalQuantity: input.totalQuantity,
        createdAt: now,
        updatedAt: now,
      },
      db,
    );

    await insertSyncOutboxEvent(
      {
        eventId,
        eventType: EXCHANGE_EVENT_TYPE,
        aggregateType: 'exchange_entry',
        aggregateKey: `exchange-entry:${eventId}`,
        storeId: input.storeId,
        userId: input.userId,
        deviceId,
        schemaVersion: EXCHANGE_SCHEMA_VERSION,
        payloadJson: JSON.stringify(payload),
        payloadHash,
        status: 'pending',
        failureClass: 'none',
        createdAt: now,
        updatedAt: now,
      },
      db,
    );
  });

  return {
    status: 'created',
    eventId,
  };
}

export async function removeLocalTrocaEntry(eventId: string): Promise<void> {
  await deleteExchangeEntryWithOutboxByEventId(eventId);
}

export async function getPendingTrocaBalanceByProductAndReason(payload: {
  userId: number;
  storeId: number;
  reasonId: number;
  productId: number;
}): Promise<number> {
  return getPendingExchangeSignedBalanceByProductAndReason(payload);
}

export async function getTrocaCollectedBalanceByProductAndReason(payload: {
  userId: number;
  storeId: number;
  reasonId: number;
  productId: number;
}): Promise<number> {
  return getExchangeSignedBalanceByProductAndReason(payload);
}
