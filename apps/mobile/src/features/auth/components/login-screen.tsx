import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ENV } from '@/src/config/env';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { colors } from '@/src/theme/tokens';

function formatEnvironmentLabel() {
  return ENV.IS_PRODUCTION ? 'Producao' : 'Desenvolvimento';
}

export function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const usersSynced = useAuthStore((state) => state.usersSynced);
  const usersSyncVersion = useAuthStore((state) => state.usersSyncVersion);
  const usersLastSyncedAt = useAuthStore((state) => state.usersLastSyncedAt);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const offlineHint = useMemo(() => {
    if (connectivityStatus !== 'offline') return null;
    if (usersSynced) {
      return 'Sem internet. Login offline disponivel para usuarios sincronizados.';
    }
    return 'É necessário conexão com a internet para sincronização inicial dos usuários.';
  }, [connectivityStatus, usersSynced]);

  const syncLabel = useMemo(() => {
    if (!usersSynced) return 'Usuarios ainda nao sincronizados';
    if (!usersLastSyncedAt) return `Usuarios sincronizados (versao ${usersSyncVersion})`;
    return `Usuarios sincronizados em ${new Date(usersLastSyncedAt).toLocaleString()}`;
  }, [usersLastSyncedAt, usersSynced, usersSyncVersion]);

  const isBusy = isLoggingIn;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboardContainer}
      >
        <View style={styles.header}>
          <Text style={styles.brandTitle}>PdT Connect</Text>
          <Text style={styles.environmentLabel}>Ambiente: {formatEnvironmentLabel()}</Text>
          <Text style={styles.apiLabel}>{ENV.API_URL}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Login</Text>
          <Text style={styles.cardSubtitle}>
            Entre com email/login e senha para autenticar online ou offline.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email ou login</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
              keyboardType="email-address"
              placeholder="usuario@empresa.com"
              placeholderTextColor="rgba(255, 255, 255, 0.45)"
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Senha</Text>
            <TextInput
              editable={!isBusy}
              placeholder="Digite sua senha"
              placeholderTextColor="rgba(255, 255, 255, 0.45)"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            disabled={isBusy}
            onPress={() => {
              void login(identifier, password);
            }}
            style={({ pressed }) => [
              styles.loginButton,
              (pressed || isBusy) && styles.loginButtonPressed,
            ]}
          >
            {isLoggingIn ? (
              <ActivityIndicator color={colors.pilarGreen} />
            ) : (
              <Text style={styles.loginButtonLabel}>Entrar</Text>
            )}
          </Pressable>

          <Text style={styles.syncInfo}>{syncLabel}</Text>

          {offlineHint ? <Text style={styles.warningMessage}>{offlineHint}</Text> : null}
          {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgDark,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  brandTitle: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  environmentLabel: {
    color: colors.textMutedDark,
    fontSize: 13,
    fontWeight: '600',
  },
  apiLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  card: {
    borderRadius: 18,
    backgroundColor: colors.pilarGreen,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    color: colors.surfaceLight,
    fontSize: 24,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.surfaceLight,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  loginButton: {
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonLabel: {
    color: colors.pilarGreen,
    fontSize: 15,
    fontWeight: '700',
  },
  syncInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 16,
  },
  warningMessage: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.45)',
    backgroundColor: 'rgba(217, 119, 6, 0.18)',
    color: '#FFD9A6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 17,
  },
  errorMessage: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.45)',
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    color: '#FFD4D4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 17,
  },
});
