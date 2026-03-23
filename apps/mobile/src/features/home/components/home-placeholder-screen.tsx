import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Button, Card } from "@/src/components/ui";
import { FeatureScreenLayout } from "@/src/features/shared/components/feature-screen-layout";
import { useThemedStyles, type AppTheme } from "@/src/theme/theme-provider";
import { spacing, typography } from "@/src/theme/tokens";

type HomePlaceholderScreenProps = {
  title: string;
  description: string;
};

export function HomePlaceholderScreen({
  title,
  description,
}: HomePlaceholderScreenProps) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);

  return (
    <FeatureScreenLayout
      contentContainerStyle={styles.content}
      onBackPress={() => router.back()}
      scrollable
      title={title}
    >
      <Card>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.caption}>Tela não desenvolvida</Text>
      </Card>

      <Button
        block
        label="Voltar para Home"
        onPress={() => {
          router.replace("/home");
        }}
      />
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
    caption: {
      ...typography.textStyles.caption,
      color: theme.colors.text.muted,
      marginTop: spacing.md,
    },
  });
