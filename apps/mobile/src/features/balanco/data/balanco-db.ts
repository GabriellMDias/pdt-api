import * as Crypto from 'expo-crypto';
import { runInTransaction } from '@/src/database/client';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import {
  countBalanceEntriesByBalance,
  deleteBalanceEntriesByBalanceWithOutbox,
  deleteBalanceEntryWithOutboxByEventId,
  getAppMeta,
  getBalanceHeaderById,
  getBalanceSignedBalanceByProduct,
  getCatalogProductById,
  getPendingBalanceSignedBalanceByProduct,
  insertBalanceEntry,
  insertSyncOutboxEvent,
  listBalanceEntriesByBalance,
  listBalanceGroupsByStore,
  listBalanceHeadersByStore,
  listOpenBalanceHeadersByStore,
  setAppMeta,
} from '@/src/database/repositories';
import type {
  BalanceEntryListRow,
  BalanceGroupListRow,
  BalanceHeaderRow,
} from '@/src/database/types';
import {
  buildSyncPayloadHash,
  ensureSyncDeviceId,
} from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  getLocalCatalogCount,
  getProductCatalogLastSyncedAt,
  searchLocalCatalogProducts,
} from '@/src/features/shared/products/data/product-catalog-db';
import type {
  CreateBalancoEntryInput,
  CreateLocalBalancoEntryResult,
  LocalBalanceHeader,
  LocalBalancoCatalogProduct,
  LocalBalancoEntry,
  LocalBalancoGroup,
} from '@/src/features/balanco/types';

const BALANCE_EVENT_TYPE = 'balance.item.recorded';
const BALANCE_SCHEMA_VERSION = 1;

const balanceMetaKeys = {
  lastSyncedAt: (userId: number, storeId: number) =>
    `catalog.balance_headers.last_synced_at.user.${userId}.store.${storeId}`,
};

function resolveSyncStatus(row: BalanceEntryListRow): LocalBalancoEntry['syncStatus'] {
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

function mapBalanceHeader(row: BalanceHeaderRow): LocalBalanceHeader {
  return {
    id: row.id,
    storeId: row.store_id,
    description: row.description,
    stockLabel: row.stock_label,
    statusCode: row.status_code,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function mapBalanceEntry(row: BalanceEntryListRow): LocalBalancoEntry {
  const signedQuantity = row.movement_type === 'add' ? row.total_quantity : -row.total_quantity;

  return {
    localId: row.local_id,
    eventId: row.event_id,
    userId: row.user_id,
    storeId: row.store_id,
    balanceId: row.balance_id,
    balanceDescription: row.balance_description,
    stockLabel: row.stock_label,
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

function mapBalanceGroup(row: BalanceGroupListRow): LocalBalancoGroup {
  let syncStatus: LocalBalancoGroup['syncStatus'] = 'pending';

  if (row.total_entries > 0 && row.sent_entries === row.total_entries) {
    syncStatus = 'sent';
  } else if (row.permanent_error_entries > 0) {
    syncStatus = 'error_permanent';
  } else if (row.temporary_error_entries > 0) {
    syncStatus = 'error_temporary';
  } else if (row.sending_entries > 0) {
    syncStatus = 'sending';
  }

  return {
    balanceId: row.balance_id,
    storeId: row.store_id,
    balanceDescription: row.balance_description,
    stockLabel: row.stock_label,
    statusCode: row.status_code,
    totalEntries: row.total_entries,
    sentEntries: row.sent_entries,
    notTransmittedEntries: row.not_transmitted_entries,
    sendingEntries: row.sending_entries,
    temporaryErrorEntries: row.temporary_error_entries,
    permanentErrorEntries: row.permanent_error_entries,
    lastEntryCreatedAt: row.last_entry_created_at,
    syncStatus,
  };
}

export async function getBalanceCatalogLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  const row = await getAppMeta(balanceMetaKeys.lastSyncedAt(userId, storeId));
  return row?.value ?? null;
}

export async function setBalanceCatalogLastSyncedAt(
  userId: number,
  storeId: number,
  syncedAt: string,
): Promise<void> {
  await setAppMeta(
    balanceMetaKeys.lastSyncedAt(userId, storeId),
    syncedAt,
    new Date().toISOString(),
  );
}

export async function listLocalBalanceHeaders(storeId: number): Promise<LocalBalanceHeader[]> {
  const rows = await listBalanceHeadersByStore(storeId);
  return rows.map(mapBalanceHeader);
}

export async function listLocalOpenBalanceHeaders(storeId: number): Promise<LocalBalanceHeader[]> {
  const rows = await listOpenBalanceHeadersByStore(storeId);
  return rows.map(mapBalanceHeader);
}

export async function getLocalBalanceHeaderById(payload: {
  balanceId: number;
  storeId: number;
}): Promise<LocalBalanceHeader | null> {
  const row = await getBalanceHeaderById(payload);
  return row ? mapBalanceHeader(row) : null;
}

export async function searchLocalBalancoCatalog(payload: {
  storeId: number;
  query: string;
  limit?: number;
}): Promise<LocalBalancoCatalogProduct[]> {
  return searchLocalCatalogProducts(payload);
}

export async function getLocalBalancoCatalogProductById(
  storeId: number,
  productId: number,
): Promise<LocalBalancoCatalogProduct | null> {
  const row = await getCatalogProductById(storeId, productId);
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    storeId: row.store_id,
    barcode: row.barcode,
    description: row.description,
    packageQuantity: row.package_quantity,
    packagingTypeId: row.packaging_type_id,
    packagingDescription: row.packaging_description,
    shelfCode: row.shelf_code,
    activeStatus: row.active_status === 1,
    decimalAllowed: row.decimal_allowed === 1,
    salePrice: row.sale_price,
    stockQuantity: row.stock_quantity,
    exchangeQuantity: row.exchange_quantity,
    averageCostWithTax: row.average_cost_with_tax,
    grossWeight: row.gross_weight,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

export async function getLocalBalancoCatalogCount(storeId: number): Promise<number> {
  return getLocalCatalogCount(storeId);
}

export async function getBalancoProductCatalogLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  return getProductCatalogLastSyncedAt(userId, storeId);
}

export async function listLocalBalancoGroups(payload: {
  userId: number;
  storeId: number;
}): Promise<LocalBalancoGroup[]> {
  const rows = await listBalanceGroupsByStore(payload);
  return rows.map(mapBalanceGroup);
}

export async function listLocalBalancoEntriesByBalance(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<LocalBalancoEntry[]> {
  const rows = await listBalanceEntriesByBalance(payload);
  return rows.map(mapBalanceEntry);
}

export async function countLocalBalancoEntriesByBalance(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
  search?: string | null;
}): Promise<number> {
  return countBalanceEntriesByBalance(payload);
}

export async function getPendingBalancoBalanceByProduct(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
  productId: number;
}): Promise<number> {
  return getPendingBalanceSignedBalanceByProduct(payload);
}

export async function getBalancoCollectedBalanceByProduct(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
  productId: number;
}): Promise<number> {
  return getBalanceSignedBalanceByProduct(payload);
}

export async function createLocalBalancoEntry(
  input: CreateBalancoEntryInput,
): Promise<CreateLocalBalancoEntryResult> {
  if (input.quantityInput <= 0 || input.packageCount <= 0 || input.totalQuantity <= 0) {
    throw new Error('Informe quantidade e embalagem validas para salvar o balanco.');
  }

  const signedQuantity = input.movementType === 'add' ? input.totalQuantity : -input.totalQuantity;
  const now = new Date().toISOString();
  const deviceId = await ensureSyncDeviceId();
  const db = await getReadyDatabase();

  if (signedQuantity < 0) {
    const pendingBalance = await getPendingBalanceSignedBalanceByProduct({
      userId: input.userId,
      storeId: input.storeId,
      balanceId: input.balance.id,
      productId: input.product.id,
      db,
    });

    if (Math.abs(signedQuantity) > pendingBalance) {
      throw new Error('Quantidade removida maior que o total coletado!');
    }
  }

  const eventId = Crypto.randomUUID();
  const payload = {
    balanceId: input.balance.id,
    balanceDescription: input.balance.description,
    stockLabel: input.balance.stockLabel,
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
    eventType: BALANCE_EVENT_TYPE,
    aggregateType: 'balance_entry',
    aggregateKey: `balance:${input.balance.id}:entry:${eventId}`,
    storeId: input.storeId,
    deviceId,
    schemaVersion: BALANCE_SCHEMA_VERSION,
    payload,
  });

  await runInTransaction(db, async () => {
    await insertBalanceEntry(
      {
        eventId,
        userId: input.userId,
        storeId: input.storeId,
        balanceId: input.balance.id,
        balanceDescription: input.balance.description,
        stockLabel: input.balance.stockLabel,
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
        eventType: BALANCE_EVENT_TYPE,
        aggregateType: 'balance_entry',
        aggregateKey: `balance:${input.balance.id}:entry:${eventId}`,
        storeId: input.storeId,
        userId: input.userId,
        deviceId,
        schemaVersion: BALANCE_SCHEMA_VERSION,
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

export async function removeLocalBalancoEntry(eventId: string): Promise<void> {
  await deleteBalanceEntryWithOutboxByEventId(eventId);
}

export async function removeLocalBalancoEntriesByBalance(payload: {
  userId: number;
  storeId: number;
  balanceId: number;
}): Promise<void> {
  await deleteBalanceEntriesByBalanceWithOutbox(payload);
}
