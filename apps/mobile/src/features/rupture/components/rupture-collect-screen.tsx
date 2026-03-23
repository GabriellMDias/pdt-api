import {
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Card } from "@/src/components/ui";
import { useAuthStore } from "@/src/features/auth/store/use-auth-store";
import { flushPendingSyncOutbox } from "@/src/features/mobile-sync/services/mobile-sync-service";
import { ProductLookupInput } from "@/src/features/rupture/components/product-lookup-input";
import {
  createLocalRuptureEntry,
  getLocalRuptureCatalogProductById,
  searchLocalRuptureCatalog,
} from "@/src/features/rupture/data/rupture-db";
import { useProductScanStore } from "@/src/features/shared/products/store/use-product-scan-store";
import type { LocalRuptureCatalogProduct } from "@/src/features/rupture/types";
import { FeatureScreenLayout } from "@/src/features/shared/components/feature-screen-layout";
import {
  playOperationalErrorAsync,
  playOperationalSuccessAsync,
  warmupOperationalFeedbackAsync,
} from "@/src/features/shared/services/operational-feedback.service";
import {
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from "@/src/theme/theme-provider";
import { radii, spacing, typography } from "@/src/theme/tokens";

function parseStoreId(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveExactMatch(
  query: string,
  products: LocalRuptureCatalogProduct[],
): LocalRuptureCatalogProduct | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  return (
    products.find((product) => product.barcode?.trim() === normalizedQuery) ??
    products.find((product) => String(product.id) === normalizedQuery) ??
    products.find(
      (product) => product.description.trim().toLowerCase() === normalizedQuery,
    ) ??
    null
  );
}

type SaveRuptureEntryOptions = {
  origin?: "manual" | "scanner";
  reopenScannerOnSuccess?: boolean;
};

function buildRuptureScanContextKey(storeId: number, shelfCode: string) {
  return `rupture:${storeId}:${shelfCode.trim()}`;
}

export function RuptureCollectScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    shelfCode?: string | string[];
    storeId?: string | string[];
  }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const availableStores = useAuthStore((state) => state.availableStores);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const autoTransmitEnabled = useAuthStore(
    (state) => state.autoTransmitEnabled,
  );
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const consumeSelection = useProductScanStore(
    (state) => state.consumeSelection,
  );
  const consumeLookupFailure = useProductScanStore(
    (state) => state.consumeLookupFailure,
  );

  const inputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reopenScannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const scannerReopenGuardRef = useRef(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedProduct, setSelectedProduct] =
    useState<LocalRuptureCatalogProduct | null>(null);
  const [suggestions, setSuggestions] = useState<LocalRuptureCatalogProduct[]>(
    [],
  );
  const [isSuggestionBoxVisible, setIsSuggestionBoxVisible] = useState(false);
  const [hasInteractedWithLookup, setHasInteractedWithLookup] = useState(false);
  const [continuousScanEnabled, setContinuousScanEnabled] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<
    "success" | "warning" | "error" | "info"
  >("info");
  const [scannerLookupModalCode, setScannerLookupModalCode] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  const shelfCode = Array.isArray(params.shelfCode)
    ? (params.shelfCode[0] ?? "")
    : (params.shelfCode ?? "");
  const parsedStoreId = parseStoreId(params.storeId);
  const storeId = parsedStoreId ?? currentStoreId;
  const selectedStore =
    storeId != null
      ? (availableStores.find((store) => store.id === storeId) ?? null)
      : null;
  const canPushEvents =
    sessionMode === "online" && connectivityStatus === "online";
  const scanContextKey =
    storeId != null ? buildRuptureScanContextKey(storeId, shelfCode) : "";

  const dismissSuggestions = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsSuggestionBoxVisible(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
  }, []);

  const openScanner = useCallback(() => {
    if (!storeId) {
      setNoticeTone("warning");
      setNoticeMessage("Selecione uma loja antes de abrir o leitor de codigo.");
      void playOperationalErrorAsync();
      return;
    }

    dismissSuggestions();
    router.push({
      pathname: "/rupture-scan",
      params: {
        shelfCode,
        storeId: String(storeId),
      },
    });
  }, [dismissSuggestions, router, shelfCode, storeId]);

  useEffect(() => {
    void warmupOperationalFeedbackAsync();

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (reopenScannerTimeoutRef.current) {
        clearTimeout(reopenScannerTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      if (!storeId) {
        if (!cancelled) {
          setSuggestions([]);
        }
        return;
      }

      const nextSuggestions = await searchLocalRuptureCatalog({
        storeId,
        query: deferredQuery,
        limit: deferredQuery.trim() ? 15 : 8,
      });

      if (!cancelled) {
        setSuggestions(nextSuggestions);
      }
    }

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, storeId]);

  const scheduleScannerReopen = useCallback(() => {
    if (!storeId || scannerReopenGuardRef.current) {
      return;
    }

    scannerReopenGuardRef.current = true;
    if (reopenScannerTimeoutRef.current) {
      clearTimeout(reopenScannerTimeoutRef.current);
    }

    reopenScannerTimeoutRef.current = setTimeout(() => {
      scannerReopenGuardRef.current = false;
      openScanner();
    }, 220);
  }, [openScanner, storeId]);

  const handleSave = useCallback(
    async (
      productOverride?: LocalRuptureCatalogProduct | null,
      options?: SaveRuptureEntryOptions,
    ) => {
      if (!currentUser || !storeId || isSaving) return;

      const productToSave = productOverride ?? selectedProduct;
      if (!productToSave) {
        setNoticeTone("warning");
        setNoticeMessage("Selecione um produto antes de salvar a coleta.");
        void playOperationalErrorAsync();
        return;
      }

      try {
        setIsSaving(true);
        setNoticeMessage(null);

        const saveResult = await createLocalRuptureEntry({
          userId: currentUser.id,
          storeId,
          shelfCode,
          product: productToSave,
        });

        if (saveResult.status === "duplicate_pending") {
          setQuery("");
          setSelectedProduct(null);
          setIsSuggestionBoxVisible(false);
          setNoticeMessage(null);

          const shouldReopenScanner =
            Boolean(options?.reopenScannerOnSuccess) &&
            options?.origin === "scanner" &&
            continuousScanEnabled;

          if (shouldReopenScanner) {
            scheduleScannerReopen();
          } else {
            inputRef.current?.focus();
          }

          return;
        }

        await playOperationalSuccessAsync();

        let nextTone: "success" | "warning" = "success";
        let nextMessage = `Produto ${productToSave.id} salvo na prateleira ${shelfCode}.`;

        if (autoTransmitEnabled && canPushEvents) {
          try {
            const result = await flushPendingSyncOutbox({
              userId: currentUser.id,
              storeId,
              eventTypePrefix: "rupture.",
              scope: "rupture.push",
              triggerSource: "auto_after_create",
            });

            if (result.processed > 0 || result.duplicates > 0) {
              nextMessage = `${nextMessage} Tentativa de envio executada.`;
            }

            if (result.temporaryErrors > 0 || result.permanentErrors > 0) {
              nextTone = "warning";
              nextMessage = `${nextMessage} Alguns itens ainda seguem pendentes na outbox.`;
            }
          } catch (error) {
            nextTone = "warning";
            nextMessage = `${nextMessage} ${error instanceof Error ? error.message : "Falha ao sincronizar agora."}`;
          }
        } else if (autoTransmitEnabled && !canPushEvents) {
          nextTone = "warning";
          nextMessage = `${nextMessage} A coleta ficou pendente para transmissao porque a sessao online ou a internet nao estao disponiveis.`;
        } else {
          nextMessage = `${nextMessage} A coleta ficou pendente para transmissao manual.`;
        }

        const shouldReopenScanner =
          Boolean(options?.reopenScannerOnSuccess) &&
          options?.origin === "scanner" &&
          continuousScanEnabled;

        if (shouldReopenScanner) {
          nextMessage = `${nextMessage} Reabrindo leitor para a proxima coleta.`;
        }

        setQuery("");
        setSelectedProduct(null);
        setIsSuggestionBoxVisible(false);
        setNoticeTone(nextTone);
        setNoticeMessage(nextMessage);

        if (shouldReopenScanner) {
          scheduleScannerReopen();
        } else {
          inputRef.current?.focus();
        }
      } catch (error) {
        setNoticeTone("error");
        setNoticeMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a coleta.",
        );
        await playOperationalErrorAsync();
      } finally {
        setIsSaving(false);
      }
    },
    [
      autoTransmitEnabled,
      canPushEvents,
      continuousScanEnabled,
      currentUser,
      isSaving,
      scheduleScannerReopen,
      selectedProduct,
      shelfCode,
      storeId,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      if (!storeId || !shelfCode) {
        return;
      }

      const lookupFailure = consumeLookupFailure(scanContextKey);
      if (lookupFailure) {
        setSelectedProduct(null);
        setHasInteractedWithLookup(true);
        setQuery(lookupFailure.scannedCode);
        setIsSuggestionBoxVisible(false);
        setNoticeMessage(null);
        setScannerLookupModalCode(lookupFailure.scannedCode);
        return;
      }

      const selection = consumeSelection(scanContextKey);
      if (!selection) {
        return;
      }

      const resolvedSelection = selection;
      const resolvedStoreId = storeId;

      let cancelled = false;

      async function applyScannerSelection() {
        const product = await getLocalRuptureCatalogProductById(
          resolvedStoreId,
          resolvedSelection.productId,
        );

        if (cancelled) {
          return;
        }

        if (!product) {
          setNoticeTone("warning");
          setNoticeMessage(
            "Produto lido nao foi encontrado na base local atual.",
          );
          await playOperationalErrorAsync();
          return;
        }

        setSelectedProduct(product);
        setHasInteractedWithLookup(true);
        setQuery(
          resolvedSelection.scannedCode.trim()
            ? resolvedSelection.scannedCode
            : product.barcode?.trim()
              ? product.barcode
              : String(product.id),
        );
        setIsSuggestionBoxVisible(false);

        if (continuousScanEnabled) {
          setNoticeTone("info");
          setNoticeMessage(
            `Produto ${product.id} lido. Salvando automaticamente...`,
          );
          await handleSave(product, {
            origin: "scanner",
            reopenScannerOnSuccess: true,
          });
          return;
        }

        setNoticeTone("success");
        setNoticeMessage(
          resolvedSelection.resolutionKind === "weighted_barcode_internal_code"
            ? `Produto ${product.id} selecionado automaticamente a partir do codigo lido.`
            : `Produto ${product.id} selecionado automaticamente pela leitura.`,
        );
        inputRef.current?.focus();
      }

      void applyScannerSelection();

      return () => {
        cancelled = true;
      };
    }, [
      consumeLookupFailure,
      consumeSelection,
      continuousScanEnabled,
      handleSave,
      scanContextKey,
      shelfCode,
      storeId,
    ]),
  );

  async function handleSubmitLookup() {
    const exactMatch = resolveExactMatch(query, suggestions);
    if (exactMatch) {
      setSelectedProduct(exactMatch);
      setQuery(
        exactMatch.barcode?.trim() ? exactMatch.barcode : String(exactMatch.id),
      );
      setIsSuggestionBoxVisible(false);
      return;
    }

    setIsSuggestionBoxVisible(true);
    setNoticeTone("warning");
    setNoticeMessage(
      "Nenhum produto compativel foi encontrado para o valor digitado.",
    );
    await playOperationalErrorAsync();
  }

  if (!currentUser || !storeId) {
    return (
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Ruptura"
      >
        <Text style={styles.noticeText}>
          Nao foi possivel resolver a coleta de ruptura.
        </Text>
      </FeatureScreenLayout>
    );
  }

  return (
    <FeatureScreenLayout
      contentContainerStyle={styles.body}
      onBackPress={() => router.back()}
      padded={false}
      title="Ruptura"
    >
      {isSuggestionBoxVisible ? (
        <Pressable
          onPress={dismissSuggestions}
          style={styles.suggestionsBackdrop}
        />
      ) : null}

      <Card style={styles.topCard} variant="muted">
        <View style={styles.topCardHeader}>
          <View style={styles.shelfBlock}>
            <Text style={styles.shelfValue}>#{shelfCode}</Text>
            <Text style={styles.shelfHelper}>
              {selectedStore
                ? `Loja ${selectedStore.id} - ${selectedStore.description}`
                : "Loja selecionada"}
            </Text>
          </View>

          <Button
            label="Salvar"
            leftSlot={<FontAwesome color="white" name="save" size={18} />}
            style={styles.saveButton}
            onPress={() => {
              void handleSave(undefined, { origin: "manual" });
            }}
            loading={isSaving}
          />
        </View>
      </Card>

      <Card style={styles.lookupCard}>
        <ProductLookupInput
          ref={inputRef}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setIsSuggestionBoxVisible(false);
              blurTimeoutRef.current = null;
            }, 140);
          }}
          onCameraPress={openScanner}
          onChangeText={(value) => {
            setQuery(value);
            setSelectedProduct(null);
            setNoticeMessage(null);
            if (hasInteractedWithLookup || value.trim().length > 0) {
              setIsSuggestionBoxVisible(true);
            }
          }}
          onClear={() => {
            setQuery("");
            setSelectedProduct(null);
            setNoticeMessage(null);
            setIsSuggestionBoxVisible(hasInteractedWithLookup);
            inputRef.current?.focus();
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
          }}
          onPressIn={() => {
            setHasInteractedWithLookup(true);
            setIsSuggestionBoxVisible(true);
          }}
          onSelectProduct={(product) => {
            setSelectedProduct(product);
            setHasInteractedWithLookup(true);
            setQuery(
              product.barcode?.trim() ? product.barcode : String(product.id),
            );
            setNoticeMessage(null);
            setIsSuggestionBoxVisible(false);
          }}
          onSubmitEditing={() => {
            void handleSubmitLookup();
          }}
          selectedProductId={selectedProduct?.id ?? null}
          suggestions={suggestions}
          suggestionsVisible={isSuggestionBoxVisible}
          value={query}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: continuousScanEnabled }}
          onPress={() => {
            setContinuousScanEnabled((current) => !current);
          }}
          style={({ pressed }) => [
            styles.continuousToggle,
            continuousScanEnabled && styles.continuousToggleActive,
            pressed && styles.continuousTogglePressed,
          ]}
        >
          <View
            style={[
              styles.checkbox,
              continuousScanEnabled && styles.checkboxChecked,
            ]}
          >
            {continuousScanEnabled ? (
              <Ionicons
                color={theme.colors.text.onAccent}
                name="checkmark"
                size={16}
              />
            ) : null}
          </View>

          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Coleta contínua pelo scanner</Text>
            <Text style={styles.toggleText}>
              Quando ativado, uma leitura valida salva automaticamente e reabre
              a camera para o proximo item.
            </Text>
          </View>

          <MaterialCommunityIcons
            color={
              continuousScanEnabled
                ? theme.colors.brand.primaryStrong
                : theme.colors.text.muted
            }
            name={continuousScanEnabled ? "barcode-scan" : "barcode"}
            size={22}
          />
        </Pressable>
      </Card>

      <Card style={styles.productCard} variant="muted">
        <Text style={styles.sectionTitle}>Produto selecionado</Text>
        <Text style={styles.productName}>
          {selectedProduct?.description ??
            "Selecione um produto para salvar a coleta."}
        </Text>

        <View style={styles.productMetaGrid}>
          <View style={styles.productMetaItem}>
            <Text style={styles.productMetaLabel}>Codigo interno</Text>
            <Text style={styles.productMetaValue}>
              {selectedProduct ? selectedProduct.id : "-"}
            </Text>
          </View>

          <View style={styles.productMetaItem}>
            <Text style={styles.productMetaLabel}>Codigo de barras</Text>
            <Text numberOfLines={1} style={styles.productMetaValue}>
              {selectedProduct?.barcode?.trim() ? selectedProduct.barcode : "-"}
            </Text>
          </View>

          <View style={styles.productMetaItemFull}>
            <Text style={styles.productMetaLabel}>Embalagem</Text>
            <Text style={styles.productMetaValue}>
              {selectedProduct?.packagingDescription
                ? `${selectedProduct.packagingDescription} ${selectedProduct.packageQuantity ?? ""}`.trim()
                : "-"}
            </Text>
          </View>
        </View>
      </Card>

      <Modal
        animationType="fade"
        statusBarTranslucent
        transparent
        visible={scannerLookupModalCode != null}
      >
        <View style={styles.lookupModalOverlay}>
          <View style={styles.lookupModalCard}>
            <Text style={styles.lookupModalEyebrow}>Leitor de codigo</Text>
            <Text style={styles.lookupModalTitle}>Produto nao encontrado</Text>
            <Text style={styles.lookupModalMessage}>
              Produto nao encontrado para o codigo informado.
            </Text>
            {scannerLookupModalCode ? (
              <Text style={styles.lookupModalCode}>
                Codigo lido: {scannerLookupModalCode}
              </Text>
            ) : null}

            <Button
              label="OK"
              onPress={() => {
                setScannerLookupModalCode(null);
                inputRef.current?.focus();
              }}
              style={styles.lookupModalAction}
            />
          </View>
        </View>
      </Modal>

      {noticeMessage ? (
        <View
          style={[
            styles.noticeBox,
            noticeTone === "success"
              ? styles.noticeSuccess
              : noticeTone === "warning"
                ? styles.noticeWarning
                : noticeTone === "error"
                  ? styles.noticeError
                  : styles.noticeInfo,
          ]}
        >
          <Text style={styles.noticeText}>{noticeMessage}</Text>
        </View>
      ) : null}
    </FeatureScreenLayout>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    body: {
      flex: 1,
      position: "relative",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    suggestionsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 2,
    },
    topCard: {
      zIndex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    topCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    shelfBlock: {
      flex: 1,
      gap: spacing.xxs,
    },
    eyebrow: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: "uppercase",
    },
    shelfValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
      fontSize: 20,
      lineHeight: 24,
    },
    shelfHelper: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    saveButton: {
      width: 116,
      minHeight: 48,
      alignSelf: "flex-start",
    },
    lookupCard: {
      zIndex: 4,
      gap: spacing.md,
    },
    sectionHeader: {
      gap: spacing.xxs,
    },
    sectionTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    sectionHint: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    continuousToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    continuousToggleActive: {
      borderColor: theme.colors.brand.primaryStrong,
      backgroundColor: theme.isDark
        ? "rgba(0,85,59,0.16)"
        : "rgba(0,85,59,0.08)",
    },
    continuousTogglePressed: {
      opacity: 0.92,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.colors.border.strong,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background.surface,
    },
    checkboxChecked: {
      borderColor: theme.colors.brand.primaryStrong,
      backgroundColor: theme.colors.brand.primaryStrong,
    },
    toggleCopy: {
      flex: 1,
      gap: spacing.xxs,
    },
    toggleTitle: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    toggleText: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    productCard: {
      zIndex: 1,
      gap: spacing.md,
    },
    productName: {
      color: theme.colors.text.primary,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "700",
      minHeight: 56,
    },
    productMetaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    productMetaItem: {
      width: "47%",
      gap: spacing.xxs,
    },
    productMetaItemFull: {
      width: "100%",
      gap: spacing.xxs,
    },
    productMetaLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: "uppercase",
    },
    productMetaValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    lookupModalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.strong,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    lookupModalCard: {
      width: "100%",
      maxWidth: 340,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surfaceAlt,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      gap: spacing.md,
    },
    lookupModalEyebrow: {
      ...typography.textStyles.caption,
      color: theme.colors.brand.primaryStrong,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    lookupModalTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    lookupModalMessage: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    lookupModalCode: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    lookupModalAction: {
      minHeight: 50,
    },
    noticeBox: {
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      zIndex: 1,
    },
    noticeInfo: {
      backgroundColor: theme.colors.badge.info.background,
      borderColor: theme.colors.badge.info.border,
      borderWidth: 1,
    },
    noticeSuccess: {
      backgroundColor: theme.colors.badge.success.background,
      borderColor: theme.colors.badge.success.border,
      borderWidth: 1,
    },
    noticeWarning: {
      backgroundColor: theme.colors.badge.warning.background,
      borderColor: theme.colors.badge.warning.border,
      borderWidth: 1,
    },
    noticeError: {
      backgroundColor: theme.colors.badge.error.background,
      borderColor: theme.colors.badge.error.border,
      borderWidth: 1,
    },
    noticeText: {
      ...typography.textStyles.body,
      color: theme.colors.text.primary,
    },
  });
