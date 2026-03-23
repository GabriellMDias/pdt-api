import {
  countCatalogProductsForStore,
  getActiveCatalogProductById,
  getAppMeta,
  getCatalogProductById,
  listCatalogProductsByIds,
  listCatalogProductsByExactBarcode,
  searchCatalogProducts,
  setAppMeta,
} from '@/src/database/repositories';
import type { CatalogProductRow } from '@/src/database/types';
import type {
  LocalCatalogProduct,
  ProductBarcodeLookupResult,
} from '@/src/features/shared/products/types';

const productCatalogMetaKeys = {
  lastSyncedAt: (userId: number, storeId: number) =>
    `catalog.products.last_synced_at.user.${userId}.store.${storeId}`,
};

function mapCatalogProduct(row: CatalogProductRow): LocalCatalogProduct {
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

function normalizeScannedCode(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function extractWeightedBarcodeProductId(scannedCode: string): number | null {
  if (!/^\d{13,14}$/.test(scannedCode)) {
    return null;
  }

  const parsed = Number(scannedCode.substring(1, 7));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function extractWeightedBarcodeDerivedQuantity(
  scannedCode: string,
  product: LocalCatalogProduct,
): number | null {
  if (!/^\d{13,14}$/.test(scannedCode)) {
    return null;
  }

  if (!product.salePrice || product.salePrice <= 0) {
    return null;
  }

  const weightedValue = Number(scannedCode.substring(7)) / 1000;
  if (!Number.isFinite(weightedValue) || weightedValue <= 0) {
    return null;
  }

  const derivedQuantity = weightedValue / product.salePrice;
  if (!Number.isFinite(derivedQuantity) || derivedQuantity <= 0) {
    return null;
  }

  return Number(derivedQuantity.toFixed(3));
}

function dedupeProductsById(products: readonly LocalCatalogProduct[]) {
  const seen = new Set<number>();
  return products.filter((product) => {
    if (seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
}

export async function getProductCatalogLastSyncedAt(
  userId: number,
  storeId: number,
): Promise<string | null> {
  const row = await getAppMeta(productCatalogMetaKeys.lastSyncedAt(userId, storeId));
  return row?.value ?? null;
}

export async function setProductCatalogLastSyncedAt(
  userId: number,
  storeId: number,
  syncedAt: string,
): Promise<void> {
  await setAppMeta(
    productCatalogMetaKeys.lastSyncedAt(userId, storeId),
    syncedAt,
    new Date().toISOString(),
  );
}

export async function searchLocalCatalogProducts(payload: {
  storeId: number;
  query: string;
  limit?: number;
}): Promise<LocalCatalogProduct[]> {
  const rows = await searchCatalogProducts(payload);
  return rows.map(mapCatalogProduct);
}

export async function getLocalCatalogProductById(
  storeId: number,
  productId: number,
): Promise<LocalCatalogProduct | null> {
  const row = await getCatalogProductById(storeId, productId);
  return row ? mapCatalogProduct(row) : null;
}

export async function getLocalActiveCatalogProductById(
  storeId: number,
  productId: number,
): Promise<LocalCatalogProduct | null> {
  const row = await getActiveCatalogProductById(storeId, productId);
  return row ? mapCatalogProduct(row) : null;
}

export async function listLocalCatalogProductsByIds(payload: {
  storeId: number;
  productIds: readonly number[];
}): Promise<LocalCatalogProduct[]> {
  const rows = await listCatalogProductsByIds(payload);
  return rows.map(mapCatalogProduct);
}

export async function lookupLocalCatalogProductByScannedCode(payload: {
  storeId: number;
  scannedCode: string;
}): Promise<ProductBarcodeLookupResult> {
  const scannedCode = normalizeScannedCode(payload.scannedCode);

  if (!scannedCode) {
    return {
      status: 'not_found',
      scannedCode,
    };
  }

  const barcodeRows = await listCatalogProductsByExactBarcode(payload.storeId, scannedCode);
  const barcodeMatches = dedupeProductsById(barcodeRows.map(mapCatalogProduct));

  if (barcodeMatches.length === 1) {
    return {
      status: 'matched',
      scannedCode,
      resolutionKind: 'barcode_exact',
      product: barcodeMatches[0],
      derivedQuantity: null,
    };
  }

  if (barcodeMatches.length > 1) {
    return {
      status: 'multiple',
      scannedCode,
      matches: barcodeMatches,
    };
  }

  if (/^\d+$/.test(scannedCode)) {
    const byInternalCode = await getLocalActiveCatalogProductById(
      payload.storeId,
      Number(scannedCode),
    );
    if (byInternalCode) {
      return {
        status: 'matched',
        scannedCode,
        resolutionKind: 'internal_code_exact',
        product: byInternalCode,
        derivedQuantity: null,
      };
    }

    const weightedProductId = extractWeightedBarcodeProductId(scannedCode);
    if (weightedProductId != null) {
      const weightedProduct = await getLocalActiveCatalogProductById(
        payload.storeId,
        weightedProductId,
      );

      if (weightedProduct) {
        return {
          status: 'matched',
          scannedCode,
          resolutionKind: 'weighted_barcode_internal_code',
          product: weightedProduct,
          derivedQuantity: extractWeightedBarcodeDerivedQuantity(scannedCode, weightedProduct),
        };
      }
    }
  }

  return {
    status: 'not_found',
    scannedCode,
  };
}

export async function getLocalCatalogCount(storeId: number): Promise<number> {
  return countCatalogProductsForStore(storeId);
}
