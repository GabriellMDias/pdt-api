import { useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input } from '@/src/components/ui';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import {
  StoreSelectorModal,
  getSelectableSyncStores,
} from '@/src/features/sync/components/store-selector-modal';
import type { LocalMasterStore } from '@/src/features/bootstrap/types';
import { layout, spacing, typography } from '@/src/theme/tokens';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

const WEB_LOGIN_LOGO = require('../../../../assets/images/web-login-logo.png');

export function LoginScreen() {
  const styles = useThemedStyles(createStyles);
  const login = useAuthStore((state) => state.login);
  const isLoggingIn = useAuthStore((state) => state.isLoggingIn);
  const isSyncingApp = useAuthStore((state) => state.isSyncingApp);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const syncProgressScope = useAuthStore((state) => state.syncProgressScope);
  const syncProgressLabel = useAuthStore((state) => state.syncProgressLabel);
  const syncProgressDetail = useAuthStore((state) => state.syncProgressDetail);
  const usersSynced = useAuthStore((state) => state.usersSynced);
  const usersLastSyncedAt = useAuthStore((state) => state.usersLastSyncedAt);
  const loadLoginSyncStores = useAuthStore((state) => state.loadLoginSyncStores);
  const syncFromLogin = useAuthStore((state) => state.syncFromLogin);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [syncStoreOptions, setSyncStoreOptions] = useState<LocalMasterStore[]>([]);
  const [selectedSyncStoreId, setSelectedSyncStoreId] = useState<number | null>(null);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  const syncLabel = usersSynced
    ? `Ultima sincronizacao: ${usersLastSyncedAt ? new Date(usersLastSyncedAt).toLocaleString('pt-BR') : 'concluida'}`
    : 'Ultima sincronizacao: ainda nao realizada';

  const isBusy = isLoggingIn || isSyncingApp;
  const shouldUseKeyboardAvoidingView = Platform.OS === 'ios';

  async function handleSubmitLogin() {
    await login(identifier, password);

    const nextState = useAuthStore.getState();
    if (nextState.status !== 'authenticated' && nextState.errorMessage) {
      Alert.alert('Nao foi possivel entrar', nextState.errorMessage);
    }
  }

  async function handlePrepareSync() {
    try {
      const preview = await loadLoginSyncStores(identifier, password);
      const selectableStores = getSelectableSyncStores(preview.stores);
      if (selectableStores.length === 0) {
        Alert.alert(
          'Nenhuma loja disponivel',
          'Nao foi possivel carregar as lojas para a sincronizacao inicial.',
        );
        return;
      }
      setSyncStoreOptions(selectableStores);
      setSelectedSyncStoreId(
        selectableStores.some((store) => store.id === preview.preferredStoreId)
          ? preview.preferredStoreId
          : selectableStores[0]?.id ?? null,
      );
      setSyncModalVisible(true);
    } catch {
      const message =
        useAuthStore.getState().errorMessage ??
        'Nao foi possivel carregar as lojas para a sincronizacao inicial.';
      Alert.alert('Nao foi possivel sincronizar', message);
    }
  }

  async function handleConfirmSync() {
    if (!selectedSyncStoreId) {
      return;
    }

    const synced = await syncFromLogin(identifier, password, selectedSyncStoreId);
    if (!synced) {
      return;
    }

    setSyncModalVisible(false);
  }

  const content = (
    <Card style={styles.card}>
      <View style={styles.brandBlock}>
        <Image resizeMode="contain" source={WEB_LOGIN_LOGO} style={styles.logo} />
        <Text style={styles.brandTitle}>PdT Connect</Text>
      </View>

      <View style={styles.formBlock}>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          autoComplete="username"
          editable={!isBusy}
          label="Login"
          placeholder="E-mail ou login"
          returnKeyType="next"
          value={identifier}
          blurOnSubmit={false}
          onChangeText={setIdentifier}
          onSubmitEditing={() => {
            passwordInputRef.current?.focus();
          }}
        />

        <Input
          autoComplete="current-password"
          editable={!isBusy}
          label="Senha"
          placeholder="Senha"
          ref={passwordInputRef}
          returnKeyType="done"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => {
            void handleSubmitLogin();
          }}
        />

        <Button
          block
          label="Entrar"
          loading={isLoggingIn}
          onPress={() => {
            void handleSubmitLogin();
          }}
        />

        <Button
          block
          label="Sincronizar"
          loading={isSyncingApp}
          variant="ghost"
          onPress={() => {
            void handlePrepareSync();
          }}
        />

        <Text style={styles.syncInfo}>{syncLabel}</Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      {shouldUseKeyboardAvoidingView ? (
        <KeyboardAvoidingView behavior="padding" style={styles.screen}>
          <View style={styles.keyboardContainer}>{content}</View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.screen}>
          <View style={styles.keyboardContainer}>{content}</View>
        </View>
      )}

      <StoreSelectorModal
        confirmLabel="Sincronizar"
        description="Escolha a loja que deve virar o contexto atual do app apos a sincronizacao inicial."
        errorMessage={errorMessage}
        loading={isSyncingApp}
        progressScope={syncProgressScope}
        progressDetail={syncProgressDetail}
        progressLabel={syncProgressLabel}
        selectedStoreId={selectedSyncStoreId}
        stores={syncStoreOptions}
        title="Selecionar loja"
        visible={syncModalVisible}
        onClose={() => {
          setSyncModalVisible(false);
        }}
        onConfirm={() => {
          void handleConfirmSync();
        }}
        onSelectStore={setSelectedSyncStoreId}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.shell,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: layout.screenPaddingVertical,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  card: {
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: '100%',
    maxWidth: 220,
    height: 96,
  },
  brandTitle: {
    ...typography.textStyles.title,
    color: theme.colors.text.primary,
  },
  formBlock: {
    gap: spacing.md,
  },
  syncInfo: {
    ...typography.textStyles.caption,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
});
