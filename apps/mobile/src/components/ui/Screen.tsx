import type { PropsWithChildren } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout } from '@/src/theme/tokens';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

export type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  keyboardDismissMode?: ScrollViewProps['keyboardDismissMode'];
}>;

export function Screen({
  children,
  scrollable = false,
  padded = true,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = 'on-drag',
}: ScreenProps) {
  const styles = useThemedStyles(createStyles);
  if (scrollable) {
    return (
      <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.safeArea, style]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollGrow,
            styles.content,
            padded && styles.padded,
            contentContainerStyle,
          ]}
          keyboardDismissMode={keyboardDismissMode}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={[styles.safeArea, style]}>
      <View style={[styles.content, styles.fill, padded && styles.padded, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.shell,
  },
  scrollGrow: {
    flexGrow: 1,
  },
  content: {
    width: '100%',
    maxWidth: layout.screenContentMaxWidth,
    alignSelf: 'center',
  },
  fill: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: layout.screenPaddingVertical,
  },
});
