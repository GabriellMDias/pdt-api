import { Entypo, Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LocalCatalogProduct } from '@/src/features/shared/products/types';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type ProductLookupFieldProps = {
  value: string;
  suggestions: LocalCatalogProduct[];
  selectedProductId?: number | null;
  suggestionsVisible?: boolean;
  label?: string;
  helper?: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  onSubmitEditing: () => void;
  onSelectProduct: (product: LocalCatalogProduct) => void;
  onCameraPress: () => void;
  onClear: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onPressIn?: () => void;
};

function formatPackaging(product: LocalCatalogProduct) {
  if (!product.packagingDescription && !product.packageQuantity) {
    return '-';
  }

  return `${product.packagingDescription ?? ''} ${product.packageQuantity ?? ''}`.trim();
}

export const ProductLookupField = forwardRef<TextInput, ProductLookupFieldProps>(
  function ProductLookupField(
    {
      value,
      suggestions,
      selectedProductId,
      suggestionsVisible = false,
      label = 'Produto',
      helper = 'Descricao, EAN ou codigo interno',
      placeholder = 'Produto',
      onChangeText,
      onSubmitEditing,
      onSelectProduct,
      onCameraPress,
      onClear,
      onFocus,
      onBlur,
      onPressIn,
    },
    ref,
  ) {
    const { colors } = useAppTheme();
    const styles = useThemedStyles(createStyles);
    const showSuggestions = suggestionsVisible;
    const showScrollableViewport = suggestions.length > 6;

    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.helper}>{helper}</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            ref={ref}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            placeholder={placeholder}
            placeholderTextColor={colors.text.placeholder}
            returnKeyType="search"
            style={styles.input}
            value={value}
            onBlur={onBlur}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onPressIn={onPressIn}
            onSubmitEditing={onSubmitEditing}
          />

          {value.trim().length > 0 ? (
            <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearButton}>
              <Ionicons color={colors.brand.primary} name="close" size={30} />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Ler codigo de barras"
            accessibilityRole="button"
            onPress={onCameraPress}
            style={styles.cameraButton}
          >
            <Entypo color={colors.text.onAccent} name="camera" size={25} />
          </Pressable>
        </View>

        {showSuggestions ? (
          <View style={[styles.suggestBox, showScrollableViewport && styles.suggestBoxViewport]}>
            <View style={styles.suggestHeader}>
              <Text style={[styles.suggestHeaderText, styles.suggestCode]}>Cod.</Text>
              <Text style={[styles.suggestHeaderText, styles.suggestDescription]}>Produto</Text>
              <Text style={[styles.suggestHeaderText, styles.suggestPack]}>Emb.</Text>
            </View>

            {suggestions.length > 0 ? (
              <ScrollView
                contentContainerStyle={styles.suggestListContent}
                keyboardShouldPersistTaps="always"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={[styles.suggestList, showScrollableViewport && styles.suggestListViewport]}
              >
                {suggestions.map((product) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`${product.storeId}-${product.id}`}
                    onPress={() => {
                      onSelectProduct(product);
                    }}
                    style={({ pressed }) => [
                      styles.suggestItem,
                      selectedProductId === product.id && styles.suggestItemSelected,
                      pressed && styles.suggestItemPressed,
                    ]}
                  >
                    <Text numberOfLines={1} style={[styles.suggestText, styles.suggestCode]}>
                      {product.id}
                    </Text>
                    <Text numberOfLines={2} style={[styles.suggestText, styles.suggestDescription]}>
                      {product.description}
                    </Text>
                    <Text numberOfLines={2} style={[styles.suggestText, styles.suggestPack]}>
                      {formatPackaging(product)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>Nenhum produto encontrado</Text>
                <Text style={styles.emptyStateText}>
                  Tente buscar por descricao, EAN ou codigo interno.
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 11,
  },
  labelRow: {
    marginBottom: 8,
    gap: 2,
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  helper: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.app,
  },
  input: {
    flex: 1,
    height: 60,
    borderColor: theme.colors.border.strong,
    borderWidth: 2,
    borderRadius: 5,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: 10,
    paddingRight: 42,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 75,
    zIndex: 2,
  },
  cameraButton: {
    width: 70,
    height: 60,
    marginLeft: 8,
    borderRadius: 5,
    backgroundColor: theme.colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestBox: {
    marginTop: 10,
    overflow: 'hidden',
    borderColor: theme.colors.border.strong,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: theme.colors.background.surfaceAlt,
    elevation: 16,
  },
  suggestBoxViewport: {
    maxHeight: 308,
  },
  suggestHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
    backgroundColor: theme.colors.background.surfaceMuted,
    borderBottomColor: theme.colors.border.default,
    borderBottomWidth: 1,
  },
  suggestHeaderText: {
    color: theme.colors.text.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestList: {
    flexGrow: 0,
  },
  suggestListViewport: {
    flexGrow: 0,
  },
  suggestListContent: {
    paddingBottom: 2,
  },
  suggestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 5,
    borderBottomColor: theme.colors.border.default,
    borderBottomWidth: 0.5,
    borderStyle: 'dashed',
  },
  suggestItemPressed: {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.05)',
  },
  suggestItemSelected: {
    backgroundColor: theme.isDark ? 'rgba(9,94,74,0.28)' : 'rgba(0,85,59,0.12)',
  },
  suggestText: {
    color: theme.colors.text.primary,
    fontSize: 15,
    lineHeight: 18,
    flexWrap: 'wrap',
    textAlignVertical: 'center',
  },
  suggestCode: {
    flex: 1,
  },
  suggestDescription: {
    flex: 3,
  },
  suggestPack: {
    flex: 1,
  },
  emptyState: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },
  emptyStateTitle: {
    color: theme.colors.text.primary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  emptyStateText: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
