import { useLocalSearchParams } from 'expo-router';
import { ProductBarcodeScannerScreen } from '@/src/features/shared/products/components/product-barcode-scanner-screen';

function parseSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parsePositiveInt(value: string | string[] | undefined) {
  const parsed = Number(parseSingleParam(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildRuptureScanContextKey(storeId: number, shelfCode: string) {
  return `rupture:${storeId}:${shelfCode.trim()}`;
}

export function RuptureBarcodeScannerScreen() {
  const params = useLocalSearchParams<{
    storeId?: string | string[];
    shelfCode?: string | string[];
  }>();

  const storeId = parsePositiveInt(params.storeId);
  const shelfCode = parseSingleParam(params.shelfCode);

  return (
    <ProductBarcodeScannerScreen
      contextKey={storeId ? buildRuptureScanContextKey(storeId, shelfCode) : 'rupture:unknown'}
      storeId={storeId}
      title="Ler codigo de barras"
      description="Aponte a camera para o codigo de barras do produto."
    />
  );
}
