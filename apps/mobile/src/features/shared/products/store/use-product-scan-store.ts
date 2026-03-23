import { create } from 'zustand';
import type { ProductBarcodeResolutionKind } from '@/src/features/shared/products/types';

export type ProductScanSelection = {
  token: string;
  contextKey: string;
  storeId: number;
  scannedCode: string;
  productId: number;
  resolutionKind: ProductBarcodeResolutionKind;
  derivedQuantity: number | null;
};

export type ProductScanLookupFailure = {
  token: string;
  contextKey: string;
  storeId: number;
  scannedCode: string;
};

type ProductScanStoreState = {
  lastSelection: ProductScanSelection | null;
  lastLookupFailure: ProductScanLookupFailure | null;
  setSelection: (selection: ProductScanSelection) => void;
  setLookupFailure: (failure: ProductScanLookupFailure) => void;
  consumeSelection: (contextKey: string) => ProductScanSelection | null;
  consumeLookupFailure: (contextKey: string) => ProductScanLookupFailure | null;
  clearScanResult: () => void;
};

export const useProductScanStore = create<ProductScanStoreState>((set, get) => ({
  lastSelection: null,
  lastLookupFailure: null,
  setSelection: (selection) => {
    set({ lastSelection: selection, lastLookupFailure: null });
  },
  setLookupFailure: (failure) => {
    set({ lastSelection: null, lastLookupFailure: failure });
  },
  consumeSelection: (contextKey) => {
    const selection = get().lastSelection;
    if (!selection || selection.contextKey !== contextKey) {
      return null;
    }

    set({ lastSelection: null });
    return selection;
  },
  consumeLookupFailure: (contextKey) => {
    const failure = get().lastLookupFailure;
    if (!failure || failure.contextKey !== contextKey) {
      return null;
    }

    set({ lastLookupFailure: null });
    return failure;
  },
  clearScanResult: () => {
    set({ lastSelection: null, lastLookupFailure: null });
  },
}));
