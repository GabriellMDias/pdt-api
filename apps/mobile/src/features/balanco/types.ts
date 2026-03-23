import type { SyncFailureClass, SyncOutboxEventStatus } from '@/src/database/types';
import type { LocalCatalogProduct } from '@/src/features/shared/products/types';
import type { StockMovementType } from '@/src/features/shared/stock-movement/types';

export type LocalBalanceHeader = {
  id: number;
  storeId: number;
  description: string;
  stockLabel: string;
  statusCode: number;
  syncedAt: string;
  updatedAt: string;
};

export type LocalBalancoCatalogProduct = LocalCatalogProduct;

export type BalancoMovementType = StockMovementType;

export type LocalBalancoEntryStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'error_temporary'
  | 'error_permanent';

export type LocalBalancoEntry = {
  localId: number;
  eventId: string;
  userId: number;
  storeId: number;
  balanceId: number;
  balanceDescription: string;
  stockLabel: string;
  productId: number;
  barcode: string | null;
  productDescription: string;
  movementType: BalancoMovementType;
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
  syncStatus: LocalBalancoEntryStatus;
};

export type LocalBalancoGroup = {
  balanceId: number;
  storeId: number;
  balanceDescription: string;
  stockLabel: string;
  statusCode: number | null;
  totalEntries: number;
  sentEntries: number;
  notTransmittedEntries: number;
  sendingEntries: number;
  temporaryErrorEntries: number;
  permanentErrorEntries: number;
  lastEntryCreatedAt: string;
  syncStatus: LocalBalancoEntryStatus;
};

export type CreateBalancoEntryInput = {
  userId: number;
  storeId: number;
  balance: LocalBalanceHeader;
  product: LocalBalancoCatalogProduct;
  movementType: BalancoMovementType;
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
};

export type CreateLocalBalancoEntryResult = {
  status: 'created';
  eventId: string;
};
