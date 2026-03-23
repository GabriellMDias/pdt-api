import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { spacing, typography } from "@/src/theme/tokens";
import {
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from "@/src/theme/theme-provider";

export type HomeSidebarAction = {
  key: string;
  label: string;
  onPress: () => void;
  tone?: "default" | "warning";
  icon?: ReactNode;
};

type HomeSidebarProps = {
  open: boolean;
  animation: Animated.Value;
  width: number;
  userDisplayName: string;
  codigoUsuarioVrMaster: number | null;
  currentStoreLabel: string;
  lastPreparedAt: string | null;
  sessionMode: string | null;
  connectivityStatus: string;
  actions: HomeSidebarAction[];
  onClose: () => void;
  onSettingsPress: () => void;
};

function formatDateTime(value: string | null) {
  if (!value) return "Nao sincronizado";
  return new Date(value).toLocaleString();
}

export function HomeSidebar({
  open,
  animation,
  width,
  userDisplayName,
  codigoUsuarioVrMaster,
  currentStoreLabel,
  lastPreparedAt,
  sessionMode,
  connectivityStatus,
  actions,
  onClose,
  onSettingsPress,
}: HomeSidebarProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const sessionOnline = sessionMode !== 'offline';
  const networkOnline = connectivityStatus === 'online';
  const networkUnknown = connectivityStatus !== 'online' && connectivityStatus !== 'offline';
  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, 0],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const appVersion = Constants.expoConfig?.version ?? "dev";
  const userLine = codigoUsuarioVrMaster != null
    ? `${userDisplayName} - ${codigoUsuarioVrMaster}`
    : userDisplayName;

  return (
    <View pointerEvents={open ? "auto" : "box-none"} style={styles.root}>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { width, transform: [{ translateX }] }]}
      >
        <View style={styles.drawerTop}>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={onSettingsPress}
            style={styles.topIconButton}
          >
            <Feather color={colors.text.muted} name="settings" size={35} />
          </Pressable>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.metaList}>
            <Text numberOfLines={1} style={styles.userLine}>
              {userLine}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusPill}>
                <Feather
                  color={sessionOnline ? colors.status.success : colors.status.warning}
                  name={sessionOnline ? 'cloud' : 'slash'}
                  size={14}
                />
                <Text style={styles.statusLabel}>Sessao</Text>
                <View
                  style={[
                    styles.statusDot,
                    sessionOnline ? styles.statusDotSuccess : styles.statusDotWarning,
                  ]}
                />
              </View>
              <View style={styles.statusPill}>
                <Feather
                  color={
                    networkOnline
                      ? colors.status.success
                      : networkUnknown
                        ? colors.text.muted
                        : colors.status.warning
                  }
                  name={networkOnline ? 'wifi' : 'wifi-off'}
                  size={14}
                />
                <Text style={styles.statusLabel}>Rede</Text>
                <View
                  style={[
                    styles.statusDot,
                    networkOnline
                      ? styles.statusDotSuccess
                      : networkUnknown
                        ? styles.statusDotMuted
                        : styles.statusDotWarning,
                  ]}
                />
              </View>
            </View>
            <Text style={styles.metaLine}>Loja atual: {currentStoreLabel}</Text>
            <Text style={styles.metaLine}>
              Ultima sincronizacao: {formatDateTime(lastPreparedAt)}
            </Text>
            <Text style={styles.metaLine}>Versao: {appVersion}</Text>
          </View>
        </View>

        <View style={styles.actionList}>
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.actionRowPressed,
                action.tone === "warning" && styles.actionRowWarning,
              ]}
            >
              {action.icon ? (
                <View style={styles.actionIcon}>{action.icon}</View>
              ) : null}
              <Text
                style={[
                  styles.actionLabel,
                  action.tone === "warning" && styles.actionLabelWarning,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 40,
      elevation: 40,
    },
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.overlay.strong,
      zIndex: 41,
      elevation: 41,
    },
    drawer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme.colors.background.surfaceAlt,
      paddingHorizontal: 2,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.lg,
      zIndex: 42,
      elevation: 42,
    },
    drawerTop: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 2,
    },
    topIconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    metaSection: {
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.default,
    },
    metaList: {
      paddingHorizontal: 2,
      gap: spacing.xs,
    },
    userLine: {
      marginLeft: 5,
      ...typography.textStyles.bodyStrong,
      fontSize: 16,
      lineHeight: 20,
      color: theme.colors.text.primary,
    },
    metaLine: {
      marginLeft: 5,
      ...typography.textStyles.caption,
      fontSize: 13,
      lineHeight: 17,
      color: theme.colors.text.secondary,
      fontWeight: "700",
    },
    statusRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginLeft: 5,
      marginTop: spacing.xxs,
      marginBottom: spacing.xxs,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      backgroundColor: theme.colors.background.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    statusLabel: {
      ...typography.textStyles.caption,
      color: theme.colors.text.secondary,
      fontWeight: '700',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusDotSuccess: {
      backgroundColor: theme.colors.status.success,
    },
    statusDotWarning: {
      backgroundColor: theme.colors.status.warning,
    },
    statusDotMuted: {
      backgroundColor: theme.colors.text.muted,
    },
    actionList: {
      marginTop: spacing.xs,
    },
    actionRow: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
    },
    actionRowPressed: {
      backgroundColor: theme.isDark
        ? "rgba(255,255,255,0.04)"
        : "rgba(17,24,39,0.04)",
    },
    actionRowWarning: {
      paddingTop: spacing.lg,
    },
    actionIcon: {
      width: 30,
      alignItems: "center",
    },
    actionLabel: {
      ...typography.textStyles.bodyStrong,
      color: theme.colors.text.secondary,
      fontSize: 16,
      lineHeight: 20,
    },
    actionLabelWarning: {
      color: theme.colors.text.secondary,
    },
  });
