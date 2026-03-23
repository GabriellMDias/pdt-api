import { useLocalSearchParams } from 'expo-router';
import { ProductBarcodeScannerScreen } from '@/src/features/shared/products/components/product-barcode-scanner-screen';

function parseSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parsePositiveInt(value: string | string[] | undefined) {
  const parsed = Number(parseSingleParam(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildTrocaScanContextKey(storeId: number, reasonId: number) {
  return `troca:${storeId}:${reasonId}`;
}

export function TrocaBarcodeScannerScreen() {
  const params = useLocalSearchParams<{
    storeId?: string | string[];
    reasonId?: string | string[];
  }>();

  const storeId = parsePositiveInt(params.storeId);
  const reasonId = parsePositiveInt(params.reasonId);

  return (
    <ProductBarcodeScannerScreen
      contextKey={storeId && reasonId ? buildTrocaScanContextKey(storeId, reasonId) : 'troca:unknown'}
      storeId={storeId}
      title="Ler codigo de barras"
      description="Aponte a camera para o codigo de barras do produto da troca."
    />
  );
}
