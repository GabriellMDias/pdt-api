import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BarcodeScannerOverlay } from '@/src/features/barcode-scanner/components/barcode-scanner-overlay';
import { lookupLocalCatalogProductByScannedCode } from '@/src/features/shared/products/data/product-catalog-db';
import { useProductScanStore } from '@/src/features/shared/products/store/use-product-scan-store';
import {
  playOperationalErrorAsync,
  warmupOperationalFeedbackAsync,
} from '@/src/features/shared/services/operational-feedback.service';
import { colors } from '@/src/theme/tokens';

type ProductBarcodeScannerScreenProps = {
  storeId: number | null;
  contextKey: string;
  title?: string;
  description?: string;
};

export function ProductBarcodeScannerScreen({
  storeId,
  contextKey,
  title = 'Ler codigo de barras',
  description = 'Aponte a camera para o codigo de barras do produto.',
}: ProductBarcodeScannerScreenProps) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);
  const lastHandledScanAtRef = useRef(0);
  const successNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [canScan, setCanScan] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [mountErrorMessage, setMountErrorMessage] = useState<string | null>(null);
  const [cameraInstanceKey, setCameraInstanceKey] = useState(0);
  const setSelection = useProductScanStore((state) => state.setSelection);
  const setLookupFailure = useProductScanStore((state) => state.setLookupFailure);

  const handleRetryScan = useCallback(() => {
    scanLockRef.current = false;
    lastHandledScanAtRef.current = 0;
    setCanScan(true);
    setStatusMessage(null);
    setStatusTone('info');
    setLastScannedCode(null);
  }, []);

  const handleToggleCameraFacing = useCallback(() => {
    const nextFacing = cameraFacing === 'back' ? 'front' : 'back';
    setCameraFacing(nextFacing);
    if (nextFacing === 'front') {
      setTorchEnabled(false);
    }
    handleRetryScan();
    setStatusTone('info');
    setStatusMessage(
      nextFacing === 'back'
        ? 'Camera traseira ativa. Aponte para o codigo de barras do produto.'
        : 'Camera frontal ativa. Use apenas se precisar reposicionar a leitura.',
    );
  }, [cameraFacing, handleRetryScan]);

  useEffect(() => {
    void warmupOperationalFeedbackAsync();

    return () => {
      if (successNavigationTimeoutRef.current) {
        clearTimeout(successNavigationTimeoutRef.current);
      }
    };
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      const now = Date.now();
      if (!storeId || scanLockRef.current || !canScan || now - lastHandledScanAtRef.current < 1200) {
        return;
      }

      lastHandledScanAtRef.current = now;
      scanLockRef.current = true;
      setCanScan(false);
      setStatusTone('info');
      setLastScannedCode(result.data);
      setStatusMessage('Codigo lido. Validando produto na base local...');

      try {
        const lookup = await lookupLocalCatalogProductByScannedCode({
          storeId,
          scannedCode: result.data,
        });

        if (lookup.status === 'matched') {
          setStatusTone('success');
          setStatusMessage(`Produto ${lookup.product.id} encontrado. Voltando para a coleta...`);
          const nextToken = `${Date.now()}-${lookup.product.id}`;
          successNavigationTimeoutRef.current = setTimeout(() => {
            setSelection({
              token: nextToken,
              contextKey,
              storeId,
              scannedCode: lookup.scannedCode,
              productId: lookup.product.id,
              resolutionKind: lookup.resolutionKind,
              derivedQuantity: lookup.derivedQuantity,
            });
            router.back();
          }, 260);
          return;
        }

        if (lookup.status === 'multiple') {
          setStatusTone('warning');
          setStatusMessage(
            `Mais de um produto corresponde ao codigo ${lookup.scannedCode}. Use a busca manual para concluir com seguranca.`,
          );
          await playOperationalErrorAsync();
          return;
        }

        await playOperationalErrorAsync();
        setLookupFailure({
          token: `${Date.now()}-${lookup.scannedCode}`,
          contextKey,
          storeId,
          scannedCode: lookup.scannedCode,
        });
        router.back();
      } catch (error) {
        setStatusTone('error');
        setStatusMessage(
          error instanceof Error ? error.message : 'Falha ao validar o codigo lido.',
        );
        await playOperationalErrorAsync();
      }
    },
    [canScan, contextKey, router, setLookupFailure, setSelection, storeId],
  );

  if (!storeId) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Scanner indisponivel</Text>
        <Text style={styles.fallbackText}>
          Nao foi possivel identificar a loja atual desta coleta.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.actionPressed]}
        >
          <Text style={styles.primaryActionText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Preparando camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain ?? true;

    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Permissao de camera necessaria</Text>
        <Text style={styles.fallbackText}>
          Permita o acesso a camera para ler codigos de barras e selecionar o produto rapidamente.
        </Text>

        <View style={styles.fallbackActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}
          >
            <Text style={styles.secondaryActionText}>Cancelar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (canAskAgain) {
                void requestPermission();
                return;
              }

              void Linking.openSettings();
            }}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.actionPressed]}
          >
            <Text style={styles.primaryActionText}>
              {canAskAgain ? 'Conceder acesso' : 'Abrir configuracoes'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (mountErrorMessage) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackTitle}>Falha ao iniciar a camera</Text>
        <Text style={styles.fallbackText}>{mountErrorMessage}</Text>

        <View style={styles.fallbackActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}
          >
            <Text style={styles.secondaryActionText}>Cancelar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMountErrorMessage(null);
              handleRetryScan();
              setCameraInstanceKey((current) => current + 1);
            }}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.actionPressed]}
          >
            <Text style={styles.primaryActionText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          key={cameraInstanceKey}
          enableTorch={cameraFacing === 'back' && torchEnabled}
          facing={cameraFacing}
          onBarcodeScanned={canScan ? handleBarcodeScanned : undefined}
          onMountError={(event) => {
            scanLockRef.current = true;
            setCanScan(false);
            setMountErrorMessage(
              event.message || 'Nao foi possivel abrir a camera neste dispositivo.',
            );
            void playOperationalErrorAsync();
          }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <BarcodeScannerOverlay
        cameraFacing={cameraFacing}
        canToggleTorch={cameraFacing === 'back'}
        description={description}
        isProcessing={!canScan}
        lastScannedCode={lastScannedCode}
        statusMessage={statusMessage}
        statusTone={statusTone}
        title={title}
        torchEnabled={cameraFacing === 'back' && torchEnabled}
        onCancel={() => {
          router.back();
        }}
        onRetry={canScan ? undefined : handleRetryScan}
        onToggleFacing={handleToggleCameraFacing}
        onToggleTorch={() => {
          if (cameraFacing !== 'back') {
            return;
          }

          setTorchEnabled((current) => !current);
        }}
        statusLabel={
          canScan
            ? cameraFacing === 'back'
              ? 'Pronto para ler - traseira'
              : 'Pronto para ler - frontal'
            : 'Leitura pausada'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.background.app,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    color: 'white',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: {
    marginTop: 10,
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  fallbackActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryAction: {
    minHeight: 48,
    minWidth: 132,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryActionText: {
    color: colors.text.onAccent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  secondaryAction: {
    minHeight: 48,
    minWidth: 120,
    borderRadius: 10,
    borderColor: '#6B7280',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryActionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionPressed: {
    opacity: 0.88,
  },
});
