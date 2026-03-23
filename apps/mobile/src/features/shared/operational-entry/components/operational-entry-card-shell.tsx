import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SwipeDeleteCard } from '@/src/features/shared/operational-entry/components/swipe-delete-card';
import {
  TransmissionStatusBadge,
  type TransmissionBadgeEntry,
} from '@/src/features/shared/operational-entry/components/transmission-status-badge';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type OperationalEntryCardShellProps<TEntry extends TransmissionBadgeEntry> = {
  entry: TEntry;
  deleteTitle: string;
  deleteHelper: string;
  onDelete: (entry: TEntry) => void;
  children: ReactNode;
};

export function OperationalEntryCardShell<TEntry extends TransmissionBadgeEntry>({
  entry,
  deleteTitle,
  deleteHelper,
  onDelete,
  children,
}: OperationalEntryCardShellProps<TEntry>) {
  const styles = useThemedStyles(createStyles);

  return (
    <SwipeDeleteCard
      deleteHelper={deleteHelper}
      deleteTitle={deleteTitle}
      onDelete={() => {
        onDelete(entry);
      }}
    >
      <View style={styles.container}>
        <View style={styles.contentWrap}>
          <View style={styles.dataSection}>{children}</View>
          <TransmissionStatusBadge entry={entry} />
        </View>
      </View>
    </SwipeDeleteCard>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: 150,
      borderColor: theme.colors.border.default,
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
    },
    contentWrap: {
      minHeight: 150,
      flexDirection: 'row',
    },
    dataSection: {
      flex: 1,
      backgroundColor: theme.colors.background.surfaceAlt,
      justifyContent: 'center',
      paddingLeft: 12,
      paddingRight: 44,
      paddingVertical: 14,
      borderRightColor: theme.colors.border.default,
      borderRightWidth: 1,
    },
  });
