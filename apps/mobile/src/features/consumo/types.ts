import type { SyncFailureClass, SyncOutboxEventStatus } from '@/src/database/types';
import type { LocalCatalogProduct } from '@/src/features/shared/products/types';
import type {
  LocalMovementReason,
  StockMovementType,
} from '@/src/features/shared/stock-movement/types';

export type LocalConsumptionReason = LocalMovementReason;

export type LocalConsumoCatalogProduct = LocalCatalogProduct;

export type LocalConsumoEntryStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'error_temporary'
  | 'error_permanent';

export type ConsumoMovementType = StockMovementType;

export type LocalConsumoEntry = {
  localId: number;
  eventId: string;
  userId: number;
  storeId: number;
  reasonId: number;
  reasonDescription: string;
  productId: number;
  barcode: string | null;
  productDescription: string;
  movementType: ConsumoMovementType;
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
  syncStatus: LocalConsumoEntryStatus;
};

export type CreateConsumoEntryInput = {
  userId: number;
  storeId: number;
  reason: LocalConsumptionReason;
  product: LocalConsumoCatalogProduct;
  movementType: ConsumoMovementType;
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
};

export type CreateLocalConsumoEntryResult = {
  status: 'created';
  eventId: string;
};
