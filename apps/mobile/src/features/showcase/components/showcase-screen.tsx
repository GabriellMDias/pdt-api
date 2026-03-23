import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, Input, Screen } from '@/src/components/ui';
import { colors, spacing, typography } from '@/src/theme/tokens';

export function ShowcaseScreen() {
  const router = useRouter();
  const [sampleValue, setSampleValue] = useState('');

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Badge variant="accent">Base visual interna</Badge>
        <Text style={styles.title}>Showcase de componentes</Text>
        <Text style={styles.subtitle}>
          Referencia interna para as proximas telas do app mobile, alinhada ao tema do web.
        </Text>
        <Button label="Voltar para home" size="sm" variant="ghost" onPress={() => router.back()} />
      </View>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Botoes</Text>
          <Text style={styles.sectionDescription}>
            Variantes base para chamadas primarias, contraste em superficies verdes e acoes neutras.
          </Text>
        </View>

        <View style={styles.stack}>
          <Button block label="Primario" />
          <Button block label="Secundario" variant="secondary" />
          <Button block label="Ghost" variant="ghost" />
          <Button block label="Warning" variant="warning" />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inputs</Text>
          <Text style={styles.sectionDescription}>
            Campos legiveis em ambiente escuro, com foco evidente e suporte a ajuda ou erro.
          </Text>
        </View>

        <View style={styles.stack}>
          <Input
            helperText="Helper padrao para instrucoes curtas."
            label="Campo base"
            placeholder="Digite um valor"
            value={sampleValue}
            onChangeText={setSampleValue}
          />
          <Input
            errorText="Mensagem de validacao para fluxo de formulario."
            label="Campo com erro"
            placeholder="Valor invalido"
            value=""
          />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <Text style={styles.sectionDescription}>
            Estados curtos para rede, sync, modo offline e retorno operacional.
          </Text>
        </View>

        <View style={styles.badgeWrap}>
          <Badge>Neutro</Badge>
          <Badge variant="success">Sucesso</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="warning">Pendente</Badge>
          <Badge variant="error">Falha</Badge>
          <Badge variant="accent">Destaque</Badge>
        </View>
      </Card>

      <Card variant="accent">
        <View style={styles.sectionHeader}>
          <Text style={styles.accentTitle}>Card de acento</Text>
          <Text style={styles.accentDescription}>
            Superficie inspirada no login do web para blocos de autenticacao e pontos de entrada.
          </Text>
        </View>
        <Button block label="Acao secundaria no acento" variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.textStyles.hero,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.textStyles.body,
    color: colors.text.secondary,
  },
  sectionHeader: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.textStyles.title,
    color: colors.text.primary,
  },
  sectionDescription: {
    ...typography.textStyles.body,
    color: colors.text.muted,
  },
  stack: {
    gap: spacing.sm,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  accentTitle: {
    ...typography.textStyles.title,
    color: colors.text.onAccent,
  },
  accentDescription: {
    ...typography.textStyles.body,
    color: 'rgba(255,255,255,0.84)',
  },
});
