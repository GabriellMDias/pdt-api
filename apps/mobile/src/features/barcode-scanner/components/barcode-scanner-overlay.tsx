import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type BarcodeScannerOverlayProps = {
  title: string;
  description: string;
  statusMessage?: string | null;
  statusTone?: 'info' | 'success' | 'warning' | 'error';
  statusLabel?: string;
  lastScannedCode?: string | null;
  isProcessing?: boolean;
  cameraFacing: 'back' | 'front';
  canToggleTorch?: boolean;
  torchEnabled: boolean;
  onToggleFacing: () => void;
  onToggleTorch: () => void;
  onCancel: () => void;
  onRetry?: () => void;
};

function resolveStatusStyle(tone: BarcodeScannerOverlayProps['statusTone']) {
  if (tone === 'success') return styles.statusSuccess;
  if (tone === 'warning') return styles.statusWarning;
  if (tone === 'error') return styles.statusError;
  return styles.statusInfo;
}

export function BarcodeScannerOverlay({
  title,
  description,
  statusMessage,
  statusTone = 'info',
  statusLabel = 'Pronto para ler',
  lastScannedCode,
  isProcessing = false,
  cameraFacing,
  canToggleTorch = true,
  torchEnabled,
  onToggleFacing,
  onToggleTorch,
  onCancel,
  onRetry,
}: BarcodeScannerOverlayProps) {
  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View pointerEvents="box-none" style={styles.topPanel}>
        <View style={styles.topBar}>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                isProcessing ? styles.statusDotProcessing : styles.statusDotReady,
              ]}
            />
            <Text style={styles.statusPillText}>{statusLabel}</Text>
          </View>

          <Pressable
            accessibilityLabel="Fechar leitor de codigo"
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.topCloseButton, pressed && styles.actionButtonPressed]}
          >
            <Ionicons color="white" name="close" size={24} />
          </Pressable>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View pointerEvents="none" style={styles.scanAreaRow}>
        <View style={styles.sideShade} />
        <View style={styles.scanTargetWrap}>
          <View style={styles.scanTarget}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.scanHint}>Centralize o codigo dentro da moldura.</Text>
        </View>
        <View style={styles.sideShade} />
      </View>

      <View style={styles.bottomPanel}>
        {statusMessage ? (
          <View style={[styles.statusBox, resolveStatusStyle(statusTone)]}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        {lastScannedCode ? (
          <View style={styles.lastCodeBox}>
            <Text style={styles.lastCodeLabel}>Ultimo codigo lido</Text>
            <Text numberOfLines={1} style={styles.lastCodeValue}>
              {lastScannedCode}
            </Text>
          </View>
        ) : null}

        <Text style={styles.footerHint}>
          A leitura e automatica. Se o produto existir na base local, ele sera selecionado na
          coleta.
        </Text>

        <View style={styles.controlsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onToggleFacing}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          >
            <Ionicons color="white" name="camera-reverse-outline" size={22} />
            <Text style={styles.actionText}>
              {cameraFacing === 'back' ? 'Camera traseira' : 'Camera frontal'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!canToggleTorch}
            onPress={onToggleTorch}
            style={({ pressed }) => [
              styles.actionButton,
              !canToggleTorch && styles.actionButtonDisabled,
              pressed && canToggleTorch && styles.actionButtonPressed,
            ]}
          >
            <Ionicons
              color="white"
              name={torchEnabled ? 'flash' : 'flash-off'}
              size={22}
            />
            <Text style={styles.actionText}>
              {canToggleTorch
                ? torchEnabled
                  ? 'Lanterna ligada'
                  : 'Lanterna'
                : 'Lanterna indisponivel'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [
                styles.actionButton,
                styles.retryButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <MaterialCommunityIcons color="white" name="barcode-scan" size={22} />
              <Text style={styles.actionText}>{isProcessing ? 'Processando...' : 'Ler novamente'}</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.actionButton,
              styles.cancelButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons color="white" name="close" size={22} />
            <Text style={styles.actionText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topPanel: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(17,24,39,0.78)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotReady: {
    backgroundColor: '#22C55E',
  },
  statusDotProcessing: {
    backgroundColor: '#F59E0B',
  },
  statusPillText: {
    color: 'white',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  topCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(17,24,39,0.78)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  scanAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideShade: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  scanTargetWrap: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 12,
  },
  scanTarget: {
    width: 280,
    aspectRatio: 1.1,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderColor: 'rgba(255,255,255,0.26)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#0F8A35',
  },
  cornerTopLeft: {
    top: 14,
    left: 14,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 14,
    right: 14,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 14,
    left: 14,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 14,
    right: 14,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 26,
    right: 26,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(15,138,53,0.9)',
  },
  scanHint: {
    color: '#E5E7EB',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  bottomPanel: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  statusBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusInfo: {
    backgroundColor: 'rgba(2,132,199,0.22)',
  },
  statusSuccess: {
    backgroundColor: 'rgba(22,163,74,0.22)',
  },
  statusWarning: {
    backgroundColor: 'rgba(217,119,6,0.24)',
  },
  statusError: {
    backgroundColor: 'rgba(220,38,38,0.24)',
  },
  statusText: {
    color: 'white',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  lastCodeBox: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(17,24,39,0.78)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    gap: 4,
  },
  lastCodeLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'uppercase',
    fontWeight: '700',
    textAlign: 'center',
  },
  lastCodeValue: {
    color: 'white',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerHint: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(23,23,23,0.82)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  retryButton: {
    backgroundColor: 'rgba(9,94,74,0.9)',
  },
  cancelButton: {
    backgroundColor: 'rgba(55,55,55,0.86)',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionText: {
    color: 'white',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
