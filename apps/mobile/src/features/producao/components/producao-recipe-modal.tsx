import { useEffect, useRef } from "react";
import { InteractionManager, StyleSheet, Text, type TextInput, View } from "react-native";
import { Button, Select, type SelectOption } from "@/src/components/ui";
import { OperationalModalShell } from "@/src/features/shared/operational-entry/components/operational-modal-shell";
import { MovementMetricField } from "@/src/features/shared/stock-movement/components/movement-metric-field";
import type {
  LocalProductionRecipeSelection,
} from "@/src/features/producao/types";
import { useThemedStyles, type AppTheme } from "@/src/theme/theme-provider";
import { radii, spacing, typography } from "@/src/theme/tokens";

type ProducaoRecipeModalProps = {
  visible: boolean;
  recipeSelections: readonly LocalProductionRecipeSelection[];
  selectedRecipeKey: string | null;
  selectedRecipeAllowsDecimal: boolean;
  quantityInput: string;
  feedbackMessage: string | null;
  feedbackTone: "info" | "success" | "warning" | "error";
  saving: boolean;
  selectAutoOpenToken: number;
  onSelectRecipe: (selectionKey: string) => void;
  onChangeQuantity: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ProducaoRecipeModal({
  visible,
  recipeSelections,
  selectedRecipeKey,
  selectedRecipeAllowsDecimal,
  quantityInput,
  feedbackMessage,
  feedbackTone,
  saving,
  selectAutoOpenToken,
  onSelectRecipe,
  onChangeQuantity,
  onClose,
  onConfirm,
}: ProducaoRecipeModalProps) {
  const styles = useThemedStyles(createStyles);
  const quantityInputRef = useRef<TextInput>(null);
  const pendingFocusTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      for (const timeoutId of pendingFocusTimeoutsRef.current) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  function focusQuantityInput() {
    for (const timeoutId of pendingFocusTimeoutsRef.current) {
      clearTimeout(timeoutId);
    }

    pendingFocusTimeoutsRef.current = [];

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      quantityInputRef.current?.focus();
    });

    for (const delay of [0, 70, 160]) {
      const timeoutId = setTimeout(() => {
        quantityInputRef.current?.focus();
      }, delay);

      pendingFocusTimeoutsRef.current.push(timeoutId);
    }

    const cleanupTimeout = setTimeout(() => {
      interactionTask.cancel();
    }, 220);

    pendingFocusTimeoutsRef.current.push(cleanupTimeout);
  }

  const recipeOptions: SelectOption<string>[] = recipeSelections.map(
    (selection) => ({
      value: selection.key,
      label: `${selection.productId} - ${selection.productDescription}`,
      searchText: `${selection.productId} ${selection.productDescription} ${selection.recipeDescription}`,
    }),
  );

  return (
    <OperationalModalShell
      eyebrow="Producao"
      onClose={onClose}
      title="Lancar producao"
      visible={visible}
    >
      <View style={styles.formBody}>
        <Select
          autoOpenToken={selectAutoOpenToken}
          emptyMessage="Nenhum produto produzido encontrado para o filtro informado."
          hostVisible={visible}
          label="Produto produzido"
          options={recipeOptions}
          placeholder="Selecionar produto"
          searchPlaceholder="Pesquisar por codigo ou descricao"
          searchable
          value={selectedRecipeKey}
          onChange={(selectionKey) => {
            onSelectRecipe(selectionKey);
            focusQuantityInput();
          }}
        />

        <MovementMetricField
          inputRef={quantityInputRef}
          keyboardType={selectedRecipeAllowsDecimal ? "decimal-pad" : "number-pad"}
          label="Quantidade Produzida"
          value={quantityInput}
          onChangeText={onChangeQuantity}
          onSubmitEditing={onConfirm}
        />

        {feedbackMessage ? (
          <View
            style={[
              styles.feedbackBox,
              feedbackTone === "success"
                ? styles.feedbackSuccess
                : feedbackTone === "warning"
                  ? styles.feedbackWarning
                  : feedbackTone === "error"
                    ? styles.feedbackError
                    : styles.feedbackInfo,
            ]}
          >
            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Cancelar"
            style={styles.actionButton}
            variant="secondary"
            onPress={onClose}
          />
          <Button
            disabled={
              selectedRecipeKey == null || quantityInput.trim().length === 0
            }
            label="OK"
            loading={saving}
            style={styles.actionButton}
            onPress={onConfirm}
          />
        </View>
      </View>
    </OperationalModalShell>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    formBody: {
      gap: spacing.md,
      paddingBottom: spacing.xs,
    },
    feedbackBox: {
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    feedbackInfo: {
      backgroundColor: theme.colors.badge.info.background,
      borderColor: theme.colors.badge.info.border,
    },
    feedbackSuccess: {
      backgroundColor: theme.colors.badge.success.background,
      borderColor: theme.colors.badge.success.border,
    },
    feedbackWarning: {
      backgroundColor: theme.colors.badge.warning.background,
      borderColor: theme.colors.badge.warning.border,
    },
    feedbackError: {
      backgroundColor: theme.colors.badge.error.background,
      borderColor: theme.colors.badge.error.border,
    },
    feedbackText: {
      ...typography.textStyles.body,
      color: theme.colors.text.primary,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
      minHeight: 50,
    },
  });
