import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type OperationalModalShellProps = {
  visible: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  onClose: () => void;
  children: ReactNode;
};

export function OperationalModalShell({
  visible,
  eyebrow,
  title,
  subtitle,
  onClose,
  children,
}: OperationalModalShellProps) {
  const styles = useThemedStyles(createStyles);
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const modalMaxHeight = useMemo(() => {
    const viewportPadding = spacing.lg * 2;
    const availableHeight = windowHeight - viewportPadding - keyboardInset;
    const minimumUsableHeight = 240;

    if (availableHeight <= minimumUsableHeight) {
      return Math.max(180, availableHeight);
    }

    return Math.min(availableHeight, windowHeight * 0.88);
  }, [keyboardInset, windowHeight]);

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible={visible}>
      <View style={[styles.overlay, keyboardInset > 0 && styles.overlayWithKeyboard]}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardLayer}
        >
          <View style={[styles.modalCard, { maxHeight: modalMaxHeight }]}>
            <ScrollView
              contentContainerStyle={styles.modalCardContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>

              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay.strong,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    overlayWithKeyboard: {
      justifyContent: 'flex-start',
      paddingTop: spacing.xl,
    },
    keyboardLayer: {
      width: '100%',
      alignItems: 'center',
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.colors.background.surfaceAlt,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      overflow: 'hidden',
    },
    modalCardContent: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.xs,
    },
    eyebrow: {
      ...typography.textStyles.caption,
      color: theme.colors.brand.primaryStrong,
      textTransform: 'uppercase',
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
  });
