export type LocalCatalogProduct = {
  id: number;
  storeId: number;
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
  syncedAt: string;
  updatedAt: string;
};

export type ProductBarcodeResolutionKind =
  | 'barcode_exact'
  | 'internal_code_exact'
  | 'weighted_barcode_internal_code';

export type ProductBarcodeLookupResult =
  | {
      status: 'matched';
      scannedCode: string;
      resolutionKind: ProductBarcodeResolutionKind;
      product: LocalCatalogProduct;
      derivedQuantity: number | null;
    }
  | {
      status: 'not_found';
      scannedCode: string;
    }
  | {
      status: 'multiple';
      scannedCode: string;
      matches: LocalCatalogProduct[];
    };
