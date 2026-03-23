export type MobileSyncAckStatus =
  | 'processed'
  | 'duplicate'
  | 'temporary_error'
  | 'permanent_error';

export type RemoteMobileSyncEventEnvelope = {
  eventId: string;
  eventType: string;
  aggregateType?: string | null;
  aggregateKey?: string | null;
  storeId?: number | null;
  deviceId?: string | null;
  schemaVersion: number;
  payload: Record<string, unknown>;
};

export type RemoteMobileSyncAcknowledgement = {
  eventId: string;
  status: MobileSyncAckStatus;
  receiptId: string;
  processedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
};

export type RemoteMobileSyncPushResponse = {
  acknowledgements: RemoteMobileSyncAcknowledgement[];
  summary: {
    processed: number;
    duplicates: number;
    temporaryErrors: number;
    permanentErrors: number;
  };
};

export type MobileSyncCatalogDomain =
  | 'rupture.products'
  | 'stock.products'
  | 'exchange.reasons'
  | 'consumption.reasons'
  | 'production.recipes'
  | 'balance.headers';

export type RemoteStockCatalogProduct = {
  id: number;
  barcode: string | null;
  description: string;
  packageQuantity: number | null;
  packagingTypeId: number | null;
  packagingDescription: string | null;
  shelfCode: string | null;
  activeStatus: boolean;
  decimalAllowed: boolean;
  salePrice: number | null;
  stockQuantity: number | null;
  exchangeQuantity: number | null;
  averageCostWithTax: number | null;
  grossWeight: number | null;
};

export type RemoteExchangeReason = {
  id: number;
  description: string;
  activeStatus: boolean;
};

export type RemoteConsumptionReason = {
  id: number;
  description: string;
  activeStatus: boolean;
};

export type RemoteProductionRecipe = {
  id: number;
  description: string;
  activeStatus: boolean;
  outputs: {
    recipeOutputId: number;
    productId: number;
    yieldQuantity: number | null;
  }[];
  inputs: {
    recipeInputId: number;
    productId: number;
    recipePackageQuantity: number | null;
    productPackageQuantity: number | null;
    deductStock: boolean;
    conversionFactor: number | null;
  }[];
};

export type RemoteBalanceHeader = {
  id: number;
  description: string;
  stockLabel: string;
  statusCode: number;
};

export type RemoteStockCatalogResponse = {
  domain: 'rupture.products' | 'stock.products';
  storeId: number;
  syncedAt: string;
  cursor: string | null;
  items: RemoteStockCatalogProduct[];
};

export type RemoteExchangeReasonCatalogResponse = {
  domain: 'exchange.reasons';
  storeId: number;
  syncedAt: string;
  cursor: string | null;
  items: RemoteExchangeReason[];
};

export type RemoteConsumptionReasonCatalogResponse = {
  domain: 'consumption.reasons';
  storeId: number;
  syncedAt: string;
  cursor: string | null;
  items: RemoteConsumptionReason[];
};

export type RemoteProductionRecipeCatalogResponse = {
  domain: 'production.recipes';
  storeId: number;
  syncedAt: string;
  cursor: string | null;
  items: RemoteProductionRecipe[];
};

export type RemoteBalanceHeaderCatalogResponse = {
  domain: 'balance.headers';
  storeId: number;
  syncedAt: string;
  cursor: string | null;
  items: RemoteBalanceHeader[];
};

export type RemoteMobileSyncCatalogResponse =
  | RemoteStockCatalogResponse
  | RemoteExchangeReasonCatalogResponse
  | RemoteConsumptionReasonCatalogResponse
  | RemoteProductionRecipeCatalogResponse
  | RemoteBalanceHeaderCatalogResponse;

export type SyncDispatchResult = {
  batchCount: number;
  eventCount: number;
  processed: number;
  duplicates: number;
  temporaryErrors: number;
  permanentErrors: number;
};
