import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { FeatureScreenLayout } from "@/src/features/shared/components/feature-screen-layout";
import { ProductLookupField } from "@/src/features/shared/products/components/product-lookup-field";
import { useProductScanStore } from "@/src/features/shared/products/store/use-product-scan-store";
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
import { MovementMetricField } from "@/src/features/shared/stock-movement/components/movement-metric-field";
import { useQuantityDecimalRevalidation } from "@/src/features/shared/stock-movement/hooks/use-quantity-decimal-revalidation";
import {
  formatCurrency,
  formatDecimalValue,
  formatDisplayNumber,
  normalizeManualNumberInput,
  parseInputNumber,
} from "@/src/features/shared/stock-movement/utils";
import {
  createLocalTrocaEntry,
  getLocalExchangeReasonById,
  getLocalTrocaCatalogProductById,
  getTrocaCollectedBalanceByProductAndReason,
  listLocalExchangeReasons,
  searchLocalTrocaCatalog,
} from "@/src/features/troca/data/troca-db";
import { TrocaAddRemoveToggle } from "@/src/features/troca/components/troca-add-remove-toggle";
import { TrocaReasonModal } from "@/src/features/troca/components/troca-reason-modal";
import type {
  LocalExchangeReason,
  LocalTrocaCatalogProduct,
  TrocaMovementType,
} from "@/src/features/troca/types";

function parseStoreId(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseReasonId(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildTrocaScanContextKey(storeId: number, reasonId: number) {
  return `troca:${storeId}:${reasonId}`;
}

function resolveExactMatch(
  query: string,
  products: LocalTrocaCatalogProduct[],
): LocalTrocaCatalogProduct | null {
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

export function TrocaCollectScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    reasonId?: string | string[];
    storeId?: string | string[];
  }>();
  const parsedStoreId = parseStoreId(params.storeId);
  const parsedReasonId = parseReasonId(params.reasonId);
  const currentUser = useAuthStore((state) => state.currentUser);
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
  const quantityInputRef = useRef<TextInput>(null);
  const packageCountInputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [availableReasons, setAvailableReasons] = useState<
    LocalExchangeReason[]
  >([]);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(
    parsedReasonId,
  );
  const [selectedReason, setSelectedReason] =
    useState<LocalExchangeReason | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<LocalTrocaCatalogProduct | null>(null);
  const [suggestions, setSuggestions] = useState<LocalTrocaCatalogProduct[]>(
    [],
  );
  const [isSuggestionBoxVisible, setIsSuggestionBoxVisible] = useState(false);
  const [hasInteractedWithLookup, setHasInteractedWithLookup] = useState(false);
  const [movementType, setMovementType] = useState<TrocaMovementType>("add");
  const [quantityInput, setQuantityInput] = useState("");
  const [packageCountInput, setPackageCountInput] = useState("1");
  const [collectedBalance, setCollectedBalance] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<
    "success" | "warning" | "error" | "info"
  >("info");
  const [scannerLookupModalCode, setScannerLookupModalCode] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReasonModalVisible, setIsReasonModalVisible] = useState(false);

  const storeId = parsedStoreId ?? currentStoreId;
  const canPushEvents =
    sessionMode === "online" && connectivityStatus === "online";
  const scanContextKey =
    storeId != null && selectedReasonId != null
      ? buildTrocaScanContextKey(storeId, selectedReasonId)
      : "";

  const totalQuantity = useMemo(() => {
    const quantity = parseInputNumber(quantityInput);
    const packageCount = parseInputNumber(packageCountInput);
    const total = quantity * packageCount;
    return Number.isFinite(total) ? total : 0;
  }, [packageCountInput, quantityInput]);

  const handleInvalidQuantityForSelectedProduct = useCallback(
    (message: string) => {
      setNoticeTone("warning");
      setNoticeMessage(message);
    },
    [],
  );

  useQuantityDecimalRevalidation({
    enabled: selectedProduct != null,
    allowDecimal: selectedProduct?.decimalAllowed ?? false,
    quantityInput,
    setQuantityInput,
    onInvalid: handleInvalidQuantityForSelectedProduct,
  });

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
    if (!storeId || !selectedReasonId) {
      setNoticeTone("warning");
      setNoticeMessage(
        "Selecione a loja e o motivo da troca antes de abrir o leitor.",
      );
      void playOperationalErrorAsync();
      return;
    }

    dismissSuggestions();
    router.push({
      pathname: "/troca-scan" as Href,
      params: {
        reasonId: String(selectedReasonId),
        storeId: String(storeId),
      },
    } as Href);
  }, [dismissSuggestions, router, selectedReasonId, storeId]);

  useEffect(() => {
    void warmupOperationalFeedbackAsync();

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReason() {
      const [reasons, reason] = await Promise.all([
        listLocalExchangeReasons(),
        selectedReasonId
          ? getLocalExchangeReasonById(selectedReasonId)
          : Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      setAvailableReasons(reasons);

      if (!selectedReasonId) {
        setSelectedReason(null);
        return;
      }

      setSelectedReason(reason);

      if (!reason && reasons.length > 0) {
        setSelectedReasonId(reasons[0].id);
      }
    }

    void loadReason();

    return () => {
      cancelled = true;
    };
  }, [selectedReasonId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      if (!storeId) {
        if (!cancelled) {
          setSuggestions([]);
        }
        return;
      }

      const nextSuggestions = await searchLocalTrocaCatalog({
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

  useEffect(() => {
    let cancelled = false;

    async function loadCollectedBalance() {
      if (!currentUser || !storeId || !selectedReasonId || !selectedProduct) {
        setCollectedBalance(0);
        return;
      }

      const balance = await getTrocaCollectedBalanceByProductAndReason({
        userId: currentUser.id,
        storeId,
        reasonId: selectedReasonId,
        productId: selectedProduct.id,
      });

      if (!cancelled) {
        setCollectedBalance(balance);
      }
    }

    void loadCollectedBalance();

    return () => {
      cancelled = true;
    };
  }, [currentUser, selectedProduct, selectedReasonId, storeId]);

  useFocusEffect(
    useCallback(() => {
      if (!storeId || !selectedReasonId) {
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

      const consumedSelection = consumeSelection(scanContextKey);
      if (!consumedSelection) {
        return;
      }
      const selection = consumedSelection;

      const resolvedStoreId = storeId;
      let cancelled = false;

      async function applyScannerSelection() {
        const product = await getLocalTrocaCatalogProductById(
          resolvedStoreId,
          selection.productId,
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
          selection.scannedCode.trim()
            ? selection.scannedCode
            : product.barcode?.trim()
              ? product.barcode
              : String(product.id),
        );
        setIsSuggestionBoxVisible(false);
        setNoticeTone("success");
        setNoticeMessage(
          selection.resolutionKind === "weighted_barcode_internal_code"
            ? `Produto ${product.id} selecionado automaticamente a partir do codigo lido.`
            : `Produto ${product.id} selecionado automaticamente pela leitura.`,
        );

        if (
          selection.derivedQuantity != null &&
          selection.derivedQuantity > 0
        ) {
          setQuantityInput(formatDecimalValue(selection.derivedQuantity));
        }

        quantityInputRef.current?.focus();
      }

      void applyScannerSelection();

      return () => {
        cancelled = true;
      };
    }, [
      consumeLookupFailure,
      consumeSelection,
      scanContextKey,
      selectedReasonId,
      storeId,
    ]),
  );

  useEffect(() => {
    if (parsedReasonId != null) {
      setSelectedReasonId(parsedReasonId);
    }
  }, [parsedReasonId]);

  async function handleSubmitLookup() {
    const exactMatch = resolveExactMatch(query, suggestions);
    if (exactMatch) {
      setSelectedProduct(exactMatch);
      setQuery(
        exactMatch.barcode?.trim() ? exactMatch.barcode : String(exactMatch.id),
      );
      setIsSuggestionBoxVisible(false);
      quantityInputRef.current?.focus();
      return;
    }

    setIsSuggestionBoxVisible(true);
    setNoticeTone("warning");
    setNoticeMessage(
      "Nenhum produto compativel foi encontrado para o valor digitado.",
    );
    await playOperationalErrorAsync();
  }

  async function handleSave() {
    if (!currentUser || !storeId || !selectedReason) {
      return;
    }

    if (!selectedProduct) {
      setNoticeTone("warning");
      setNoticeMessage("Selecione um produto antes de salvar o lancamento.");
      await playOperationalErrorAsync();
      return;
    }

    if (isSaving) {
      return;
    }

    const quantityValue = parseInputNumber(quantityInput);
    const packageCountValue = parseInputNumber(packageCountInput);
    const totalValue = quantityValue * packageCountValue;

    if (quantityValue <= 0 || packageCountValue <= 0 || totalValue <= 0) {
      setNoticeTone("warning");
      setNoticeMessage(
        "Informe quantidade e embalagem validas para salvar a troca.",
      );
      await playOperationalErrorAsync();
      return;
    }

    try {
      setIsSaving(true);
      setNoticeMessage(null);

      await createLocalTrocaEntry({
        userId: currentUser.id,
        storeId,
        reason: selectedReason,
        product: selectedProduct,
        movementType,
        quantityInput: quantityValue,
        packageCount: packageCountValue,
        totalQuantity: totalValue,
      });

      await playOperationalSuccessAsync();

      let nextTone: "success" | "warning" = "success";
      let nextMessage = `Lancamento de troca salvo para o produto ${selectedProduct.id}.`;

      if (autoTransmitEnabled && canPushEvents) {
        try {
          const result = await flushPendingSyncOutbox({
            userId: currentUser.id,
            storeId,
            eventTypePrefix: "exchange.",
            scope: "exchange.push",
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
        nextMessage = `${nextMessage} O lancamento ficou pendente para transmissao porque a sessao online ou a internet nao estao disponiveis.`;
      } else {
        nextMessage = `${nextMessage} O lancamento ficou pendente para transmissao manual.`;
      }

      setQuery("");
      setSelectedProduct(null);
      setQuantityInput("");
      setPackageCountInput("1");
      setIsSuggestionBoxVisible(false);
      setNoticeTone(nextTone);
      setNoticeMessage(nextMessage);
      inputRef.current?.focus();
    } catch (error) {
      setNoticeTone("error");
      setNoticeMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o lancamento de troca.",
      );
      await playOperationalErrorAsync();
    } finally {
      setIsSaving(false);
    }
  }

  if (!currentUser || !storeId || !selectedReasonId || !selectedReason) {
    return (
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Troca"
      >
        <Text style={styles.noticeText}>
          Nao foi possivel resolver a coleta de troca.
        </Text>
      </FeatureScreenLayout>
    );
  }

  return (
    <FeatureScreenLayout
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      onBackPress={() => router.back()}
      padded={false}
      scrollable
      title="Troca"
    >
      {isSuggestionBoxVisible ? (
        <Pressable
          onPress={dismissSuggestions}
          style={styles.suggestionsBackdrop}
        />
      ) : null}

      <Card style={styles.topCard} variant="muted">
        <View style={styles.topCardHeader}>
          <View style={styles.reasonBlock}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsReasonModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.reasonSelect,
                pressed && styles.reasonSelectPressed,
              ]}
            >
              <View style={styles.reasonSelectContent}>
                <Text style={styles.reasonValue}>
                  {selectedReason.description}
                </Text>
              </View>
              <FontAwesome
                color={theme.colors.text.muted}
                name="chevron-down"
                size={16}
              />
            </Pressable>
          </View>

          <Button
            label="Salvar"
            leftSlot={<FontAwesome color="white" name="save" size={18} />}
            loading={isSaving}
            style={styles.saveButton}
            onPress={() => {
              void handleSave();
            }}
          />
        </View>
      </Card>

      <Card style={styles.lookupCard}>
        <ProductLookupField
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
            quantityInputRef.current?.focus();
          }}
          onSubmitEditing={() => {
            void handleSubmitLookup();
          }}
          selectedProductId={selectedProduct?.id ?? null}
          suggestions={suggestions}
          suggestionsVisible={isSuggestionBoxVisible}
          value={query}
        />
      </Card>

      <Card style={styles.formCard} variant="muted">
        <View style={styles.metricRow}>
          <MovementMetricField
            inputRef={quantityInputRef}
            label="Quantidade"
            keyboardType={
              selectedProduct?.decimalAllowed ? "decimal-pad" : "number-pad"
            }
            value={quantityInput}
            onChangeText={(value) => {
              setQuantityInput(
                normalizeManualNumberInput(
                  value,
                  selectedProduct?.decimalAllowed ?? false,
                ),
              );
            }}
            onSubmitEditing={() => {
              packageCountInputRef.current?.focus();
            }}
          />
          <MovementMetricField
            inputRef={packageCountInputRef}
            label="Embalagem"
            value={packageCountInput}
            onChangeText={(value) => {
              setPackageCountInput(
                normalizeManualNumberInput(value, false) || "",
              );
            }}
            onSubmitEditing={() => {
              void handleSave();
            }}
          />
          <MovementMetricField
            editable={false}
            label="Total"
            value={totalQuantity > 0 ? formatDisplayNumber(totalQuantity) : "0"}
          />
        </View>

        <View style={styles.metricRow}>
          <MovementMetricField
            editable={false}
            label="Quantidade Caixa"
            value={
              selectedProduct?.packageQuantity != null
                ? formatDisplayNumber(selectedProduct.packageQuantity)
                : ""
            }
          />
          <MovementMetricField
            editable={false}
            label="Peso Caixa"
            value={
              selectedProduct?.grossWeight != null
                ? formatDisplayNumber(selectedProduct.grossWeight)
                : ""
            }
          />
        </View>

        <TrocaAddRemoveToggle value={movementType} onChange={setMovementType} />
      </Card>

      <View style={styles.productInfoWrap}>
        <Text style={styles.productName}>
          {selectedProduct?.description ??
            "Selecione um produto para salvar o lancamento."}
        </Text>

        <Card style={styles.productInfoCard} variant="muted">
          <View style={styles.metricRow}>
            <MovementMetricField
              editable={false}
              label="Embalagem"
              value={
                selectedProduct?.packagingDescription
                  ? `${selectedProduct.packagingDescription}/${selectedProduct.packageQuantity ?? ""}`.trim()
                  : ""
              }
            />
            <MovementMetricField
              editable={false}
              label="Estoque"
              value={
                selectedProduct?.stockQuantity != null
                  ? formatDisplayNumber(selectedProduct.stockQuantity)
                  : ""
              }
            />
          </View>

          <View style={styles.metricRow}>
            <MovementMetricField
              editable={false}
              label="Preco Venda"
              value={formatCurrency(selectedProduct?.salePrice)}
            />
            <MovementMetricField
              editable={false}
              label="Preco Custo"
              value={formatCurrency(selectedProduct?.averageCostWithTax)}
            />
            <MovementMetricField
              editable={false}
              label="Coletados"
              value={formatDisplayNumber(collectedBalance)}
            />
          </View>
        </Card>
      </View>

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
              style={styles.lookupModalAction}
              onPress={() => {
                setScannerLookupModalCode(null);
                inputRef.current?.focus();
              }}
            />
          </View>
        </View>
      </Modal>

      <TrocaReasonModal
        reasons={availableReasons}
        selectedReasonId={selectedReasonId}
        visible={isReasonModalVisible}
        onClose={() => {
          setIsReasonModalVisible(false);
        }}
        onConfirm={() => {
          if (selectedReasonId == null) {
            setNoticeTone("warning");
            setNoticeMessage(
              "Selecione um motivo de troca antes de continuar.",
            );
            return;
          }

          setIsReasonModalVisible(false);
        }}
        onSelectReason={(reasonId) => {
          setSelectedReasonId(reasonId);
          setNoticeMessage(null);
        }}
      />

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
      position: "relative",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
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
    reasonBlock: {
      flex: 1,
      gap: spacing.xxs,
    },
    reasonSelect: {
      minHeight: 60,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    reasonSelectPressed: {
      opacity: 0.92,
    },
    reasonSelectContent: {
      flex: 1,
      gap: spacing.xxs,
    },
    eyebrow: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      textTransform: "uppercase",
    },
    reasonValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
      fontSize: 20,
      lineHeight: 24,
    },
    reasonSelectHint: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    reasonHelper: {
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
    formCard: {
      gap: spacing.md,
    },
    metricRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    productInfoWrap: {
      gap: spacing.xs,
    },
    productName: {
      backgroundColor: theme.isDark
        ? "#121212"
        : theme.colors.background.surfaceAlt,
      color: theme.colors.text.primary,
      fontSize: 20,
      lineHeight: 26,
      paddingHorizontal: 15,
      paddingVertical: 10,
      flexWrap: "wrap",
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
    },
    productInfoCard: {
      gap: spacing.md,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
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
