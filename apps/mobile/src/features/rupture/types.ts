import type { SyncFailureClass, SyncOutboxEventStatus } from '@/src/database/types';
import type {
  LocalCatalogProduct,
  ProductBarcodeLookupResult,
  ProductBarcodeResolutionKind,
} from '@/src/features/shared/products/types';

export type LocalRuptureCatalogProduct = LocalCatalogProduct;

export type LocalRuptureEntryStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'error_temporary'
  | 'error_permanent';

export type LocalRuptureEntry = {
  localId: number;
  eventId: string;
  userId: number;
  storeId: number;
  shelfCode: string;
  productId: number;
  barcode: string | null;
  productDescription: string;
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
  syncStatus: LocalRuptureEntryStatus;
};

export type CreateRuptureEntryInput = {
  userId: number;
  storeId: number;
  shelfCode: string;
  product: LocalRuptureCatalogProduct;
};

export type CreateLocalRuptureEntryResult =
  | {
      status: 'created';
      eventId: string;
    }
  | {
      status: 'duplicate_pending';
      existingEventId: string;
      shelfCode: string;
      productId: number;
    };

export type LocalRuptureBarcodeResolutionKind = ProductBarcodeResolutionKind;
export type LocalRuptureBarcodeLookupResult = ProductBarcodeLookupResult;
