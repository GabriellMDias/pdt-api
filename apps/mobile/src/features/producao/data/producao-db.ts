import * as Crypto from 'expo-crypto';
import { runInTransaction } from '@/src/database/client';
import {
  countProductionEntriesByStore,
  deleteProductionEntryWithOutboxByEventId,
  getAppMeta,
  hasProductionRecipeOutput,
  insertProductionEntry,
  insertSyncOutboxEvent,
  listProductionEntriesByStore,
  listProductionRecipeInputsByStore,
  listProductionRecipeOutputsByStore,
  listProductionRecipesByStore,
  setAppMeta,
} from '@/src/database/repositories';
import { getReadyDatabase } from '@/src/database/repositories/shared';
import type {
  ProductionEntryListRow,
  ProductionRecipeInputRow,
  ProductionRecipeOutputRow,
  ProductionRecipeRow,
} from '@/src/database/types';
import {
  buildSyncPayloadHash,
  ensureSyncDeviceId,
} from '@/src/features/mobile-sync/services/mobile-sync-service';
import {
  getLocalActiveCatalogProductById,
  listLocalCatalogProductsByIds,
} from '@/src/features/shared/products/data/product-catalog-db';
import type {
  CreateLocalProducaoEntryResult,
  CreateProducaoEntryInput,
  LocalProductionRecipe,
  LocalProductionRecipeInput,
  LocalProductionRecipeOutput,
  LocalProductionRecipeSelection,
  LocalProducaoEntry,
} from '@/src/features/producao/types';

const PRODUCTION_EVENT_TYPE = 'production.item.recorded';
const PRODUCTION_SCHEMA_VERSION = 1;

const productionMetaKeys = {
  lastSyncedAt: (userId: number, storeId: number) =>
    `catalog.production_recipes.last_synced_at.user.${userId}.store.${storeId}`,
};

function buildRecipeKey(recipeId: number, storeId: number): string {
  return `${storeId}:${recipeId}`;
}

function buildSelectionKey(recipeId: number, productId: number): string {
  return `${recipeId}:${productId}`;
}

function mapRecipeOutput(row: ProductionRecipeOutputRow): LocalProductionRecipeOutput {
  return {
    recipeOutputId: row.recipe_output_id,
    recipeId: row.recipe_id,
    storeId: row.store_id,
    productId: row.product_id,
    yieldQuantity: row.yield_quantity,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function mapRecipeInput(row: ProductionRecipeInputRow): LocalProductionRecipeInput {
  return {
    recipeInputId: row.recipe_input_id,
    recipeId: row.recipe_id,
    storeId: row.store_id,
    productId: row.product_id,
    recipePackageQuantity: row.recipe_package_quantity,
    productPackageQuantity: row.product_package_quantity,
    deductStock: row.deduct_stock === 1,
    conversionFactor: row.conversion_factor,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
  };
}

function mapRecipe(
  row: ProductionRecipeRow,
  outputs: readonly LocalProductionRecipeOutput[],
  inputs: readonly LocalProductionRecipeInput[],
): LocalProductionRecipe {
  return {
    id: row.id,
    storeId: row.store_id,
    description: row.description,
    activeStatus: row.active_status === 1,
    syncedAt: row.synced_at,
    updatedAt: row.updated_at,
    outputs: [...outputs],
    inputs: [...inputs],
  };
}

function mapSelection(
  recipe: LocalProductionRecipe,
  output: LocalProductionRecipeOutput,
  product: { description: string; decimalAllowed: boolean },
): LocalProductionRecipeSelection {
  return {
    key: buildSelectionKey(recipe.id, output.productId),
    recipeId: recipe.id,
    storeId: recipe.storeId,
    recipeDescription: recipe.description,
    productId: output.productId,
    productDescription: product.description,
    decimalAllowed: product.decimalAllowed,
    yieldQuantity: output.yieldQuantity,
    syncedAt: recipe.syncedAt,
    updatedAt: recipe.updatedAt,
  };
}

function resolveSyncStatus(row: ProductionEntryListRow): LocalProducaoEntry['syncStatus'] {
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

function mapEntry(row: ProductionEntryListRow): LocalProducaoEntry {
  return {
    localId: row.local_id,
    eventId: row.event_id,
    userId: row.user_id,
    storeId: row.store_id,
    recipeId: row.recipe_id,
    recipeDescription: row.recipe_description,
    productId: row.product_id,
    productDescription: row.product_description,
    quantityInput: row.quantity_input,
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

async function readProductionRecipeSnapshot(storeId: number): Promise<LocalProductionRecipe[]> {
  const [recipeRows, outputRows, inputRows] = await Promise.all([
    listProductionRecipesByStore(storeId),
    listProductionRecipeOutputsByStore(storeId),
    listProductionRecipeInputsByStore(storeId),
  ]);

  const outputsByRecipe = new Map<string, LocalProductionRecipeOutput[]>();
  for (const row of outputRows) {
    const key = buildRecipeKey(row.recipe_id, row.store_id);
    const items = outputsByRecipe.get(key) ?? [];
    items.push(mapRecipeOutput(row));
    outputsByRecipe.set(key, items);
  }

  const inputsByRecipe = new Map<string, LocalProductionRecipeInput[]>();
  for (const row of inputRows) {
    const key = buildRecipeKey(row.recipe_id, row.store_id);
    const items = inputsByRecipe.get(key) ?? [];
    items.push(mapRecipeInput(row));
    inputsByRecipe.set(key, items);
  }

  return recipeRows.map((row) =>
    mapRecipe(
      row,
      outputsByRecipe.get(buildRecipeKey(row.id, row.store_id)) ?? [],
      inputsByRecipe.get(buildRecipeKey(row.id, row.store_id)) ?? [],
    ),
  );
}

export async function listLocalProductionRecipes(storeId: number): Promise<LocalProductionRecipe[]> {
  return readProductionRecipeSnapshot(storeId);
}

export async function getLocalProductionRecipeById(payload: {
  recipeId: number;
  storeId: number;
}): Promise<LocalProductionRecipe | null> {
  const recipes = await readProductionRecipeSnapshot(payload.storeId);
  return recipes.find((recipe) => recipe.id === payload.recipeId) ?? null;
}

export async function listLocalProductionRecipeSelections(
  storeId: number,
): Promise<LocalProductionRecipeSelection[]> {
  const recipes = await readProductionRecipeSnapshot(storeId);
  const productIds = recipes.flatMap((recipe) => recipe.outputs.map((output) => output.productId));
  const catalogProducts = await listLocalCatalogProductsByIds({
    storeId,
    productIds,
  });
  const launchableProductsById = new Map(
    catalogProducts
      .filter((product) => product.activeStatus)
      .map((product) => [product.id, product] as const),
  );

  return recipes.flatMap((recipe) =>
    recipe.outputs.flatMap((output) => {
      const product = launchableProductsById.get(output.productId);

      if (!product) {
        return [];
      }

      return [mapSelection(recipe, output, product)];
    }),
  );
}

export async function getProductionRecipesLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  const row = await getAppMeta(productionMetaKeys.lastSyncedAt(userId, storeId));
  return row?.value ?? null;
}

export async function setProductionRecipesLastSyncedAt(
  userId: number,
  storeId: number,
  syncedAt: string,
): Promise<void> {
  await setAppMeta(
    productionMetaKeys.lastSyncedAt(userId, storeId),
    syncedAt,
    new Date().toISOString(),
  );
}

export async function listLocalProducaoEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<LocalProducaoEntry[]> {
  const rows = await listProductionEntriesByStore(payload);
  return rows.map(mapEntry);
}

export async function countLocalProducaoEntries(payload: {
  userId: number;
  storeId: number;
  search?: string | null;
}): Promise<number> {
  return countProductionEntriesByStore(payload);
}

export async function createLocalProducaoEntry(
  input: CreateProducaoEntryInput,
): Promise<CreateLocalProducaoEntryResult> {
  if (!Number.isFinite(input.quantityInput) || input.quantityInput <= 0) {
    throw new Error('Informe uma quantidade valida para salvar a producao.');
  }

  const now = new Date().toISOString();
  const deviceId = await ensureSyncDeviceId();
  const eventId = Crypto.randomUUID();
  const db = await getReadyDatabase();

  const payload = {
    recipeId: input.selection.recipeId,
    recipeDescription: input.selection.recipeDescription,
    productId: input.product.id,
    productDescription: input.product.description,
    quantityInput: input.quantityInput,
    capturedAt: now,
  };

  const payloadHash = await buildSyncPayloadHash({
    eventId,
    eventType: PRODUCTION_EVENT_TYPE,
    aggregateType: 'production_entry',
    aggregateKey: `production-entry:${eventId}`,
    storeId: input.storeId,
    deviceId,
    schemaVersion: PRODUCTION_SCHEMA_VERSION,
    payload,
  });

  await runInTransaction(db, async () => {
    await insertProductionEntry(
      {
        eventId,
        userId: input.userId,
        storeId: input.storeId,
        recipeId: input.selection.recipeId,
        recipeDescription: input.selection.recipeDescription,
        productId: input.product.id,
        productDescription: input.product.description,
        quantityInput: input.quantityInput,
        createdAt: now,
        updatedAt: now,
      },
      db,
    );

    await insertSyncOutboxEvent(
      {
        eventId,
        eventType: PRODUCTION_EVENT_TYPE,
        aggregateType: 'production_entry',
        aggregateKey: `production-entry:${eventId}`,
        storeId: input.storeId,
        userId: input.userId,
        deviceId,
        schemaVersion: PRODUCTION_SCHEMA_VERSION,
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

export async function removeLocalProducaoEntry(eventId: string): Promise<void> {
  await deleteProductionEntryWithOutboxByEventId(eventId);
}

export async function getLocalProducedCatalogProductBySelection(payload: {
  storeId: number;
  recipeId: number;
  productId: number;
}): Promise<Awaited<ReturnType<typeof getLocalActiveCatalogProductById>>> {
  const outputExists = await hasProductionRecipeOutput(payload);

  if (!outputExists) {
    return null;
  }

  return getLocalActiveCatalogProductById(payload.storeId, payload.productId);
}
