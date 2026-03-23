import { StyleSheet, View } from 'react-native';
import { Button, Select, type SelectOption } from '@/src/components/ui';
import { OperationalModalShell } from '@/src/features/shared/operational-entry/components/operational-modal-shell';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { spacing } from '@/src/theme/tokens';

type OperationalSelectModalProps<T extends string | number> = {
  visible: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  selectLabel: string;
  selectPlaceholder: string;
  emptyMessage: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  confirmLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onChange: (value: T) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function OperationalSelectModal<T extends string | number>({
  visible,
  eyebrow,
  title,
  subtitle,
  selectLabel,
  selectPlaceholder,
  emptyMessage,
  options,
  value,
  confirmLabel = 'OK',
  searchable = false,
  searchPlaceholder = 'Pesquisar...',
  onChange,
  onClose,
  onConfirm,
}: OperationalSelectModalProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <OperationalModalShell
      eyebrow={eyebrow}
      onClose={onClose}
      subtitle={subtitle}
      title={title}
      visible={visible}
    >
      <>
        <Select
          emptyMessage={emptyMessage}
          label={selectLabel}
          options={options}
          placeholder={selectPlaceholder}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          value={value}
          onChange={onChange}
        />

        <View style={styles.actions}>
          <Button
            label="Cancelar"
            style={styles.actionButton}
            variant="secondary"
            onPress={onClose}
          />
          <Button
            disabled={value == null}
            label={confirmLabel}
            style={styles.actionButton}
            onPress={onConfirm}
          />
        </View>
      </>
    </OperationalModalShell>
  );
}

const createStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
      minHeight: 50,
    },
  });
