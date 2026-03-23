import type { SyncFailureClass, SyncOutboxEventStatus } from '@/src/database/types';
import type { LocalCatalogProduct } from '@/src/features/shared/products/types';
import type {
  LocalMovementReason,
  StockMovementType,
} from '@/src/features/shared/stock-movement/types';

export type LocalExchangeReason = LocalMovementReason;

export type LocalTrocaCatalogProduct = LocalCatalogProduct;

export type LocalTrocaEntryStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'error_temporary'
  | 'error_permanent';

export type TrocaMovementType = StockMovementType;

export type LocalTrocaEntry = {
  localId: number;
  eventId: string;
  userId: number;
  storeId: number;
  reasonId: number;
  reasonDescription: string;
  productId: number;
  barcode: string | null;
  productDescription: string;
  movementType: TrocaMovementType;
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
  signedQuantity: number;
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
  syncStatus: LocalTrocaEntryStatus;
};

export type CreateTrocaEntryInput = {
  userId: number;
  storeId: number;
  reason: LocalExchangeReason;
  product: LocalTrocaCatalogProduct;
  movementType: TrocaMovementType;
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
};

export type CreateLocalTrocaEntryResult = {
  status: 'created';
  eventId: string;
};
