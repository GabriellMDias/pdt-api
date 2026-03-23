import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Card, Input } from '@/src/components/ui';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { colors, layout, radii, spacing, typography } from '@/src/theme/tokens';

type DebugStage = 'minimal' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

type DebugStageConfig = {
  label: string;
  description: string;
  useHeaderCopy: boolean;
  useCard: boolean;
  useCustomInput: boolean;
  useAutoComplete: boolean;
  useEmailKeyboard: boolean;
  useSecureTextEntry: boolean;
  useStore: boolean;
};

type DebugFlags = Omit<DebugStageConfig, 'label' | 'description'>;

type DebugLogEntry = {
  id: number;
  message: string;
};

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];

const STAGE_ORDER: DebugStage[] = ['minimal', 'a', 'b', 'c', 'd', 'e', 'f'];

const STAGE_CONFIGS: Record<DebugStage, DebugStageConfig> = {
  minimal: {
    label: 'Minimo',
    description: 'SafeAreaView + 2 TextInput puros. Sem wrappers customizados e sem store.',
    useHeaderCopy: false,
    useCard: false,
    useCustomInput: false,
    useAutoComplete: false,
    useEmailKeyboard: false,
    useSecureTextEntry: false,
    useStore: false,
  },
  a: {
    label: 'Etapa A',
    description: 'Layout da login com TextInput puro e sem Card.',
    useHeaderCopy: true,
    useCard: false,
    useCustomInput: false,
    useAutoComplete: false,
    useEmailKeyboard: false,
    useSecureTextEntry: false,
    useStore: false,
  },
  b: {
    label: 'Etapa B',
    description: 'Mesmo layout, adicionando Card.',
    useHeaderCopy: true,
    useCard: true,
    useCustomInput: false,
    useAutoComplete: false,
    useEmailKeyboard: false,
    useSecureTextEntry: false,
    useStore: false,
  },
  c: {
    label: 'Etapa C',
    description: 'Troca TextInput puro por Input customizado, sem autofill e sem secure.',
    useHeaderCopy: true,
    useCard: true,
    useCustomInput: true,
    useAutoComplete: false,
    useEmailKeyboard: false,
    useSecureTextEntry: false,
    useStore: false,
  },
  d: {
    label: 'Etapa D',
    description: 'Reativa autoComplete no par usuario/senha, sem secureTextEntry.',
    useHeaderCopy: true,
    useCard: true,
    useCustomInput: true,
    useAutoComplete: true,
    useEmailKeyboard: false,
    useSecureTextEntry: false,
    useStore: false,
  },
  e: {
    label: 'Etapa E',
    description: 'Reativa secureTextEntry, ainda sem store e sem keyboardType de email.',
    useHeaderCopy: true,
    useCard: true,
    useCustomInput: true,
    useAutoComplete: true,
    useEmailKeyboard: false,
    useSecureTextEntry: true,
    useStore: false,
  },
  f: {
    label: 'Etapa F',
    description: 'Fluxo completo com store, autoComplete, secureTextEntry e keyboardType de email.',
    useHeaderCopy: true,
    useCard: true,
    useCustomInput: true,
    useAutoComplete: true,
    useEmailKeyboard: true,
    useSecureTextEntry: true,
    useStore: true,
  },
};

function cloneFlags(stage: DebugStage): DebugFlags {
  const { label: _label, description: _description, ...flags } = STAGE_CONFIGS[stage];
  return { ...flags };
}

type FormStageProps = {
  flags: DebugFlags;
  logFocusEvent: (
    field: 'identifier' | 'password',
    event: 'focus' | 'blur',
    nativeEvent?: FocusEvent | BlurEvent,
  ) => void;
};

function FieldBlock({
  label,
  useCustomInput,
  value,
  onChangeText,
  onFocus,
  onBlur,
  autoComplete,
  keyboardType,
  secureTextEntry,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string;
  useCustomInput: boolean;
  value: string;
  onChangeText: (value: string) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
  autoComplete: 'off' | 'username' | 'current-password';
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  returnKeyType: 'next' | 'done';
  onSubmitEditing?: () => void;
}) {
  if (useCustomInput) {
    return (
      <Input
        autoCapitalize="none"
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        label={label}
        placeholder={label === 'Senha' ? 'Digite sua senha' : 'Digite o login'}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        value={value}
        blurOnSubmit={returnKeyType === 'next' ? false : undefined}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
      />
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        placeholder={label === 'Senha' ? 'Digite sua senha' : 'Digite o login'}
        placeholderTextColor={colors.text.placeholder}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        style={styles.rawInput}
        value={value}
        blurOnSubmit={returnKeyType === 'next' ? false : undefined}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

function LocalFormStage({ flags, logFocusEvent }: FormStageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const fieldContent = (
    <>
      <FieldBlock
        autoComplete={flags.useAutoComplete ? 'username' : 'off'}
        keyboardType={flags.useEmailKeyboard ? 'email-address' : 'default'}
        label="Login"
        returnKeyType="next"
        useCustomInput={flags.useCustomInput}
        value={identifier}
        onBlur={(event) => {
          logFocusEvent('identifier', 'blur', event);
        }}
        onChangeText={setIdentifier}
        onFocus={(event) => {
          logFocusEvent('identifier', 'focus', event);
        }}
        onSubmitEditing={() => {
          passwordRef.current?.focus();
        }}
      />
      {flags.useCustomInput ? (
        <Input
          ref={passwordRef}
          autoCapitalize="none"
          autoComplete={flags.useAutoComplete ? 'current-password' : 'off'}
          autoCorrect={false}
          label="Senha"
          placeholder="Digite sua senha"
          returnKeyType="done"
          secureTextEntry={flags.useSecureTextEntry}
          value={password}
          onBlur={(event) => {
            logFocusEvent('password', 'blur', event);
          }}
          onChangeText={setPassword}
          onFocus={(event) => {
            logFocusEvent('password', 'focus', event);
          }}
        />
      ) : (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Senha</Text>
          <TextInput
            ref={passwordRef}
            autoCapitalize="none"
            autoComplete={flags.useAutoComplete ? 'current-password' : 'off'}
            autoCorrect={false}
            placeholder="Digite sua senha"
            placeholderTextColor={colors.text.placeholder}
            returnKeyType="done"
            secureTextEntry={flags.useSecureTextEntry}
            style={styles.rawInput}
            value={password}
            onBlur={(event) => {
              logFocusEvent('password', 'blur', event);
            }}
            onChangeText={setPassword}
            onFocus={(event) => {
              logFocusEvent('password', 'focus', event);
            }}
          />
        </View>
      )}
    </>
  );

  if (flags.useCard) {
    return <Card style={styles.formCard}>{fieldContent}</Card>;
  }

  return <View style={styles.formPlain}>{fieldContent}</View>;
}

function StoreFormStage({ flags, logFocusEvent }: FormStageProps) {
  const login = useAuthStore((state) => state.login);
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const usersSynced = useAuthStore((state) => state.usersSynced);
  const usersLastSyncedAt = useAuthStore((state) => state.usersLastSyncedAt);
  const usersSyncVersion = useAuthStore((state) => state.usersSyncVersion);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const syncLabel = usersSynced
    ? usersLastSyncedAt
      ? `Usuarios sincronizados em ${new Date(usersLastSyncedAt).toLocaleString()}`
      : `Usuarios sincronizados (versao ${usersSyncVersion})`
    : 'Usuarios ainda nao sincronizados';

  return (
    <Card style={styles.formCard} variant="accent">
      <FieldBlock
        autoComplete={flags.useAutoComplete ? 'username' : 'off'}
        keyboardType={flags.useEmailKeyboard ? 'email-address' : 'default'}
        label="Login"
        returnKeyType="next"
        useCustomInput
        value={identifier}
        onBlur={(event) => {
          logFocusEvent('identifier', 'blur', event);
        }}
        onChangeText={setIdentifier}
        onFocus={(event) => {
          logFocusEvent('identifier', 'focus', event);
        }}
      />
      <FieldBlock
        autoComplete={flags.useAutoComplete ? 'current-password' : 'off'}
        label="Senha"
        returnKeyType="done"
        secureTextEntry={flags.useSecureTextEntry}
        useCustomInput
        value={password}
        onBlur={(event) => {
          logFocusEvent('password', 'blur', event);
        }}
        onChangeText={setPassword}
        onFocus={(event) => {
          logFocusEvent('password', 'focus', event);
        }}
        onSubmitEditing={() => {
          void login(identifier, password);
        }}
      />

      <Pressable
        style={({ pressed }) => [styles.submitButton, pressed && styles.stageChipPressed, isLoggingIn && styles.disabled]}
        onPress={() => {
          void login(identifier, password);
        }}
      >
        <Text style={styles.submitButtonLabel}>{isLoggingIn ? 'Entrando...' : 'Entrar com store'}</Text>
      </Pressable>

      <Text style={styles.storeMeta}>Rede: {connectivityStatus}</Text>
      <Text style={styles.storeMeta}>{syncLabel}</Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </Card>
  );
}

export function DebugInputScreen() {
  const [stage, setStage] = useState<DebugStage>('minimal');
  const [flags, setFlags] = useState<DebugFlags>(() => cloneFlags('minimal'));
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const nextLogIdRef = useRef(1);

  const stageConfig = STAGE_CONFIGS[stage];

  useEffect(() => {
    const nextFlags = cloneFlags(stage);
    setFlags(nextFlags);
    setLogs([]);

    if (__DEV__) {
      console.log(`[debug-input] stage=${stage} preset=${JSON.stringify(nextFlags)}`);
    }
  }, [stage]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[debug-input] mounted');
    }

    return () => {
      if (__DEV__) {
        console.log('[debug-input] unmounted');
      }
    };
  }, []);

  const activeSummary = useMemo(
    () =>
      [
        flags.useCard ? 'Card:on' : 'Card:off',
        flags.useCustomInput ? 'Input:on' : 'Input:off',
        flags.useAutoComplete ? 'autoComplete:on' : 'autoComplete:off',
        flags.useEmailKeyboard ? 'keyboardType:email' : 'keyboardType:default',
        flags.useSecureTextEntry ? 'secure:on' : 'secure:off',
        flags.useStore ? 'store:on' : 'store:off',
      ].join(' | '),
    [flags],
  );

  const appendLog = (message: string) => {
    const entry = {
      id: nextLogIdRef.current++,
      message,
    } satisfies DebugLogEntry;

    setLogs((current) => [entry, ...current].slice(0, 12));

    if (__DEV__) {
      console.log(`[debug-input] ${message}`);
    }
  };

  const logFocusEvent = (
    field: 'identifier' | 'password',
    event: 'focus' | 'blur',
    nativeEvent?: FocusEvent | BlurEvent,
  ) => {
    const target = nativeEvent?.nativeEvent?.target;
    appendLog(`${new Date().toISOString()} | stage=${stage} | field=${field} | event=${event} | target=${String(target ?? 'n/a')}`);
  };

  const toggleFlag = (key: keyof DebugFlags) => {
    setFlags((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Debug Input Isolation</Text>
          <Text style={styles.subtitle}>
            Use esta tela para identificar a primeira etapa exata em que o foco cai no Android/Expo Go.
          </Text>
          <Text style={styles.summary}>{stageConfig.description}</Text>
          <Text style={styles.summary}>{activeSummary}</Text>
        </View>

        <View style={styles.stageGroup}>
          {STAGE_ORDER.map((stageOption) => (
            <Pressable
              key={stageOption}
              style={({ pressed }) => [
                styles.stageChip,
                stage === stageOption && styles.stageChipActive,
                pressed && styles.stageChipPressed,
              ]}
              onPress={() => {
                setStage(stageOption);
              }}
            >
              <Text style={[styles.stageChipLabel, stage === stageOption && styles.stageChipLabelActive]}>
                {STAGE_CONFIGS[stageOption].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.flagGroup}>
          <Text style={styles.flagTitle}>Flags para isolamento fino</Text>
          <View style={styles.flagRow}>
            <Pressable style={styles.flagChip} onPress={() => toggleFlag('useAutoComplete')}>
              <Text style={styles.flagChipLabel}>autoComplete: {flags.useAutoComplete ? 'on' : 'off'}</Text>
            </Pressable>
            <Pressable style={styles.flagChip} onPress={() => toggleFlag('useEmailKeyboard')}>
              <Text style={styles.flagChipLabel}>keyboardType: {flags.useEmailKeyboard ? 'email' : 'default'}</Text>
            </Pressable>
            <Pressable style={styles.flagChip} onPress={() => toggleFlag('useSecureTextEntry')}>
              <Text style={styles.flagChipLabel}>secure: {flags.useSecureTextEntry ? 'on' : 'off'}</Text>
            </Pressable>
            <Pressable style={styles.flagChip} onPress={() => toggleFlag('useStore')}>
              <Text style={styles.flagChipLabel}>store: {flags.useStore ? 'on' : 'off'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.testArea}>
          {flags.useHeaderCopy ? (
            <View style={styles.copyBlock}>
              <Text style={styles.copyTitle}>Login de teste</Text>
              <Text style={styles.copySubtitle}>Toque em um campo por vez e observe os logs abaixo.</Text>
            </View>
          ) : null}

          {flags.useStore ? (
            <StoreFormStage flags={flags} logFocusEvent={logFocusEvent} />
          ) : (
            <LocalFormStage flags={flags} logFocusEvent={logFocusEvent} />
          )}
        </View>

        <View style={styles.logPanel}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Logs de foco/blur</Text>
            <Pressable
              style={styles.clearChip}
              onPress={() => {
                setLogs([]);
                appendLog(`${new Date().toISOString()} | logs cleared`);
              }}
            >
              <Text style={styles.clearChipLabel}>Limpar</Text>
            </Pressable>
          </View>
          {logs.length === 0 ? (
            <Text style={styles.emptyLog}>Sem eventos ainda. Toque nos campos para registrar focus/blur.</Text>
          ) : (
            logs.map((entry) => (
              <Text key={entry.id} style={styles.logEntry}>
                {entry.message}
              </Text>
            ))
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.shell,
  },
  screen: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: layout.screenPaddingVertical,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.textStyles.title,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.textStyles.body,
    color: colors.text.secondary,
  },
  summary: {
    ...typography.textStyles.caption,
    color: colors.text.muted,
  },
  stageGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  stageChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stageChipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  stageChipPressed: {
    opacity: 0.88,
  },
  stageChipLabel: {
    ...typography.textStyles.label,
    color: colors.text.primary,
  },
  stageChipLabelActive: {
    color: colors.text.onAccent,
  },
  flagGroup: {
    gap: spacing.xs,
  },
  flagTitle: {
    ...typography.textStyles.label,
    color: colors.text.secondary,
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  flagChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flagChipLabel: {
    ...typography.textStyles.caption,
    color: colors.text.primary,
  },
  testArea: {
    gap: spacing.md,
  },
  copyBlock: {
    gap: spacing.xs,
  },
  copyTitle: {
    ...typography.textStyles.bodyStrong,
    color: colors.text.primary,
  },
  copySubtitle: {
    ...typography.textStyles.caption,
    color: colors.text.muted,
  },
  formPlain: {
    gap: spacing.md,
  },
  formCard: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.textStyles.label,
    color: colors.text.primary,
  },
  rawInput: {
    minHeight: layout.inputMinHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surfaceMuted,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    ...typography.textStyles.body,
  },
  submitButton: {
    minHeight: layout.buttonHeights.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surfaceLight,
  },
  submitButtonLabel: {
    ...typography.textStyles.button,
    color: colors.brand.primary,
  },
  disabled: {
    opacity: 0.6,
  },
  storeMeta: {
    ...typography.textStyles.caption,
    color: colors.text.muted,
  },
  errorText: {
    ...typography.textStyles.caption,
    color: colors.badge.error.text,
  },
  logPanel: {
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.surfaceMuted,
    padding: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  logTitle: {
    ...typography.textStyles.bodyStrong,
    color: colors.text.primary,
  },
  clearChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearChipLabel: {
    ...typography.textStyles.caption,
    color: colors.text.secondary,
  },
  emptyLog: {
    ...typography.textStyles.caption,
    color: colors.text.muted,
  },
  logEntry: {
    ...typography.textStyles.code,
    color: colors.text.secondary,
  },
});
