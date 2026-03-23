import * as Crypto from 'expo-crypto';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import {
  countRuptureEntriesByStore,
  deleteRuptureEntryWithOutboxByEventId,
  findPendingRuptureEntryByShelfAndProduct,
  getAppMeta,
  insertRuptureEntry,
  insertSyncOutboxEvent,
  listRuptureEntriesByStore,
  setAppMeta,
} from '@/src/database/repositories';
import type { RuptureEntryListRow } from '@/src/database/types';
import { buildSyncPayloadHash, ensureSyncDeviceId } from '@/src/features/mobile-sync/services/mobile-sync-service';
import type {
  CreateLocalRuptureEntryResult,
  CreateRuptureEntryInput,
  LocalRuptureCatalogProduct,
  LocalRuptureEntry,
} from '@/src/features/rupture/types';
import {
  getLocalCatalogCount,
  getLocalCatalogProductById,
  getProductCatalogLastSyncedAt,
  lookupLocalCatalogProductByScannedCode,
  searchLocalCatalogProducts,
  setProductCatalogLastSyncedAt,
} from '@/src/features/shared/products/data/product-catalog-db';

const RUPTURE_EVENT_TYPE = 'rupture.item.reported';
const RUPTURE_SCHEMA_VERSION = 1;

const ruptureMetaKeys = {
  activeStore: (userId: number) => `rupture.active_store.user.${userId}`,
};

function mapRuptureEntry(row: RuptureEntryListRow): LocalRuptureEntry {
  let syncStatus: LocalRuptureEntry['syncStatus'] = 'pending';

  if (row.outbox_status === 'sending') {
    syncStatus = 'sending';
  } else if (row.outbox_status === 'success') {
    syncStatus = 'sent';
  } else if (row.outbox_status === 'failed' && row.failure_class === 'temporary') {
    syncStatus = 'error_temporary';
  } else if (row.outbox_status === 'failed' && row.failure_class === 'permanent') {
    syncStatus = 'error_permanent';
  }

  return {
    localId: row.local_id,
    eventId: row.event_id,
    userId: row.user_id,
    storeId: row.store_id,
    shelfCode: row.shelf_code,
    productId: row.product_id,
    barcode: row.barcode,
    productDescription: row.product_description,
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
    syncStatus,
  };
}

export async function getRuptureActiveStoreId(userId: number): Promise<number | null> {
  const row = await getAppMeta(ruptureMetaKeys.activeStore(userId));
  const parsed = Number(row?.value ?? 0);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function setRuptureActiveStoreId(userId: number, storeId: number): Promise<void> {
  await setAppMeta(ruptureMetaKeys.activeStore(userId), String(storeId), new Date().toISOString());
}

export async function getRuptureCatalogLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  return getProductCatalogLastSyncedAt(userId, storeId);
}

export async function setRuptureCatalogLastSyncedAt(
  userId: number,
  storeId: number,
  syncedAt: string,
): Promise<void> {
  await setProductCatalogLastSyncedAt(userId, storeId, syncedAt);
}

export async function searchLocalRuptureCatalog(payload: {
  storeId: number;
  query: string;
  limit?: number;
}): Promise<LocalRuptureCatalogProduct[]> {
  return searchLocalCatalogProducts(payload);
}

export async function getLocalRuptureCatalogProductById(
  storeId: number,
  productId: number,
): Promise<LocalRuptureCatalogProduct | null> {
  return getLocalCatalogProductById(storeId, productId);
}

export async function lookupLocalRuptureProductByScannedCode(payload: {
  storeId: number;
  scannedCode: string;
}) {
  return lookupLocalCatalogProductByScannedCode(payload);
}

export async function getLocalRuptureCatalogCount(storeId: number): Promise<number> {
  return getLocalCatalogCount(storeId);
}

export async function listLocalRuptureEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<LocalRuptureEntry[]> {
  const rows = await listRuptureEntriesByStore(payload);
  return rows.map(mapRuptureEntry);
}

export async function countLocalRuptureEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
}): Promise<number> {
  return countRuptureEntriesByStore(payload);
}

export async function createLocalRuptureEntry(
  input: CreateRuptureEntryInput,
): Promise<CreateLocalRuptureEntryResult> {
  const trimmedShelfCode = input.shelfCode.trim();
  if (!trimmedShelfCode) {
    throw new Error('Informe a prateleira antes de adicionar um produto.');
  }

  const now = new Date().toISOString();
  const deviceId = await ensureSyncDeviceId();
  const db = await getReadyDatabase();

  const duplicatedPendingEntry = await findPendingRuptureEntryByShelfAndProduct({
    userId: input.userId,
    storeId: input.storeId,
    shelfCode: trimmedShelfCode,
    productId: input.product.id,
    db,
  });

  if (duplicatedPendingEntry) {
    // O legado gravava ruptura com INSERT OR IGNORE. Mantemos a mesma leitura
    // operacional: o mesmo produto na mesma prateleira, enquanto ainda pendente,
    // e uma duplicidade silenciosa e nao um erro para o operador.
    return {
      status: 'duplicate_pending',
      existingEventId: duplicatedPendingEntry.event_id,
      shelfCode: trimmedShelfCode,
      productId: input.product.id,
    };
  }

  const eventId = Crypto.randomUUID();
  const payload = {
    shelfCode: trimmedShelfCode,
    productId: input.product.id,
    barcode: input.product.barcode ?? null,
    productDescription: input.product.description,
    capturedAt: now,
  };

  const payloadHash = await buildSyncPayloadHash({
    eventId,
    eventType: RUPTURE_EVENT_TYPE,
    aggregateType: 'rupture_entry',
    aggregateKey: `rupture-entry:${eventId}`,
    storeId: input.storeId,
    deviceId,
    schemaVersion: RUPTURE_SCHEMA_VERSION,
    payload,
  });

  await runInTransaction(db, async () => {
    await insertRuptureEntry(
      {
        eventId,
        userId: input.userId,
        storeId: input.storeId,
        shelfCode: trimmedShelfCode,
        productId: input.product.id,
        barcode: input.product.barcode ?? null,
        productDescription: input.product.description,
        createdAt: now,
        updatedAt: now,
      },
      db,
    );

    await insertSyncOutboxEvent(
      {
        eventId,
        eventType: RUPTURE_EVENT_TYPE,
        aggregateType: 'rupture_entry',
        aggregateKey: `rupture-entry:${eventId}`,
        storeId: input.storeId,
        userId: input.userId,
        deviceId,
        schemaVersion: RUPTURE_SCHEMA_VERSION,
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

export async function removeLocalRuptureEntry(eventId: string): Promise<void> {
  await deleteRuptureEntryWithOutboxByEventId(eventId);
}
