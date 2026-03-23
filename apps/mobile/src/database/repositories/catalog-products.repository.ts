import { runInTransaction } from '@/src/database/client';
import type {
  CatalogProductRow,
  CatalogProductUpsertInput,
  DatabaseExecutor,
} from '@/src/database/types';
import { getReadyDatabase } from '@/src/database/repositories/shared';

async function resolveExecutor(db?: DatabaseExecutor): Promise<DatabaseExecutor> {
  return db ?? (await getReadyDatabase());
}

export async function replaceCatalogProductsForStore(
  storeId: number,
  products: readonly CatalogProductUpsertInput[],
  db?: DatabaseExecutor,
): Promise<void> {
  const executor = await resolveExecutor(db);

  const persist = async () => {
    await executor.runAsync('DELETE FROM catalog_products WHERE store_id = ?', [storeId]);

    for (const product of products) {
      await executor.runAsync(
        `
          INSERT INTO catalog_products (
            id,
            store_id,
            barcode,
            description,
            package_quantity,
            packaging_type_id,
            packaging_description,
            shelf_code,
            active_status,
            decimal_allowed,
            sale_price,
            stock_quantity,
            exchange_quantity,
            average_cost_with_tax,
            gross_weight,
            synced_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          product.id,
          product.storeId,
          product.barcode ?? null,
          product.description,
          product.packageQuantity ?? null,
          product.packagingTypeId ?? null,
          product.packagingDescription ?? null,
          product.shelfCode ?? null,
          product.activeStatus ? 1 : 0,
          product.decimalAllowed ? 1 : 0,
          product.salePrice ?? null,
          product.stockQuantity ?? null,
          product.exchangeQuantity ?? null,
          product.averageCostWithTax ?? null,
          product.grossWeight ?? null,
          product.syncedAt,
          product.updatedAt,
        ],
      );
    }
  };

  if (db) {
    await persist();
    return;
  }

  await runInTransaction(executor, persist);
}

export async function countCatalogProductsForStore(
  storeId: number,
  db?: DatabaseExecutor,
): Promise<number> {
  const executor = await resolveExecutor(db);
  const row = await executor.getFirstAsync<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM catalog_products
      WHERE store_id = ?
    `,
    [storeId],
  );

  return Number(row?.total ?? 0);
}

export async function searchCatalogProducts(payload: {
  storeId: number;
  query: string;
  limit?: number;
  db?: DatabaseExecutor;
}): Promise<CatalogProductRow[]> {
  const executor = await resolveExecutor(payload.db);
  const trimmedQuery = payload.query.trim();
  const limit = payload.limit ?? 12;

  if (!trimmedQuery) {
    return executor.getAllAsync<CatalogProductRow>(
      `
        SELECT *
        FROM catalog_products
        WHERE store_id = ? AND active_status = 1
        ORDER BY description COLLATE NOCASE ASC, id ASC
        LIMIT ?
      `,
      [payload.storeId, limit],
    );
  }

  const normalizedQuery = trimmedQuery.toLowerCase();
  const descriptionTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const descriptionClause =
    descriptionTokens.length > 0
      ? descriptionTokens.map(() => 'lower(description) LIKE ?').join(' AND ')
      : '1 = 1';
  const descriptionBindings = descriptionTokens.map((token) => `%${token}%`);
  const numericLike = `%${trimmedQuery}%`;
  const codePrefixLike = `${trimmedQuery}%`;

  return executor.getAllAsync<CatalogProductRow>(
    `
      SELECT *
      FROM catalog_products
      WHERE store_id = ?
        AND active_status = 1
        AND (
          (${descriptionClause})
          OR barcode = ?
          OR barcode LIKE ?
          OR CAST(id AS TEXT) = ?
          OR CAST(id AS TEXT) LIKE ?
        )
      ORDER BY
        CASE
          WHEN barcode = ? THEN 0
          WHEN CAST(id AS TEXT) = ? THEN 1
          WHEN barcode LIKE ? THEN 2
          WHEN CAST(id AS TEXT) LIKE ? THEN 3
          WHEN lower(description) = lower(?) THEN 4
          WHEN lower(description) LIKE ? THEN 5
          ELSE 6
        END,
        description COLLATE NOCASE ASC,
        id ASC
      LIMIT ?
    `,
    [
      payload.storeId,
      ...descriptionBindings,
      trimmedQuery,
      codePrefixLike,
      trimmedQuery,
      numericLike,
      trimmedQuery,
      trimmedQuery,
      codePrefixLike,
      codePrefixLike,
      trimmedQuery,
      `%${normalizedQuery}%`,
      limit,
    ],
  );
}

export async function getCatalogProductById(
  storeId: number,
  productId: number,
  db?: DatabaseExecutor,
): Promise<CatalogProductRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<CatalogProductRow>(
    `
      SELECT *
      FROM catalog_products
      WHERE store_id = ? AND id = ?
      LIMIT 1
    `,
    [storeId, productId],
  );
}

export async function getActiveCatalogProductById(
  storeId: number,
  productId: number,
  db?: DatabaseExecutor,
): Promise<CatalogProductRow | null> {
  const executor = await resolveExecutor(db);
  return executor.getFirstAsync<CatalogProductRow>(
    `
      SELECT *
      FROM catalog_products
      WHERE store_id = ?
        AND id = ?
        AND active_status = 1
      LIMIT 1
    `,
    [storeId, productId],
  );
}

export async function listCatalogProductsByIds(payload: {
  storeId: number;
  productIds: readonly number[];
  db?: DatabaseExecutor;
}): Promise<CatalogProductRow[]> {
  const executor = await resolveExecutor(payload.db);
  const uniqueIds = [...new Set(payload.productIds.filter((id) => Number.isInteger(id) && id > 0))];

  if (uniqueIds.length === 0) {
    return [];
  }

  const placeholders = uniqueIds.map(() => '?').join(', ');

  return executor.getAllAsync<CatalogProductRow>(
    `
      SELECT *
      FROM catalog_products
      WHERE store_id = ?
        AND id IN (${placeholders})
      ORDER BY description COLLATE NOCASE ASC, id ASC
    `,
    [payload.storeId, ...uniqueIds],
  );
}

export async function listCatalogProductsByExactBarcode(
  storeId: number,
  barcode: string,
  db?: DatabaseExecutor,
): Promise<CatalogProductRow[]> {
  const executor = await resolveExecutor(db);
  return executor.getAllAsync<CatalogProductRow>(
    `
      SELECT *
      FROM catalog_products
      WHERE store_id = ? AND active_status = 1 AND barcode = ?
      ORDER BY id ASC
    `,
    [storeId, barcode],
  );
}
