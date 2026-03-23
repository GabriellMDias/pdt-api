import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Input } from "@/src/components/ui";
import { radii, spacing, typography } from "@/src/theme/tokens";
import { useThemedStyles, type AppTheme } from "@/src/theme/theme-provider";

type RuptureShelfModalProps = {
  visible: boolean;
  shelfCode: string;
  onChangeShelfCode: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function RuptureShelfModal({
  visible,
  shelfCode,
  onChangeShelfCode,
  onClose,
  onConfirm,
}: RuptureShelfModalProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Ruptura</Text>
            <Text style={styles.title}>Informar prateleira</Text>
            <Text style={styles.subtitle}>
              Digite a prateleira antes de iniciar a coleta dos produtos.
            </Text>
          </View>

          <Input
            autoFocus
            keyboardType="number-pad"
            label="Prateleira"
            placeholder="Ex.: 102"
            value={shelfCode}
            onChangeText={onChangeShelfCode}
            containerStyle={styles.inputContainer}
            inputStyle={styles.inputText}
          />

          <View style={styles.actions}>
            <Button
              label="Cancelar"
              variant="secondary"
              style={styles.actionButton}
              labelStyle={styles.cancelLabel}
              onPress={onClose}
            />
            <Button label="OK" style={styles.actionButton} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay.strong,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.colors.background.surfaceAlt,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.textStyles.caption,
    color: theme.colors.brand.primaryStrong,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    ...typography.textStyles.title,
    color: theme.colors.text.primary,
  },
  subtitle: {
    ...typography.textStyles.body,
    color: theme.colors.text.secondary,
  },
  inputContainer: {
    gap: spacing.xs,
  },
  inputText: {
    color: theme.colors.text.primary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
  },
  cancelLabel: {
    color: theme.colors.text.inverseMuted,
  },
});
