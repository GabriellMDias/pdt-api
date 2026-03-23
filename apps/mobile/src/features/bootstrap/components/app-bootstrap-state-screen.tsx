import { StyleSheet, Text, View } from 'react-native';
import { AppLoadingIndicator } from '@/src/features/bootstrap/components/app-loading-indicator';
import { Badge, Button, Card, Screen } from '@/src/components/ui';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';
import type { BootstrapErrorKind } from '@/src/features/bootstrap/types';

type AppBootstrapStateScreenProps = {
  mode: 'loading' | 'error';
  title: string;
  description: string;
  errorKind?: BootstrapErrorKind | null;
  onRetry?: () => void;
  onLogout?: () => void;
};

function resolveBadgeVariant(errorKind?: BootstrapErrorKind | null) {
  if (errorKind === 'offline') return 'warning';
  if (errorKind === 'backend') return 'error';
  return 'neutral';
}

function resolveBadgeLabel(errorKind?: BootstrapErrorKind | null) {
  if (errorKind === 'offline') return 'Sem internet';
  if (errorKind === 'backend') return 'Erro do backend';
  return 'Preparando app';
}

export function AppBootstrapStateScreen({
  mode,
  title,
  description,
  errorKind,
  onRetry,
  onLogout,
}: AppBootstrapStateScreenProps) {
  const styles = useThemedStyles(createStyles);
  const badgeVariant = resolveBadgeVariant(errorKind);
  const badgeLabel = resolveBadgeLabel(errorKind);

  if (mode === 'loading') {
    return <AppLoadingIndicator />;
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.header}>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {mode === 'error' ? (
          <View style={styles.actions}>
            <Button block label="Tentar novamente" onPress={onRetry} />
            <Button block label="Sair" variant="ghost" onPress={onLogout} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.textStyles.title,
    color: theme.colors.text.primary,
  },
  description: {
    ...typography.textStyles.body,
    color: theme.colors.text.secondary,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
