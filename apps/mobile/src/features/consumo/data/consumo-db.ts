import * as Crypto from 'expo-crypto';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import {
  countConsumptionEntriesByStore,
  deleteConsumptionEntryWithOutboxByEventId,
  getConsumptionReasonById,
  getConsumptionSignedBalanceByProductAndReason,
  getPendingConsumptionSignedBalanceByProductAndReason,
  insertConsumptionEntry,
  insertSyncOutboxEvent,
  listConsumptionEntriesByStore,
  listConsumptionReasons,
} from '@/src/database/repositories';
import type {
  ConsumptionEntryListRow,
  ConsumptionReasonRow,
} from '@/src/database/types';
import { buildSyncPayloadHash, ensureSyncDeviceId } from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  getLocalCatalogCount,
  getLocalCatalogProductById,
  getProductCatalogLastSyncedAt,
  searchLocalCatalogProducts,
} from '@/src/features/shared/products/data/product-catalog-db';
import type {
  CreateConsumoEntryInput,
  CreateLocalConsumoEntryResult,
  LocalConsumptionReason,
  LocalConsumoCatalogProduct,
  LocalConsumoEntry,
} from '@/src/features/consumo/types';

const CONSUMPTION_EVENT_TYPE = 'consumption.item.recorded';
const CONSUMPTION_SCHEMA_VERSION = 1;

function mapConsumptionReason(row: ConsumptionReasonRow): LocalConsumptionReason {
  return {
    id: row.id,
    description: row.description,
    activeStatus: row.active_status === 1,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function resolveSyncStatus(row: ConsumptionEntryListRow): LocalConsumoEntry['syncStatus'] {
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

function mapConsumptionEntry(row: ConsumptionEntryListRow): LocalConsumoEntry {
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

export function computeSignedConsumoQuantity(
  movementType: CreateConsumoEntryInput['movementType'],
  totalQuantity: number,
): number {
  return movementType === 'add' ? totalQuantity : -totalQuantity;
}

export async function listLocalConsumptionReasons(): Promise<LocalConsumptionReason[]> {
  const rows = await listConsumptionReasons();
  return rows.map(mapConsumptionReason);
}

export async function getLocalConsumptionReasonById(
  reasonId: number,
): Promise<LocalConsumptionReason | null> {
  const row = await getConsumptionReasonById(reasonId);
  return row ? mapConsumptionReason(row) : null;
}

export async function getConsumoCatalogLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  return getProductCatalogLastSyncedAt(userId, storeId);
}

export async function searchLocalConsumoCatalog(payload: {
  storeId: number;
  query: string;
  limit?: number;
}): Promise<LocalConsumoCatalogProduct[]> {
  return searchLocalCatalogProducts(payload);
}

export async function getLocalConsumoCatalogProductById(
  storeId: number,
  productId: number,
): Promise<LocalConsumoCatalogProduct | null> {
  return getLocalCatalogProductById(storeId, productId);
}

export async function getLocalConsumoCatalogCount(storeId: number): Promise<number> {
  return getLocalCatalogCount(storeId);
}

export async function listLocalConsumoEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<LocalConsumoEntry[]> {
  const rows = await listConsumptionEntriesByStore(payload);
  return rows.map(mapConsumptionEntry);
}

export async function countLocalConsumoEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
}): Promise<number> {
  return countConsumptionEntriesByStore(payload);
}

export async function createLocalConsumoEntry(
  input: CreateConsumoEntryInput,
): Promise<CreateLocalConsumoEntryResult> {
  if (input.quantityInput <= 0 || input.packageCount <= 0 || input.totalQuantity <= 0) {
    throw new Error('Informe quantidade e embalagem validas para salvar o consumo.');
  }

  const signedQuantity = computeSignedConsumoQuantity(input.movementType, input.totalQuantity);
  const now = new Date().toISOString();
  const deviceId = await ensureSyncDeviceId();
  const db = await getReadyDatabase();

  if (signedQuantity < 0) {
    const pendingBalance = await getPendingConsumptionSignedBalanceByProductAndReason({
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
    eventType: CONSUMPTION_EVENT_TYPE,
    aggregateType: 'consumption_entry',
    aggregateKey: `consumption-entry:${eventId}`,
    storeId: input.storeId,
    deviceId,
    schemaVersion: CONSUMPTION_SCHEMA_VERSION,
    payload,
  });

  await runInTransaction(db, async () => {
    await insertConsumptionEntry(
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
        eventType: CONSUMPTION_EVENT_TYPE,
        aggregateType: 'consumption_entry',
        aggregateKey: `consumption-entry:${eventId}`,
        storeId: input.storeId,
        userId: input.userId,
        deviceId,
        schemaVersion: CONSUMPTION_SCHEMA_VERSION,
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

export async function removeLocalConsumoEntry(eventId: string): Promise<void> {
  await deleteConsumptionEntryWithOutboxByEventId(eventId);
}

export async function getPendingConsumoBalanceByProductAndReason(payload: {
  userId: number;
  storeId: number;
  reasonId: number;
  productId: number;
}): Promise<number> {
  return getPendingConsumptionSignedBalanceByProductAndReason(payload);
}

export async function getConsumoCollectedBalanceByProductAndReason(payload: {
  userId: number;
  storeId: number;
  reasonId: number;
  productId: number;
}): Promise<number> {
  return getConsumptionSignedBalanceByProductAndReason(payload);
}
