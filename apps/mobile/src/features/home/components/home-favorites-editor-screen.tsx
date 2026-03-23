import { AntDesign, Feather } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card } from "@/src/components/ui";
import {
  listHomeFavoriteEditorGroups,
  listHomeFavoritesForUser,
  saveHomeFavoritesForUser,
} from "@/src/features/home/services/home-favorites.service";
import { FeatureScreenLayout } from "@/src/features/shared/components/feature-screen-layout";
import { useAuthStore } from "@/src/features/auth/store/use-auth-store";
import {
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from "@/src/theme/theme-provider";
import { radii, spacing, typography } from "@/src/theme/tokens";

function toggleRouteKey(selectedKeys: string[], routeKey: string) {
  if (selectedKeys.includes(routeKey)) {
    return selectedKeys.filter((currentKey) => currentKey !== routeKey);
  }

  return [...selectedKeys, routeKey];
}

export function HomeFavoritesEditorScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [openedGroupIds, setOpenedGroupIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = currentUser?.id ?? null;
  const groups = useMemo(() => listHomeFavoriteEditorGroups(), []);
  const selectedItems = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items.filter((item) => selectedKeys.includes(item.key)),
      ),
    [groups, selectedKeys],
  );

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setSelectedKeys([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const favorites = await listHomeFavoritesForUser(userId);
      setSelectedKeys(favorites.map((favorite) => favorite.itemKey));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os favoritos.";
      setErrorMessage(message);
      setSelectedKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites]),
  );

  const handleSave = async () => {
    if (!userId || isSaving) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveHomeFavoritesForUser(userId, selectedKeys);
      router.back();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar os favoritos.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGroupOpen = (groupId: number) => {
    setOpenedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((currentGroupId) => currentGroupId !== groupId)
        : [...current, groupId],
    );
  };

  return (
    <FeatureScreenLayout
      contentContainerStyle={styles.content}
      onBackPress={() => router.back()}
      scrollable
      title="Editar Favoritos"
    >
      <Card>
        <Text style={styles.title}>Favoritos</Text>

        {selectedItems.length > 0 ? (
          <View style={styles.selectedWrap}>
            {selectedItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  setSelectedKeys((current) =>
                    current.filter((currentKey) => currentKey !== item.key),
                  );
                }}
                style={({ pressed }) => [
                  styles.selectedChip,
                  pressed && styles.selectedChipPressed,
                ]}
              >
                <Text style={styles.selectedChipText}>{item.label}</Text>
                <AntDesign
                  color={theme.colors.text.primary}
                  name="close"
                  size={12}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nenhum favorito selecionado</Text>
          </View>
        )}
      </Card>

      {errorMessage ? (
        <Card variant="muted">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Card>
      ) : null}

      {groups.map((group) => (
        <Card key={group.id} padded={false} variant="muted">
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              toggleGroupOpen(group.id);
            }}
            style={({ pressed }) => [
              styles.groupHeaderButton,
              pressed && styles.groupHeaderPressed,
            ]}
          >
            <View style={styles.groupHeaderMain}>
              <AntDesign
                color={theme.colors.text.muted}
                name={openedGroupIds.includes(group.id) ? "down" : "right"}
                size={16}
              />
              <View style={styles.groupIcon}>
                {group.renderIcon(18, theme.colors.text.onAccent)}
              </View>
              <Text style={styles.groupTitle}>{group.label}</Text>
            </View>

            <Text style={styles.groupCount}>
              {group.items.filter((item) => selectedKeys.includes(item.key)).length}
            </Text>
          </Pressable>

          {openedGroupIds.includes(group.id) ? (
            <View style={styles.optionList}>
              {group.items.map((item) => {
                const selected = selectedKeys.includes(item.key);

                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedKeys((current) =>
                        toggleRouteKey(current, item.key),
                      );
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      pressed && styles.optionRowPressed,
                    ]}
                  >
                    <View style={styles.optionHeader}>
                      <View style={styles.optionIcon}>
                        {item.renderIcon(
                          20,
                          selected
                            ? theme.colors.brand.primaryStrong
                            : theme.colors.text.muted,
                        )}
                      </View>
                      <Text style={styles.optionTitle}>{item.label}</Text>
                    </View>

                    <Feather
                      color={
                        selected
                          ? theme.colors.brand.primaryStrong
                          : theme.colors.text.muted
                      }
                      name={selected ? "check-square" : "square"}
                      size={20}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Card>
      ))}

      <View style={styles.actions}>
        <Button
          block
          disabled={isLoading || isSaving}
          label="Salvar favoritos"
          loading={isSaving}
          onPress={() => {
            void handleSave();
          }}
        />
        <Button
          block
          disabled={isLoading || isSaving}
          label="Limpar selecao"
          variant="ghost"
          onPress={() => {
            setSelectedKeys([]);
          }}
        />
      </View>
    </FeatureScreenLayout>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    title: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    description: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
      marginTop: spacing.sm,
    },
    selectedWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    selectedChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,85,59,0.08)",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    selectedChipPressed: {
      opacity: 0.86,
    },
    selectedChipText: {
      ...typography.textStyles.caption,
      color: theme.colors.text.primary,
    },
    emptyState: {
      marginTop: spacing.lg,
    },
    emptyTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    errorText: {
      ...typography.textStyles.body,
      color: theme.colors.badge.error.text,
    },
    groupHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    groupHeaderPressed: {
      opacity: 0.92,
    },
    groupHeaderMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
    },
    groupIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.brand.primary,
    },
    groupTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    groupCount: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      fontWeight: "700",
    },
    optionList: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.subtle,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.subtle,
    },
    optionRowSelected: {
      backgroundColor: theme.isDark
        ? "rgba(0,85,59,0.18)"
        : "rgba(0,85,59,0.08)",
    },
    optionRowPressed: {
      opacity: 0.92,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flex: 1,
    },
    optionIcon: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    optionTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    actions: {
      gap: spacing.sm,
      paddingBottom: spacing.xl,
    },
  });
