import * as Crypto from 'expo-crypto';
import { runInTransaction } from '@/src/database/client';
import {
  getAppMeta,
  insertConsumptionEntry,
  insertExchangeEntry,
  insertRuptureEntry,
  insertSyncOutboxEvent,
  insertProductionEntry,
  listConsumptionReasons,
  listExchangeReasons,
  setAppMeta,
} from '@/src/database/repositories';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import { DEV_LOCAL_SEED_ENABLED } from '@/src/features/dev-seed/config';
import type {
  DevSeedBatchSummary,
  DevSeedCleanupResult,
  DevSeedRoutineKey,
  DevSeedRoutineResult,
  DevSeedVolume,
} from '@/src/features/dev-seed/types';
import {
  createLocalBalancoEntry,
  listLocalBalanceHeaders,
  listLocalOpenBalanceHeaders,
} from '@/src/features/balanco/data/balanco-db';
import type { LocalBalanceHeader } from '@/src/features/balanco/types';
import {
  listLocalProductionRecipeSelections,
} from '@/src/features/producao/data/producao-db';
import {
  buildSyncPayloadHash,
  ensureSyncDeviceId,
} from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  searchLocalCatalogProducts,
} from '@/src/features/shared/products/data/product-catalog-db';
import type { LocalCatalogProduct } from '@/src/features/shared/products/types';

const DEV_SEED_EVENT_TYPE_BY_ROUTINE = {
  rupture: 'rupture.item.reported',
  troca: 'exchange.item.recorded',
  consumo: 'consumption.item.recorded',
  producao: 'production.item.recorded',
  balanco: 'balance.item.recorded',
} as const satisfies Record<DevSeedRoutineKey, string>;

const DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE = {
  rupture: 'rupture_entry',
  troca: 'exchange_entry',
  consumo: 'consumption_entry',
  producao: 'production_entry',
  balanco: 'balance_entry',
} as const satisfies Record<DevSeedRoutineKey, string>;

const DEV_SEED_SCHEMA_VERSION = 1;
const DEV_SEED_EVENT_PREFIX = 'dev-seed';
const PRODUCT_POOL_LIMIT = 5000;
const TIMESTAMP_STEP_MS = 15_000;
const DEV_SEED_REGISTRY_CHUNK_SIZE = 200;

function assertDevSeedEnabled(): void {
  if (!DEV_LOCAL_SEED_ENABLED) {
    throw new Error('O seed local de desenvolvimento nao esta disponivel nesta build.');
  }
}

function roundTo(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function buildSeedEventPrefix(routineKey: DevSeedRoutineKey): string {
  return `${DEV_SEED_EVENT_PREFIX}:${routineKey}:`;
}

function buildSeedEventId(routineKey: DevSeedRoutineKey): string {
  return Crypto.randomUUID();
}

function buildSeedRegistryMetaKey(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
}): string {
  return `dev_seed.registry.user.${payload.userId}.store.${payload.storeId}.routine.${payload.routineKey}`;
}

async function readSeedRegistry(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
}): Promise<string[]> {
  const row = await getAppMeta(
    buildSeedRegistryMetaKey(payload),
  );

  if (!row?.value) {
    return [];
  }

  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } catch {
    return [];
  }
}

async function writeSeedRegistry(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
  eventIds: readonly string[];
}): Promise<void> {
  await setAppMeta(
    buildSeedRegistryMetaKey(payload),
    JSON.stringify(payload.eventIds),
    new Date().toISOString(),
  );
}

async function appendSeedRegistry(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
  eventIds: readonly string[];
}): Promise<void> {
  if (payload.eventIds.length === 0) {
    return;
  }

  const current = await readSeedRegistry(payload);
  const next = [...new Set([...current, ...payload.eventIds])];
  await writeSeedRegistry({
    ...payload,
    eventIds: next,
  });
}

function splitIntoChunks<T>(items: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize) as T[]);
  }

  return chunks;
}

async function deleteSeedRowsByEventIds(payload: {
  tableName:
    | 'rupture_entries'
    | 'exchange_entries'
    | 'consumption_entries'
    | 'production_entries'
    | 'balance_entries';
  userId: number;
  storeId: number;
  eventIds: readonly string[];
}): Promise<{
  deletedEntries: number;
  deletedOutboxEvents: number;
}> {
  const db = await getReadyDatabase();
  let deletedEntries = 0;
  let deletedOutboxEvents = 0;

  await runInTransaction(db, async () => {
    for (const chunk of splitIntoChunks(payload.eventIds, DEV_SEED_REGISTRY_CHUNK_SIZE)) {
      if (chunk.length === 0) {
        continue;
      }

      const placeholders = chunk.map(() => '?').join(', ');
      const bindings = [payload.userId, payload.storeId, ...chunk];

      const entryCountRow = await db.getFirstAsync<{ total: number | null }>(
        `
          SELECT COUNT(*) AS total
          FROM ${payload.tableName}
          WHERE user_id = ?
            AND store_id = ?
            AND event_id IN (${placeholders})
        `,
        bindings,
      );
      const outboxCountRow = await db.getFirstAsync<{ total: number | null }>(
        `
          SELECT COUNT(*) AS total
          FROM sync_outbox_events
          WHERE user_id = ?
            AND store_id = ?
            AND event_id IN (${placeholders})
        `,
        bindings,
      );

      deletedEntries += Number(entryCountRow?.total ?? 0);
      deletedOutboxEvents += Number(outboxCountRow?.total ?? 0);

      await db.runAsync(
        `
          DELETE FROM ${payload.tableName}
          WHERE user_id = ?
            AND store_id = ?
            AND event_id IN (${placeholders})
        `,
        bindings,
      );

      await db.runAsync(
        `
          DELETE FROM sync_outbox_events
          WHERE user_id = ?
            AND store_id = ?
            AND event_id IN (${placeholders})
        `,
        bindings,
      );
    }
  });

  return {
    deletedEntries,
    deletedOutboxEvents,
  };
}

function pickByIndex<T>(items: readonly T[], index: number): T {
  return items[index % items.length] as T;
}

function buildEntryTimestamp(baseTimeMs: number, index: number, volume: number): string {
  return new Date(baseTimeMs - (volume - index) * TIMESTAMP_STEP_MS).toISOString();
}

function buildShelfCode(product: LocalCatalogProduct, index: number): string {
  const normalizedShelf = product.shelfCode?.trim();
  if (normalizedShelf) {
    return normalizedShelf;
  }

  const aisle = String((index % 8) + 1).padStart(2, '0');
  const slot = String((index % 30) + 1).padStart(2, '0');
  return `SEED-${aisle}-${slot}`;
}

function buildQuantitySeed(product: LocalCatalogProduct, index: number): {
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
} {
  const packageCount = 1 + (index % 4);

  if (product.decimalAllowed) {
    const quantityInput = roundTo(0.25 + ((index % 9) + 1) * 0.175);
    return {
      quantityInput,
      packageCount,
      totalQuantity: roundTo(quantityInput * packageCount),
    };
  }

  const quantityInput = 1 + (index % 5);
  return {
    quantityInput,
    packageCount,
    totalQuantity: quantityInput * packageCount,
  };
}

function buildPendingMovementSeed(payload: {
  product: LocalCatalogProduct;
  runningBalance: number;
  index: number;
}): {
  movementType: 'add' | 'remove';
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
  nextBalance: number;
} {
  const baseQuantity = buildQuantitySeed(payload.product, payload.index);
  const shouldRemove = payload.runningBalance > 0 && payload.index % 4 === 3;

  if (!shouldRemove) {
    return {
      movementType: 'add',
      quantityInput: baseQuantity.quantityInput,
      packageCount: baseQuantity.packageCount,
      totalQuantity: baseQuantity.totalQuantity,
      nextBalance: roundTo(payload.runningBalance + baseQuantity.totalQuantity),
    };
  }

  const cappedQuantity = Math.min(payload.runningBalance, baseQuantity.totalQuantity);
  const totalQuantity = payload.product.decimalAllowed
    ? roundTo(Math.max(cappedQuantity, 0.001))
    : Math.max(1, Math.floor(cappedQuantity));

  return {
    movementType: 'remove',
    quantityInput: totalQuantity,
    packageCount: 1,
    totalQuantity,
    nextBalance: roundTo(payload.runningBalance - totalQuantity),
  };
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha ao executar o seed local.';
}

async function listSeedProducts(storeId: number): Promise<LocalCatalogProduct[]> {
  const products = await searchLocalCatalogProducts({
    storeId,
    query: '',
    limit: PRODUCT_POOL_LIMIT,
  });

  if (products.length === 0) {
    throw new Error(
      'Nao ha produtos ativos suficientes no catalogo local. Sincronize a loja antes de gerar seed.',
    );
  }

  return products;
}

async function generateRuptureSeed(payload: {
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
  deviceId: string;
}): Promise<DevSeedRoutineResult> {
  const db = await getReadyDatabase();
  const products = await listSeedProducts(payload.storeId);
  const baseTimeMs = Date.now();
  const createdEventIds: string[] = [];

  await runInTransaction(db, async () => {
    for (let index = 0; index < payload.volume; index += 1) {
      const product = pickByIndex(products, index);
      const createdAt = buildEntryTimestamp(baseTimeMs, index, payload.volume);
      const eventId = buildSeedEventId('rupture');
      createdEventIds.push(eventId);
      const eventPayload = {
        shelfCode: buildShelfCode(product, index),
        productId: product.id,
        barcode: product.barcode ?? null,
        productDescription: product.description,
        capturedAt: createdAt,
      };

      await insertRuptureEntry(
        {
          eventId,
          userId: payload.userId,
          storeId: payload.storeId,
          shelfCode: String(eventPayload.shelfCode),
          productId: product.id,
          barcode: product.barcode ?? null,
          productDescription: product.description,
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );

      await insertSyncOutboxEvent(
        {
          eventId,
          eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.rupture,
          aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.rupture,
          aggregateKey: `rupture-entry:${eventId}`,
          storeId: payload.storeId,
          userId: payload.userId,
          deviceId: payload.deviceId,
          schemaVersion: DEV_SEED_SCHEMA_VERSION,
          payloadJson: JSON.stringify(eventPayload),
          payloadHash: await buildSyncPayloadHash({
            eventId,
            eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.rupture,
            aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.rupture,
            aggregateKey: `rupture-entry:${eventId}`,
            storeId: payload.storeId,
            deviceId: payload.deviceId,
            schemaVersion: DEV_SEED_SCHEMA_VERSION,
            payload: eventPayload,
          }),
          status: 'pending',
          failureClass: 'none',
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );
    }
  });

  await appendSeedRegistry({
    routineKey: 'rupture',
    userId: payload.userId,
    storeId: payload.storeId,
    eventIds: createdEventIds,
  });

  return {
    routineKey: 'rupture',
    insertedEntries: payload.volume,
  };
}

async function generateTrocaSeed(payload: {
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
  deviceId: string;
}): Promise<DevSeedRoutineResult> {
  const db = await getReadyDatabase();
  const products = await listSeedProducts(payload.storeId);
  const reasons = (await listExchangeReasons(db)).filter((reason) => reason.active_status === 1);
  const createdEventIds: string[] = [];

  if (reasons.length === 0) {
    throw new Error('Nao ha motivos de troca ativos no banco local para gerar seed.');
  }

  const baseTimeMs = Date.now();
  const balances = new Map<string, number>();

  await runInTransaction(db, async () => {
    for (let index = 0; index < payload.volume; index += 1) {
      const product = pickByIndex(products, index);
      const reason = pickByIndex(reasons, index + 1);
      const balanceKey = `${reason.id}:${product.id}`;
      const movementSeed = buildPendingMovementSeed({
        product,
        runningBalance: balances.get(balanceKey) ?? 0,
        index,
      });
      balances.set(balanceKey, movementSeed.nextBalance);

      const createdAt = buildEntryTimestamp(baseTimeMs, index, payload.volume);
      const eventId = buildSeedEventId('troca');
      createdEventIds.push(eventId);
      const eventPayload = {
        reasonId: reason.id,
        reasonDescription: reason.description,
        productId: product.id,
        barcode: product.barcode ?? null,
        productDescription: product.description,
        movementType: movementSeed.movementType,
        quantityInput: movementSeed.quantityInput,
        packageCount: movementSeed.packageCount,
        totalQuantity: movementSeed.totalQuantity,
        signedQuantity:
          movementSeed.movementType === 'add'
            ? movementSeed.totalQuantity
            : -movementSeed.totalQuantity,
        capturedAt: createdAt,
      };

      await insertExchangeEntry(
        {
          eventId,
          userId: payload.userId,
          storeId: payload.storeId,
          reasonId: reason.id,
          reasonDescription: reason.description,
          productId: product.id,
          barcode: product.barcode ?? null,
          productDescription: product.description,
          movementType: movementSeed.movementType,
          quantityInput: movementSeed.quantityInput,
          packageCount: movementSeed.packageCount,
          totalQuantity: movementSeed.totalQuantity,
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );

      await insertSyncOutboxEvent(
        {
          eventId,
          eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.troca,
          aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.troca,
          aggregateKey: `exchange-entry:${eventId}`,
          storeId: payload.storeId,
          userId: payload.userId,
          deviceId: payload.deviceId,
          schemaVersion: DEV_SEED_SCHEMA_VERSION,
          payloadJson: JSON.stringify(eventPayload),
          payloadHash: await buildSyncPayloadHash({
            eventId,
            eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.troca,
            aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.troca,
            aggregateKey: `exchange-entry:${eventId}`,
            storeId: payload.storeId,
            deviceId: payload.deviceId,
            schemaVersion: DEV_SEED_SCHEMA_VERSION,
            payload: eventPayload,
          }),
          status: 'pending',
          failureClass: 'none',
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );
    }
  });

  await appendSeedRegistry({
    routineKey: 'troca',
    userId: payload.userId,
    storeId: payload.storeId,
    eventIds: createdEventIds,
  });

  return {
    routineKey: 'troca',
    insertedEntries: payload.volume,
  };
}

async function generateConsumoSeed(payload: {
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
  deviceId: string;
}): Promise<DevSeedRoutineResult> {
  const db = await getReadyDatabase();
  const products = await listSeedProducts(payload.storeId);
  const reasons = (await listConsumptionReasons(db)).filter(
    (reason) => reason.active_status === 1,
  );
  const createdEventIds: string[] = [];

  if (reasons.length === 0) {
    throw new Error('Nao ha tipos de consumo ativos no banco local para gerar seed.');
  }

  const baseTimeMs = Date.now();
  const balances = new Map<string, number>();

  await runInTransaction(db, async () => {
    for (let index = 0; index < payload.volume; index += 1) {
      const product = pickByIndex(products, index);
      const reason = pickByIndex(reasons, index + 2);
      const balanceKey = `${reason.id}:${product.id}`;
      const movementSeed = buildPendingMovementSeed({
        product,
        runningBalance: balances.get(balanceKey) ?? 0,
        index,
      });
      balances.set(balanceKey, movementSeed.nextBalance);

      const createdAt = buildEntryTimestamp(baseTimeMs, index, payload.volume);
      const eventId = buildSeedEventId('consumo');
      createdEventIds.push(eventId);
      const eventPayload = {
        reasonId: reason.id,
        reasonDescription: reason.description,
        productId: product.id,
        barcode: product.barcode ?? null,
        productDescription: product.description,
        movementType: movementSeed.movementType,
        quantityInput: movementSeed.quantityInput,
        packageCount: movementSeed.packageCount,
        totalQuantity: movementSeed.totalQuantity,
        signedQuantity:
          movementSeed.movementType === 'add'
            ? movementSeed.totalQuantity
            : -movementSeed.totalQuantity,
        capturedAt: createdAt,
      };

      await insertConsumptionEntry(
        {
          eventId,
          userId: payload.userId,
          storeId: payload.storeId,
          reasonId: reason.id,
          reasonDescription: reason.description,
          productId: product.id,
          barcode: product.barcode ?? null,
          productDescription: product.description,
          movementType: movementSeed.movementType,
          quantityInput: movementSeed.quantityInput,
          packageCount: movementSeed.packageCount,
          totalQuantity: movementSeed.totalQuantity,
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );

      await insertSyncOutboxEvent(
        {
          eventId,
          eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.consumo,
          aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.consumo,
          aggregateKey: `consumption-entry:${eventId}`,
          storeId: payload.storeId,
          userId: payload.userId,
          deviceId: payload.deviceId,
          schemaVersion: DEV_SEED_SCHEMA_VERSION,
          payloadJson: JSON.stringify(eventPayload),
          payloadHash: await buildSyncPayloadHash({
            eventId,
            eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.consumo,
            aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.consumo,
            aggregateKey: `consumption-entry:${eventId}`,
            storeId: payload.storeId,
            deviceId: payload.deviceId,
            schemaVersion: DEV_SEED_SCHEMA_VERSION,
            payload: eventPayload,
          }),
          status: 'pending',
          failureClass: 'none',
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );
    }
  });

  await appendSeedRegistry({
    routineKey: 'consumo',
    userId: payload.userId,
    storeId: payload.storeId,
    eventIds: createdEventIds,
  });

  return {
    routineKey: 'consumo',
    insertedEntries: payload.volume,
  };
}

async function generateProducaoSeed(payload: {
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
  deviceId: string;
}): Promise<DevSeedRoutineResult> {
  const db = await getReadyDatabase();
  const selections = await listLocalProductionRecipeSelections(payload.storeId);
  const createdEventIds: string[] = [];

  if (selections.length === 0) {
    throw new Error('Nao ha receitas de producao validas no banco local para gerar seed.');
  }

  const products = await listSeedProducts(payload.storeId);
  const productsById = new Map(products.map((product) => [product.id, product] as const));
  const validSelections = selections.filter((selection) => productsById.has(selection.productId));

  if (validSelections.length === 0) {
    throw new Error(
      'As receitas locais nao possuem produto de destino ativo no catalogo para gerar seed.',
    );
  }

  const baseTimeMs = Date.now();

  await runInTransaction(db, async () => {
    for (let index = 0; index < payload.volume; index += 1) {
      const selection = pickByIndex(validSelections, index);
      const product = productsById.get(selection.productId);

      if (!product) {
        continue;
      }

      const quantitySeed = buildQuantitySeed(product, index);
      const createdAt = buildEntryTimestamp(baseTimeMs, index, payload.volume);
      const eventId = buildSeedEventId('producao');
      createdEventIds.push(eventId);
      const eventPayload = {
        recipeId: selection.recipeId,
        recipeDescription: selection.recipeDescription,
        productId: product.id,
        productDescription: product.description,
        quantityInput: quantitySeed.totalQuantity,
        capturedAt: createdAt,
      };

      await insertProductionEntry(
        {
          eventId,
          userId: payload.userId,
          storeId: payload.storeId,
          recipeId: selection.recipeId,
          recipeDescription: selection.recipeDescription,
          productId: product.id,
          productDescription: product.description,
          quantityInput: quantitySeed.totalQuantity,
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );

      await insertSyncOutboxEvent(
        {
          eventId,
          eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.producao,
          aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.producao,
          aggregateKey: `production-entry:${eventId}`,
          storeId: payload.storeId,
          userId: payload.userId,
          deviceId: payload.deviceId,
          schemaVersion: DEV_SEED_SCHEMA_VERSION,
          payloadJson: JSON.stringify(eventPayload),
          payloadHash: await buildSyncPayloadHash({
            eventId,
            eventType: DEV_SEED_EVENT_TYPE_BY_ROUTINE.producao,
            aggregateType: DEV_SEED_AGGREGATE_TYPE_BY_ROUTINE.producao,
            aggregateKey: `production-entry:${eventId}`,
            storeId: payload.storeId,
            deviceId: payload.deviceId,
            schemaVersion: DEV_SEED_SCHEMA_VERSION,
            payload: eventPayload,
          }),
          status: 'pending',
          failureClass: 'none',
          createdAt,
          updatedAt: createdAt,
        },
        db,
      );
    }
  });

  await appendSeedRegistry({
    routineKey: 'producao',
    userId: payload.userId,
    storeId: payload.storeId,
    eventIds: createdEventIds,
  });

  return {
    routineKey: 'producao',
    insertedEntries: payload.volume,
  };
}

async function resolveBalanceSeedHeaders(storeId: number): Promise<LocalBalanceHeader[]> {
  const openHeaders = await listLocalOpenBalanceHeaders(storeId);
  if (openHeaders.length > 0) {
    return openHeaders;
  }

  return listLocalBalanceHeaders(storeId);
}

async function generateBalancoSeed(payload: {
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
  deviceId: string;
}): Promise<DevSeedRoutineResult> {
  const products = await listSeedProducts(payload.storeId);
  const headers = await resolveBalanceSeedHeaders(payload.storeId);

  if (headers.length === 0) {
    throw new Error('Nao ha balancos locais disponiveis para gerar seed.');
  }

  const balances = new Map<string, number>();
  const createdEventIds: string[] = [];

  try {
    for (let index = 0; index < payload.volume; index += 1) {
      const product = pickByIndex(products, index);
      const balanceHeader = pickByIndex(headers, index);
      const balanceKey = `${balanceHeader.id}:${product.id}`;
      const movementSeed = buildPendingMovementSeed({
        product,
        runningBalance: balances.get(balanceKey) ?? 0,
        index,
      });
      balances.set(balanceKey, movementSeed.nextBalance);

      const result = await createLocalBalancoEntry({
        userId: payload.userId,
        storeId: payload.storeId,
        balance: balanceHeader,
        product,
        movementType: movementSeed.movementType,
        quantityInput: movementSeed.quantityInput,
        packageCount: movementSeed.packageCount,
        totalQuantity: movementSeed.totalQuantity,
      });

      createdEventIds.push(result.eventId);
    }
  } finally {
    await appendSeedRegistry({
      routineKey: 'balanco',
      userId: payload.userId,
      storeId: payload.storeId,
      eventIds: createdEventIds,
    });
  }

  return {
    routineKey: 'balanco',
    insertedEntries: payload.volume,
  };
}

async function generateSeedForRoutine(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
  deviceId: string;
}): Promise<DevSeedRoutineResult> {
  switch (payload.routineKey) {
    case 'rupture':
      return generateRuptureSeed(payload);
    case 'troca':
      return generateTrocaSeed(payload);
    case 'consumo':
      return generateConsumoSeed(payload);
    case 'producao':
      return generateProducaoSeed(payload);
    case 'balanco':
      return generateBalancoSeed(payload);
    default:
      throw new Error('Rotina de seed nao suportada.');
  }
}

type CleanupRoutineConfig = {
  tableName:
    | 'rupture_entries'
    | 'exchange_entries'
    | 'consumption_entries'
    | 'production_entries'
    | 'balance_entries';
};

const CLEANUP_TABLE_BY_ROUTINE: Record<DevSeedRoutineKey, CleanupRoutineConfig> = {
  rupture: { tableName: 'rupture_entries' },
  troca: { tableName: 'exchange_entries' },
  consumo: { tableName: 'consumption_entries' },
  producao: { tableName: 'production_entries' },
  balanco: { tableName: 'balance_entries' },
};

async function clearSeedForRoutine(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
}): Promise<DevSeedCleanupResult> {
  const db = await getReadyDatabase();
  const config = CLEANUP_TABLE_BY_ROUTINE[payload.routineKey];
  const eventPattern = `${buildSeedEventPrefix(payload.routineKey)}%`;
  const registeredEventIds = await readSeedRegistry(payload);

  const legacyCleanup = await runInTransaction(db, async () => {
    const entryCountRow = await db.getFirstAsync<{ total: number | null }>(
      `
        SELECT COUNT(*) AS total
        FROM ${config.tableName}
        WHERE user_id = ?
          AND store_id = ?
          AND event_id LIKE ?
      `,
      [payload.userId, payload.storeId, eventPattern],
    );
    const deletedEntries = Number(entryCountRow?.total ?? 0);

    const outboxCountRow = await db.getFirstAsync<{ total: number | null }>(
      `
        SELECT COUNT(*) AS total
        FROM sync_outbox_events
        WHERE user_id = ?
          AND store_id = ?
          AND event_id LIKE ?
      `,
      [payload.userId, payload.storeId, eventPattern],
    );
    const deletedOutboxEvents = Number(outboxCountRow?.total ?? 0);

    if (deletedEntries > 0) {
      await db.runAsync(
        `
          DELETE FROM ${config.tableName}
          WHERE user_id = ?
            AND store_id = ?
            AND event_id LIKE ?
        `,
        [payload.userId, payload.storeId, eventPattern],
      );
    }

    if (deletedOutboxEvents > 0) {
      await db.runAsync(
        `
          DELETE FROM sync_outbox_events
          WHERE user_id = ?
            AND store_id = ?
            AND event_id LIKE ?
        `,
        [payload.userId, payload.storeId, eventPattern],
      );
    }

    return {
      deletedEntries,
      deletedOutboxEvents,
    };
  });

  const registryCleanup = await deleteSeedRowsByEventIds({
    tableName: config.tableName,
    userId: payload.userId,
    storeId: payload.storeId,
    eventIds: registeredEventIds,
  });

  await writeSeedRegistry({
    ...payload,
    eventIds: [],
  });

  return {
    routineKey: payload.routineKey,
    deletedEntries: legacyCleanup.deletedEntries + registryCleanup.deletedEntries,
    deletedOutboxEvents:
      legacyCleanup.deletedOutboxEvents + registryCleanup.deletedOutboxEvents,
  };
}

export async function generateLocalDevSeed(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
}): Promise<DevSeedRoutineResult> {
  assertDevSeedEnabled();
  const deviceId = await ensureSyncDeviceId();
  return generateSeedForRoutine({
    ...payload,
    deviceId,
  });
}

export async function generateAllLocalDevSeed(payload: {
  userId: number;
  storeId: number;
  volume: DevSeedVolume;
}): Promise<DevSeedBatchSummary<DevSeedRoutineResult>> {
  assertDevSeedEnabled();
  const deviceId = await ensureSyncDeviceId();
  const routines: DevSeedRoutineKey[] = [
    'rupture',
    'troca',
    'consumo',
    'producao',
    'balanco',
  ];

  const results: DevSeedRoutineResult[] = [];
  const errors: DevSeedBatchSummary<DevSeedRoutineResult>['errors'] = [];

  for (const routineKey of routines) {
    try {
      results.push(
        await generateSeedForRoutine({
          routineKey,
          userId: payload.userId,
          storeId: payload.storeId,
          volume: payload.volume,
          deviceId,
        }),
      );
    } catch (error) {
      errors.push({
        routineKey,
        message: normalizeErrorMessage(error),
      });
    }
  }

  return { results, errors };
}

export async function clearLocalDevSeed(payload: {
  routineKey: DevSeedRoutineKey;
  userId: number;
  storeId: number;
}): Promise<DevSeedCleanupResult> {
  assertDevSeedEnabled();
  return clearSeedForRoutine(payload);
}

export async function clearAllLocalDevSeed(payload: {
  userId: number;
  storeId: number;
}): Promise<DevSeedBatchSummary<DevSeedCleanupResult>> {
  assertDevSeedEnabled();
  const routines: DevSeedRoutineKey[] = [
    'rupture',
    'troca',
    'consumo',
    'producao',
    'balanco',
  ];
  const results: DevSeedCleanupResult[] = [];
  const errors: DevSeedBatchSummary<DevSeedCleanupResult>['errors'] = [];

  for (const routineKey of routines) {
    try {
      results.push(
        await clearSeedForRoutine({
          routineKey,
          userId: payload.userId,
          storeId: payload.storeId,
        }),
      );
    } catch (error) {
      errors.push({
        routineKey,
        message: normalizeErrorMessage(error),
      });
    }
  }

  return { results, errors };
}
