import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { colors } from '@/src/theme/tokens';

export function HomeScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  const connectivityStatus = useAuthStore((state) => state.connectivityStatus);
  const syncUsers = useAuthStore((state) => state.syncUsers);
  const isSyncingUsers = useAuthStore((state) => state.isSyncingUsers);
  const usersSynced = useAuthStore((state) => state.usersSynced);
  const usersLastSyncedAt = useAuthStore((state) => state.usersLastSyncedAt);
  const usersSyncVersion = useAuthStore((state) => state.usersSyncVersion);
  const logout = useAuthStore((state) => state.logout);

  const canSyncUsers = sessionMode === 'online' && connectivityStatus === 'online' && !isSyncingUsers;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Login concluido com sucesso.</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Usuario</Text>
        <Text style={styles.infoValue}>{currentUser?.name ?? '-'}</Text>
        <Text style={styles.infoSecondary}>{currentUser?.email ?? currentUser?.login ?? '-'}</Text>

        <View style={styles.badges}>
          <View style={[styles.badge, sessionMode === 'offline' ? styles.badgeWarning : styles.badgeSuccess]}>
            <Text style={styles.badgeLabel}>Modo {sessionMode ?? 'desconhecido'}</Text>
          </View>
          <View style={[styles.badge, connectivityStatus === 'online' ? styles.badgeInfo : styles.badgeWarning]}>
            <Text style={styles.badgeLabel}>Rede {connectivityStatus}</Text>
          </View>
        </View>
      </View>

      <Pressable
        disabled={!canSyncUsers}
        onPress={() => {
          void syncUsers();
        }}
        style={({ pressed }) => [
          styles.syncButton,
          (!canSyncUsers || pressed) && styles.syncButtonPressed,
        ]}
      >
        {isSyncingUsers ? (
          <ActivityIndicator color={colors.surfaceLight} />
        ) : (
          <Text style={styles.syncButtonLabel}>Sincronizar usuários</Text>
        )}
      </Pressable>

      <Text style={styles.syncInfo}>
        {usersSynced
          ? `Sincronização versão ${usersSyncVersion}${
              usersLastSyncedAt ? ` em ${new Date(usersLastSyncedAt).toLocaleString()}` : ''
            }`
          : 'Usuários ainda não sincronizados'}
      </Text>

      <Pressable
        onPress={() => {
          void logout();
        }}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
      >
        <Text style={styles.logoutButtonLabel}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: colors.bgDarkShell,
    gap: 18,
  },
  title: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMutedDark,
    fontSize: 14,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.bgDarkAlt,
    padding: 16,
    gap: 6,
  },
  infoLabel: {
    color: colors.textMutedDark,
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: '700',
  },
  infoSecondary: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  badges: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSuccess: {
    borderColor: 'rgba(22, 163, 74, 0.5)',
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
  },
  badgeInfo: {
    borderColor: 'rgba(2, 132, 199, 0.5)',
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
  },
  badgeWarning: {
    borderColor: 'rgba(217, 119, 6, 0.5)',
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },
  badgeLabel: {
    color: colors.textDark,
    fontSize: 11,
    fontWeight: '600',
  },
  syncButton: {
    borderRadius: 12,
    backgroundColor: colors.info,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonPressed: {
    opacity: 0.5,
  },
  syncButtonLabel: {
    color: colors.surfaceLight,
    fontWeight: '700',
    fontSize: 14,
  },
  syncInfo: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
  },
  logoutButton: {
    borderRadius: 12,
    backgroundColor: colors.pilarOrange,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonLabel: {
    color: colors.surfaceLight,
    fontWeight: '700',
    fontSize: 15,
  },
});
