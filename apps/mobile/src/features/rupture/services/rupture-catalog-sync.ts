import { syncProductCatalog } from '@/src/features/shared/products/services/product-catalog-sync';

export async function syncRuptureCatalog(payload: {
  userId: number;
  storeId: number;
  triggerSource: string;
}): Promise<{ syncedAt: string; itemsCount: number }> {
  return syncProductCatalog(payload);
}
