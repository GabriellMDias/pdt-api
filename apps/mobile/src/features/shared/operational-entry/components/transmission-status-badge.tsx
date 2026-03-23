import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/src/theme/theme-provider';

export type TransmissionBadgeEntry = {
  syncStatus: 'pending' | 'sending' | 'sent' | 'error_temporary' | 'error_permanent';
  serverAckStatus?: string | null;
};

function resolveStatus(entry: TransmissionBadgeEntry) {
  if (entry.syncStatus === 'sent') {
    return {
      backgroundColor: '#0F8A35',
      foregroundColor: '#FFFFFF',
      icon: 'checkmark-circle' as const,
      title: 'Transmitido',
      subtitle: entry.serverAckStatus === 'duplicate' ? 'Conciliado' : 'Enviado',
    };
  }

  if (entry.syncStatus === 'sending') {
    return {
      backgroundColor: '#0F6BA8',
      foregroundColor: '#FFFFFF',
      icon: 'time' as const,
      title: 'Nao Transmitido',
      subtitle: 'Enviando',
    };
  }

  if (entry.syncStatus === 'error_permanent') {
    return {
      backgroundColor: '#FFCB2F',
      foregroundColor: '#111827',
      icon: 'alert-circle' as const,
      title: 'Parcial',
      subtitle: 'Erro permanente',
    };
  }

  if (entry.syncStatus === 'error_temporary') {
    return {
      backgroundColor: '#FFCB2F',
      foregroundColor: '#111827',
      icon: 'remove-circle' as const,
      title: 'Parcial',
      subtitle: 'Pendente reenvio',
    };
  }

  return {
    backgroundColor: '#FE0000',
    foregroundColor: '#FFFFFF',
    icon: 'close-circle' as const,
    title: 'Nao Transmitido',
    subtitle: 'Pendente',
  };
}

export function TransmissionStatusBadge({ entry }: { entry: TransmissionBadgeEntry }) {
  const status = resolveStatus(entry);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, { backgroundColor: status.backgroundColor }]}>
      <Ionicons color={status.foregroundColor} name={status.icon} size={38} />
      <Text style={[styles.title, { color: status.foregroundColor }]}>{status.title}</Text>
      <Text style={[styles.subtitle, { color: status.foregroundColor }]}>{status.subtitle}</Text>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    width: 116,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    gap: 8,
  },
  title: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
});
