import { Entypo } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/ui';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type TransmissionHeaderProps = {
  lastSyncedAt: string | null;
  currentStoreLabel: string;
  transmitButtonLabel?: string;
  transmitButtonDisabled?: boolean;
  transmitButtonLoading?: boolean;
  exportButtonDisabled?: boolean;
  exportButtonLoading?: boolean;
  onTransmit: () => void;
  onExport?: (() => void) | null;
};

export function TransmissionHeader({
  lastSyncedAt,
  currentStoreLabel,
  transmitButtonLabel = 'Transmitir',
  transmitButtonDisabled = false,
  transmitButtonLoading = false,
  exportButtonDisabled = false,
  exportButtonLoading = false,
  onTransmit,
  onExport = null,
}: TransmissionHeaderProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.headerContent}>
      <View style={styles.topRow}>
        <View style={styles.syncInfo}>
          <Text style={styles.syncLabel}>Ultima Sincronizacao:</Text>
          <Text style={styles.syncValue}>
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('pt-BR') : 'Nao sincronizado'}
          </Text>
          <Text style={styles.syncStore}>{currentStoreLabel}</Text>
        </View>

        <View style={styles.actionsRow}>
          {onExport ? (
            <Button
              accessibilityLabel="Exportar TXT"
              disabled={exportButtonDisabled}
              loading={exportButtonLoading}
              size="lg"
              style={styles.exportButton}
              variant="secondary"
              onPress={onExport}
            >
              <Entypo name="export" size={22} color={theme.colors.brand.primaryStrong} />
            </Button>
          ) : null}

          <Button
            disabled={transmitButtonDisabled}
            label={transmitButtonLabel}
            labelStyle={styles.transmitButtonLabel}
            leftSlot={<Entypo color="white" name="paper-plane" size={24} />}
            loading={transmitButtonLoading}
            style={styles.transmitButton}
            onPress={onTransmit}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  headerContent: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncInfo: {
    flex: 1,
    paddingTop: 2,
    gap: 2,
  },
  syncLabel: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  syncValue: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  syncStore: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  exportButton: {
    minHeight: 50,
    width: 54,
    paddingHorizontal: 0,
    borderRadius: 10,
  },
  transmitButton: {
    position: 'relative',
    minHeight: 50,
    width: 175,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  transmitButtonLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
