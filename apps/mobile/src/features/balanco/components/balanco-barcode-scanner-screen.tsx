import { useLocalSearchParams } from 'expo-router';
import { ProductBarcodeScannerScreen } from '@/src/features/shared/products/components/product-barcode-scanner-screen';
import { buildBalancoScanContextKey, parsePositiveInt } from '@/src/features/balanco/utils';

export function BalancoBarcodeScannerScreen() {
  const params = useLocalSearchParams<{
    storeId?: string | string[];
    balanceId?: string | string[];
  }>();

  const storeId = parsePositiveInt(params.storeId);
  const balanceId = parsePositiveInt(params.balanceId);

  return (
    <ProductBarcodeScannerScreen
      contextKey={storeId && balanceId ? buildBalancoScanContextKey(storeId, balanceId) : 'balanco:unknown'}
      description="Aponte a camera para o codigo de barras do produto do balanco."
      storeId={storeId}
      title="Ler codigo de barras"
    />
  );
}
