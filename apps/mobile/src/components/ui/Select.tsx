import { FontAwesome } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  InteractionManager,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type View as ViewRef,
} from 'react-native';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useAppTheme, useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string | null;
  searchText?: string | null;
};

type SelectProps<T extends string | number> = {
  label?: string;
  placeholder?: string;
  helper?: string | null;
  emptyMessage?: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  disabled?: boolean;
  maxDropdownHeight?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  hostVisible?: boolean;
  autoOpenToken?: number;
  onChange: (value: T) => void;
};

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function Select<T extends string | number>({
  label,
  placeholder = 'Selecionar',
  helper,
  emptyMessage = 'Nenhuma opcao disponivel.',
  options,
  value,
  disabled = false,
  maxDropdownHeight = 280,
  searchable = false,
  searchPlaceholder = 'Pesquisar...',
  hostVisible = true,
  autoOpenToken,
  onChange,
}: SelectProps<T>) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [triggerFrame, setTriggerFrame] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<ViewRef>(null);
  const searchInputRef = useRef<TextInput>(null);
  const lastAutoOpenTokenRef = useRef<number | undefined>(undefined);
  const pendingMeasureTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable) {
      return options;
    }

    const normalizedQuery = normalizeSearchValue(searchQuery);
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = normalizeSearchValue(
        [option.label, option.description ?? '', option.searchText ?? ''].join(' '),
      );

      return haystack.includes(normalizedQuery);
    });
  }, [options, searchable, searchQuery]);

  const canOpen = !disabled && options.length > 0;

  const clearPendingMeasurements = useCallback(() => {
    for (const timeoutId of pendingMeasureTimeoutsRef.current) {
      clearTimeout(timeoutId);
    }

    pendingMeasureTimeoutsRef.current = [];
  }, []);

  const measureTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setTriggerFrame({ x, y, width, height });
      });
    });
  }, []);

  const scheduleTriggerMeasurement = useCallback(() => {
    clearPendingMeasurements();
    measureTrigger();

    for (const delay of [40, 120, 220]) {
      const timeoutId = setTimeout(() => {
        measureTrigger();
      }, delay);

      pendingMeasureTimeoutsRef.current.push(timeoutId);
    }
  }, [clearPendingMeasurements, measureTrigger]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      clearPendingMeasurements();
      return;
    }

    scheduleTriggerMeasurement();
  }, [
    clearPendingMeasurements,
    open,
    options.length,
    scheduleTriggerMeasurement,
    windowHeight,
    windowWidth,
  ]);

  useEffect(() => clearPendingMeasurements, [clearPendingMeasurements]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: { endCoordinates: { height: number } }) => {
      setKeyboardInset(event.endCoordinates.height);
      scheduleTriggerMeasurement();
    };

    const handleKeyboardHide = () => {
      setKeyboardInset(0);
      scheduleTriggerMeasurement();
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      setKeyboardInset(0);
    };
  }, [open, scheduleTriggerMeasurement]);

  useEffect(() => {
    if (!open || !searchable) {
      return;
    }

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      searchInputRef.current?.focus();
    });

    const focusTimeouts = [60, 160].map((delay) =>
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, delay),
    );

    return () => {
      interactionTask.cancel();
      for (const timeoutId of focusTimeouts) {
        clearTimeout(timeoutId);
      }
    };
  }, [open, searchable, autoOpenToken]);

  useEffect(() => {
    if (!hostVisible) {
      setOpen(false);
      return;
    }
  }, [hostVisible]);

  useEffect(() => {
    if (autoOpenToken == null || autoOpenToken === lastAutoOpenTokenRef.current) {
      return;
    }

    lastAutoOpenTokenRef.current = autoOpenToken;

    if (!hostVisible || !canOpen) {
      return;
    }

    measureTrigger();
    setOpen(true);
  }, [autoOpenToken, canOpen, hostVisible, measureTrigger]);

  const dropdownMetrics = useMemo(() => {
    if (!triggerFrame) {
      return null;
    }

    const viewportPadding = 16;
    const gap = 8;
    const usableWindowHeight = Math.max(windowHeight - keyboardInset, viewportPadding * 2 + 120);
    const searchAreaHeight = searchable ? 72 : 0;
    const desiredHeight = Math.min(
      maxDropdownHeight,
      Math.max(filteredOptions.length * 62 + searchAreaHeight, searchable ? 196 : 124),
    );
    const spaceBelow =
      usableWindowHeight - (triggerFrame.y + triggerFrame.height) - viewportPadding;
    const spaceAbove = triggerFrame.y - viewportPadding;
    const shouldOpenAbove = spaceBelow < Math.min(desiredHeight, 220) && spaceAbove > spaceBelow;
    const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
    const dropdownHeight = Math.max(120, Math.min(desiredHeight, availableHeight));
    const top = shouldOpenAbove
      ? Math.max(viewportPadding, triggerFrame.y - dropdownHeight - gap)
      : triggerFrame.y + triggerFrame.height + gap;
    const width = Math.min(triggerFrame.width, windowWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, triggerFrame.x),
      windowWidth - width - viewportPadding,
    );

    return { top, left, width, height: dropdownHeight };
  }, [
    filteredOptions.length,
    maxDropdownHeight,
    searchable,
    triggerFrame,
    keyboardInset,
    windowHeight,
    windowWidth,
  ]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        ref={triggerRef}
        collapsable={false}
        onLayout={() => {
          if (open) {
            measureTrigger();
          }
        }}
      >
        <Pressable
          accessibilityRole="button"
          disabled={!canOpen}
          onPress={() => {
            if (!canOpen) return;
            if (!open) {
              measureTrigger();
            }
            setOpen((current) => !current);
          }}
          style={({ pressed }) => [
            styles.trigger,
            disabled && styles.triggerDisabled,
            open && styles.triggerOpen,
            pressed && canOpen && styles.triggerPressed,
          ]}
        >
          <View style={styles.triggerCopy}>
            <Text style={[styles.triggerValue, !selectedOption && styles.placeholder]}>
              {selectedOption?.label ?? placeholder}
            </Text>
            {selectedOption?.description ? (
              <Text style={styles.triggerDescription}>{selectedOption.description}</Text>
            ) : helper ? (
              <Text style={styles.triggerDescription}>{helper}</Text>
            ) : null}
          </View>

          <FontAwesome
            color={disabled ? colors.text.muted : colors.text.secondary}
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
          />
        </Pressable>
      </View>

      <Modal
        animationType="none"
        statusBarTranslucent
        transparent
        visible={open}
        onRequestClose={() => {
          setOpen(false);
        }}
      >
        <View style={styles.portalRoot}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpen(false);
            }}
            style={StyleSheet.absoluteFill}
          />

          {dropdownMetrics ? (
            <View
              style={[
                styles.dropdown,
                styles.dropdownPortal,
                {
                  top: dropdownMetrics.top,
                  left: dropdownMetrics.left,
                  width: dropdownMetrics.width,
                  maxHeight: dropdownMetrics.height,
                },
              ]}
            >
              {searchable ? (
                <View style={styles.searchWrap}>
                  <TextInput
                    ref={searchInputRef}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={colors.text.placeholder}
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              ) : null}

              {filteredOptions.length > 0 ? (
                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => String(item.value)}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                  renderItem={({ item }) => {
                    const selected = item.value === value;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.optionRow,
                          selected && styles.optionRowSelected,
                          pressed && styles.optionRowPressed,
                        ]}
                      >
                        <View style={styles.optionCopy}>
                          <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                            {item.label}
                          </Text>
                          {item.description ? (
                            <Text
                              style={[
                                styles.optionDescription,
                                selected && styles.optionDescriptionSelected,
                              ]}
                            >
                              {item.description}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.radio, selected && styles.radioSelected]} />
                      </Pressable>
                    );
                  }}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
  },
  trigger: {
    minHeight: 64,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerOpen: {
    borderColor: theme.colors.brand.primary,
  },
  triggerPressed: {
    opacity: 0.92,
  },
  triggerCopy: {
    flex: 1,
    gap: 4,
  },
  triggerValue: {
    ...typography.textStyles.bodyStrong,
    color: theme.colors.text.primary,
  },
  placeholder: {
    color: theme.colors.text.secondary,
  },
  triggerDescription: {
    ...typography.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  dropdown: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surfaceMuted,
    overflow: 'hidden',
  },
  dropdownPortal: {
    position: 'absolute',
    zIndex: 120,
    elevation: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surfaceMuted,
  },
  searchInput: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: spacing.sm,
    color: theme.colors.text.primary,
    ...typography.textStyles.body,
  },
  optionRow: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  optionRowSelected: {
    backgroundColor: theme.isDark ? 'rgba(9,94,74,0.22)' : 'rgba(0,85,59,0.10)',
  },
  optionRowPressed: {
    opacity: 0.92,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...typography.textStyles.bodyStrong,
    color: theme.colors.text.primary,
  },
  optionTitleSelected: {
    color: theme.isDark ? theme.colors.text.onAccent : theme.colors.brand.primary,
  },
  optionDescription: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
  },
  optionDescriptionSelected: {
    color: theme.isDark ? 'rgba(255,255,255,0.82)' : theme.colors.text.secondary,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border.strong,
  },
  radioSelected: {
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.brand.primary,
  },
  emptyState: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    ...typography.textStyles.caption,
    color: theme.colors.text.secondary,
  },
  portalRoot: {
    flex: 1,
  },
});
