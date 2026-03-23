import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card } from '@/src/components/ui';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import {
  createLocalBalancoEntry,
  getBalancoCollectedBalanceByProduct,
  getLocalBalanceHeaderById,
  getLocalBalancoCatalogProductById,
  searchLocalBalancoCatalog,
} from '@/src/features/balanco/data/balanco-db';
import type {
  BalancoMovementType,
  LocalBalancoCatalogProduct,
  LocalBalanceHeader,
} from '@/src/features/balanco/types';
import {
  buildBalanceAggregateKeyPrefix,
  buildBalancoScanContextKey,
  formatSignedQuantity,
  parsePositiveInt,
} from '@/src/features/balanco/utils';
import { flushPendingSyncOutbox } from '@/src/features/mobile-sync/services/mobile-sync-service';
import { FeatureScreenLayout } from '@/src/features/shared/components/feature-screen-layout';
import { ProductLookupField } from '@/src/features/shared/products/components/product-lookup-field';
import { useProductScanStore } from '@/src/features/shared/products/store/use-product-scan-store';
import {
  playOperationalErrorAsync,
  playOperationalSuccessAsync,
  warmupOperationalFeedbackAsync,
} from '@/src/features/shared/services/operational-feedback.service';
import { MovementMetricField } from '@/src/features/shared/stock-movement/components/movement-metric-field';
import { MovementTypeToggle } from '@/src/features/shared/stock-movement/components/movement-type-toggle';
import { useQuantityDecimalRevalidation } from '@/src/features/shared/stock-movement/hooks/use-quantity-decimal-revalidation';
import {
  formatDecimalValue,
  normalizeManualNumberInput,
  parseInputNumber,
} from '@/src/features/shared/stock-movement/utils';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import { radii, spacing, typography } from '@/src/theme/tokens';

function resolveExactMatch(
  query: string,
  products: LocalBalancoCatalogProduct[],
): LocalBalancoCatalogProduct | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  return (
    products.find((product) => product.barcode?.trim() === normalizedQuery) ??
    products.find((product) => String(product.id) === normalizedQuery) ??
    products.find((product) => product.description.trim().toLowerCase() === normalizedQuery) ??
    null
  );
}

export function BalancoCollectScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    balanceId?: string | string[];
    storeId?: string | string[];
  }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentStoreId = useAuthStore((state) => state.currentStoreId);
  const autoTransmitEnabled = useAuthStore((state) => state.autoTransmitEnabled);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const consumeSelection = useProductScanStore((state) => state.consumeSelection);
  const consumeLookupFailure = useProductScanStore((state) => state.consumeLookupFailure);

  const balanceId = parsePositiveInt(params.balanceId);
  const storeId = parsePositiveInt(params.storeId) ?? currentStoreId;
  const canPushEvents = sessionMode === 'online' && connectivityStatus === 'online';
  const scanContextKey =
    storeId != null && balanceId != null ? buildBalancoScanContextKey(storeId, balanceId) : '';

  const inputRef = useRef<TextInput>(null);
  const quantityInputRef = useRef<TextInput>(null);
  const packageCountInputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [balanceHeader, setBalanceHeader] = useState<LocalBalanceHeader | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedProduct, setSelectedProduct] = useState<LocalBalancoCatalogProduct | null>(null);
  const [suggestions, setSuggestions] = useState<LocalBalancoCatalogProduct[]>([]);
  const [isSuggestionBoxVisible, setIsSuggestionBoxVisible] = useState(false);
  const [hasInteractedWithLookup, setHasInteractedWithLookup] = useState(false);
  const [movementType, setMovementType] = useState<BalancoMovementType>('add');
  const [quantityInput, setQuantityInput] = useState('');
  const [packageCountInput, setPackageCountInput] = useState('1');
  const [collectedBalance, setCollectedBalance] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'success' | 'warning' | 'error' | 'info'>('info');
  const [scannerLookupModalCode, setScannerLookupModalCode] = useState<string | null>(null);
  const [blockingNotice, setBlockingNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalQuantity = useMemo(() => {
    const quantity = parseInputNumber(quantityInput);
    const packageCount = parseInputNumber(packageCountInput);
    const total = quantity * packageCount;
    return Number.isFinite(total) ? total : 0;
  }, [packageCountInput, quantityInput]);

  const handleInvalidQuantityForSelectedProduct = useCallback((message: string) => {
    setNoticeMessage(null);
    setBlockingNotice({
      title: 'Atencao',
      message,
    });
  }, []);

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

  const dismissBlockingNotice = useCallback(() => {
    setBlockingNotice(null);

    if (selectedProduct) {
      quantityInputRef.current?.focus();
      return;
    }

    inputRef.current?.focus();
  }, [selectedProduct]);

  const openScanner = useCallback(() => {
    if (!storeId || !balanceId) {
      setNoticeTone('warning');
      setNoticeMessage('Selecione a loja e o balanco antes de abrir o leitor.');
      void playOperationalErrorAsync();
      return;
    }

    dismissSuggestions();
    router.push({
      pathname: '/balanco-scan' as Href,
      params: {
        balanceId: String(balanceId),
        storeId: String(storeId),
      },
    } as Href);
  }, [balanceId, dismissSuggestions, router, storeId]);

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

    async function loadBalanceHeader() {
      if (!storeId || !balanceId) {
        setBalanceHeader(null);
        return;
      }

      const header = await getLocalBalanceHeaderById({ balanceId, storeId });
      if (!cancelled) {
        setBalanceHeader(header);
      }
    }

    void loadBalanceHeader();

    return () => {
      cancelled = true;
    };
  }, [balanceId, storeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      if (!storeId) {
        if (!cancelled) {
          setSuggestions([]);
        }
        return;
      }

      const nextSuggestions = await searchLocalBalancoCatalog({
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
      if (!currentUser || !storeId || !balanceId || !selectedProduct) {
        setCollectedBalance(0);
        return;
      }

      const balance = await getBalancoCollectedBalanceByProduct({
        userId: currentUser.id,
        storeId,
        balanceId,
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
  }, [balanceId, currentUser, selectedProduct, storeId]);

  useFocusEffect(
    useCallback(() => {
      if (!storeId || !balanceId) {
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
        const product = await getLocalBalancoCatalogProductById(
          resolvedStoreId,
          selection.productId,
        );

        if (cancelled) {
          return;
        }

        if (!product || !product.activeStatus) {
          setNoticeTone('warning');
          setNoticeMessage('Produto lido nao foi encontrado na base local atual.');
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
        setNoticeMessage(null);

        if (selection.derivedQuantity != null && selection.derivedQuantity > 0) {
          setQuantityInput(formatDecimalValue(selection.derivedQuantity));
        }

        quantityInputRef.current?.focus();
      }

      void applyScannerSelection();

      return () => {
        cancelled = true;
      };
    }, [balanceId, consumeLookupFailure, consumeSelection, scanContextKey, storeId]),
  );

  async function handleSubmitLookup() {
    const exactMatch = resolveExactMatch(query, suggestions);
    if (exactMatch) {
      setSelectedProduct(exactMatch);
      setQuery(exactMatch.barcode?.trim() ? exactMatch.barcode : String(exactMatch.id));
      setIsSuggestionBoxVisible(false);
      quantityInputRef.current?.focus();
      return;
    }

    setIsSuggestionBoxVisible(true);
    setNoticeTone('warning');
    setNoticeMessage('Nenhum produto compativel foi encontrado para o valor digitado.');
    await playOperationalErrorAsync();
  }

  async function handleSave() {
    if (!currentUser || !storeId || !balanceHeader) {
      return;
    }

    if (!selectedProduct) {
      setNoticeMessage(null);
      setBlockingNotice({
        title: 'Atencao',
        message: 'Selecione um produto antes de salvar o lancamento.',
      });
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
      setNoticeMessage(null);
      setBlockingNotice({
        title: 'Atencao',
        message: 'Informe quantidade e embalagem validas para salvar o balanco.',
      });
      await playOperationalErrorAsync();
      return;
    }

    try {
      setIsSaving(true);
      setNoticeMessage(null);

      await createLocalBalancoEntry({
        userId: currentUser.id,
        storeId,
        balance: balanceHeader,
        product: selectedProduct,
        movementType,
        quantityInput: quantityValue,
        packageCount: packageCountValue,
        totalQuantity: totalValue,
      });

      await playOperationalSuccessAsync();

      if (autoTransmitEnabled && canPushEvents) {
        try {
          const result = await flushPendingSyncOutbox({
            userId: currentUser.id,
            storeId,
            eventTypePrefix: 'balance.',
            aggregateKeyPrefix: buildBalanceAggregateKeyPrefix(balanceHeader.id),
            scope: 'balance.push',
            triggerSource: 'auto_after_create',
            batchLimit: 100,
          });

          if (result.temporaryErrors > 0 || result.permanentErrors > 0) {
            setNoticeTone('warning');
            setNoticeMessage('Alguns itens deste balanco ainda seguem pendentes na outbox.');
          } else {
            setNoticeMessage(null);
          }
        } catch (error) {
          setNoticeTone('warning');
          setNoticeMessage(
            error instanceof Error ? error.message : 'Falha ao sincronizar agora.',
          );
        }
      } else if (autoTransmitEnabled && !canPushEvents) {
        setNoticeTone('warning');
        setNoticeMessage(
          'O lancamento ficou pendente para transmissao porque a sessao online ou a internet nao estao disponiveis.',
        );
      } else {
        setNoticeMessage(null);
      }

      setQuery('');
      setSelectedProduct(null);
      setQuantityInput('');
      setPackageCountInput('1');
      setIsSuggestionBoxVisible(false);
      setHasInteractedWithLookup(true);
      inputRef.current?.focus();
    } catch (error) {
      setNoticeMessage(null);
      setBlockingNotice({
        title: 'Erro',
        message:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel salvar o lancamento de balanco.',
      });
      await playOperationalErrorAsync();
    } finally {
      setIsSaving(false);
    }
  }

  if (!currentUser || !storeId || !balanceId || !balanceHeader) {
    return (
      <FeatureScreenLayout
        contentContainerStyle={styles.body}
        onBackPress={() => router.back()}
        padded={false}
        title="Balanco"
      >
        <Text style={styles.noticeText}>Nao foi possivel resolver a coleta de balanco.</Text>
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
      title="Balanco"
    >
      {isSuggestionBoxVisible ? (
        <Pressable onPress={dismissSuggestions} style={styles.suggestionsBackdrop} />
      ) : null}

      <Card style={styles.topCard} variant="muted">
        <View style={styles.topCardHeader}>
          <View style={styles.balanceBlock}>
            <Text style={styles.topEyebrow}>Balanco selecionado</Text>
            <Text style={styles.topValue}>
              {balanceHeader.id} - {balanceHeader.description}
            </Text>
            <Text style={styles.topHelper}>Estoque: {balanceHeader.stockLabel}</Text>
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
          helper="Descricao, EAN ou codigo interno"
          label="Produto"
          placeholder="Codigo, EAN ou descricao"
          selectedProductId={selectedProduct?.id ?? null}
          suggestions={suggestions}
          suggestionsVisible={isSuggestionBoxVisible}
          value={query}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              setIsSuggestionBoxVisible(false);
            }, 120);
          }}
          onCameraPress={openScanner}
          onChangeText={(value) => {
            setHasInteractedWithLookup(true);
            setSelectedProduct(null);
            setQuery(value);
            setIsSuggestionBoxVisible(true);
          }}
          onClear={() => {
            setSelectedProduct(null);
            setQuery('');
            setIsSuggestionBoxVisible(false);
            setNoticeMessage(null);
          }}
          onFocus={() => {
            setHasInteractedWithLookup(true);
            setIsSuggestionBoxVisible(true);
          }}
          onPressIn={() => {
            setHasInteractedWithLookup(true);
          }}
          onSelectProduct={(product) => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }

            setSelectedProduct(product);
            setHasInteractedWithLookup(true);
            setQuery(product.barcode?.trim() ? product.barcode : String(product.id));
            setIsSuggestionBoxVisible(false);
            quantityInputRef.current?.focus();
          }}
          onSubmitEditing={() => {
            void handleSubmitLookup();
          }}
        />

        {hasInteractedWithLookup && selectedProduct ? (
          <View style={styles.selectedProductBox}>
            <Text style={styles.selectedProductName}>{selectedProduct.description}</Text>
            <Text style={styles.selectedProductMeta}>
              Codigo interno: <Text style={styles.selectedProductValue}>{selectedProduct.id}</Text>
            </Text>
            <Text style={styles.selectedProductMeta}>
              EAN:{' '}
              <Text style={styles.selectedProductValue}>
                {selectedProduct.barcode?.trim() ? selectedProduct.barcode : '-'}
              </Text>
            </Text>
            <Text style={styles.selectedProductMeta}>
              Embalagem:{' '}
              <Text style={styles.selectedProductValue}>
                {selectedProduct.packagingDescription ?? '-'}
                {selectedProduct.packageQuantity != null ? ` / ${selectedProduct.packageQuantity}` : ''}
              </Text>
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.formCard}>
        <MovementTypeToggle
          addLabel="Adicionar"
          removeLabel="Remover"
          value={movementType}
          onChange={setMovementType}
        />

        <View style={styles.metricsRow}>
          <MovementMetricField
            inputRef={quantityInputRef}
            keyboardType={selectedProduct?.decimalAllowed ? 'decimal-pad' : 'number-pad'}
            label="Quantidade"
            value={quantityInput}
            onChangeText={(value) => {
              setQuantityInput(
                normalizeManualNumberInput(value, selectedProduct?.decimalAllowed ?? false),
              );
            }}
            onSubmitEditing={() => {
              packageCountInputRef.current?.focus();
            }}
          />
          <MovementMetricField
            inputRef={packageCountInputRef}
            keyboardType="number-pad"
            label="Embalagem"
            value={packageCountInput}
            onChangeText={(value) => {
              setPackageCountInput(normalizeManualNumberInput(value, false));
            }}
            onSubmitEditing={() => {
              void handleSave();
            }}
          />
          <MovementMetricField
            editable={false}
            label="Total"
            value={Number.isFinite(totalQuantity) && totalQuantity > 0 ? formatSignedQuantity(totalQuantity) : ''}
          />
        </View>

        <View style={styles.metricsRow}>
          <MovementMetricField
            editable={false}
            label="Coletados"
            value={formatSignedQuantity(collectedBalance)}
          />
          <MovementMetricField
            editable={false}
            label="Estoque"
            value={formatSignedQuantity(selectedProduct?.stockQuantity ?? 0)}
          />
        </View>

        {noticeMessage ? (
          <View
            style={[
              styles.noticeBox,
              noticeTone === 'success'
                ? styles.noticeSuccess
                : noticeTone === 'warning'
                  ? styles.noticeWarning
                  : noticeTone === 'error'
                    ? styles.noticeError
                    : styles.noticeInfo,
            ]}
          >
            <Text style={styles.noticeText}>{noticeMessage}</Text>
          </View>
        ) : null}
      </Card>

      <Modal animationType="fade" transparent visible={scannerLookupModalCode != null}>
        <View style={styles.modalOverlay}>
          <Card style={styles.lookupFailureCard}>
            <Text style={styles.lookupFailureTitle}>Produto nao encontrado</Text>
            <Text style={styles.lookupFailureText}>
              Produto nao encontrado para o codigo informado.
            </Text>
            {scannerLookupModalCode ? (
              <Text style={styles.lookupFailureCode}>Codigo lido: {scannerLookupModalCode}</Text>
            ) : null}
            <Button
              label="OK"
              onPress={() => {
                setScannerLookupModalCode(null);
                inputRef.current?.focus();
              }}
            />
          </Card>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={blockingNotice != null}>
        <View style={styles.modalOverlay}>
          <Card style={styles.lookupFailureCard}>
            <Text style={styles.lookupFailureTitle}>
              {blockingNotice?.title ?? 'Erro'}
            </Text>
            <Text style={styles.lookupFailureText}>
              {blockingNotice?.message ?? ''}
            </Text>
            <Button label="OK" onPress={dismissBlockingNotice} />
          </Card>
        </View>
      </Modal>
    </FeatureScreenLayout>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 48,
      gap: spacing.md,
    },
    suggestionsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
    },
    topCard: {
      zIndex: 1,
    },
    topCardHeader: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    balanceBlock: {
      flex: 1,
      gap: spacing.xxs,
    },
    saveButton: {
      width: 116,
      minHeight: 48,
      alignSelf: 'flex-start',
    },
    topEyebrow: {
      ...typography.textStyles.caption,
      color: theme.colors.brand.primaryStrong,
      textTransform: 'uppercase',
    },
    topValue: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    topHelper: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
    },
    lookupCard: {
      zIndex: 11,
      gap: spacing.md,
    },
    selectedProductBox: {
      marginTop: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surfaceMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xxs,
    },
    selectedProductName: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.primary,
    },
    selectedProductMeta: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
    selectedProductValue: {
      color: theme.colors.text.secondary,
    },
    formCard: {
      gap: spacing.md,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    noticeBox: {
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    noticeInfo: {
      backgroundColor: theme.colors.badge.info.background,
      borderColor: theme.colors.badge.info.border,
    },
    noticeSuccess: {
      backgroundColor: theme.colors.badge.success.background,
      borderColor: theme.colors.badge.success.border,
    },
    noticeWarning: {
      backgroundColor: theme.colors.badge.warning.background,
      borderColor: theme.colors.badge.warning.border,
    },
    noticeError: {
      backgroundColor: theme.colors.badge.error.background,
      borderColor: theme.colors.badge.error.border,
    },
    noticeText: {
      ...typography.textStyles.body,
      color: theme.colors.text.primary,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.overlay.strong,
      paddingHorizontal: 24,
    },
    lookupFailureCard: {
      width: '100%',
      maxWidth: 320,
      gap: spacing.md,
    },
    lookupFailureTitle: {
      ...typography.textStyles.title,
      color: theme.colors.text.primary,
    },
    lookupFailureText: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    lookupFailureCode: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
    },
  });
