import type { SyncFailureClass, SyncOutboxEventStatus } from '@/src/database/types';
import type { LocalCatalogProduct } from '@/src/features/shared/products/types';

export type LocalProductionRecipe = {
  id: number;
  storeId: number;
  description: string;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
  outputs: LocalProductionRecipeOutput[];
  inputs: LocalProductionRecipeInput[];
};

export type LocalProductionRecipeOutput = {
  recipeOutputId: number;
  recipeId: number;
  storeId: number;
  productId: number;
  yieldQuantity: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type LocalProductionRecipeInput = {
  recipeInputId: number;
  recipeId: number;
  storeId: number;
  productId: number;
  recipePackageQuantity: number | null;
  productPackageQuantity: number | null;
  deductStock: boolean;
  conversionFactor: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type LocalProductionRecipeSelection = {
  key: string;
  recipeId: number;
  storeId: number;
  recipeDescription: string;
  productId: number;
  productDescription: string;
  decimalAllowed: boolean;
  yieldQuantity: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type LocalProducaoCatalogProduct = LocalCatalogProduct;

export type LocalProducaoEntryStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'error_temporary'
  | 'error_permanent';

export type LocalProducaoEntry = {
  localId: number;
  eventId: string;
  userId: number;
  storeId: number;
  recipeId: number;
  recipeDescription: string;
  productId: number;
  productDescription: string;
  quantityInput: number;
  createdAt: string;
  updatedAt: string;
  outboxStatus: SyncOutboxEventStatus;
  failureClass: SyncFailureClass;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  serverAckStatus: string | null;
  serverReceiptId: string | null;
  serverProcessedAt: string | null;
  syncStatus: LocalProducaoEntryStatus;
};

export type CreateProducaoEntryInput = {
  userId: number;
  storeId: number;
  selection: LocalProductionRecipeSelection;
  product: LocalProducaoCatalogProduct;
  quantityInput: number;
};

export type CreateLocalProducaoEntryResult = {
  status: 'created';
  eventId: string;
};
