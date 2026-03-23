import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getHomeNavigationGroupById,
  homeNavigationGroups,
} from "@/src/features/home/home-navigation";
import { HomeBottomActions } from "@/src/features/home/components/home-bottom-actions";
import { HomeHeader } from "@/src/features/home/components/home-header";
import { HomeMenuCard } from "@/src/features/home/components/home-menu-card";
import type { HomeNavigationItem } from "@/src/features/home/types";
import {
  useAppTheme,
  useThemedStyles,
  type AppTheme,
} from "@/src/theme/theme-provider";
import { spacing, typography } from "@/src/theme/tokens";

type HomeGroupScreenProps = {
  groupId: number;
};

function navigateToGroup(
  router: ReturnType<typeof useRouter>,
  groupId: number,
) {
  if (groupId === 1) {
    router.replace("/home");
    return;
  }

  router.replace({
    pathname: "/home-group/[groupId]",
    params: { groupId: String(groupId) },
  });
}

function navigateToItem(
  router: ReturnType<typeof useRouter>,
  item: HomeNavigationItem,
) {
  if (item.target.type === "route") {
    router.push(item.target.href);
    return;
  }

  router.push({
    pathname: "/menu-placeholder",
    params: {
      title: item.target.title,
      description: item.target.description,
    },
  });
}

export function HomeGroupScreen({ groupId }: HomeGroupScreenProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { height } = useWindowDimensions();
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const [menuOpen, setMenuOpen] = useState(false);

  const group = getHomeNavigationGroupById(groupId);
  const sheetHeight = Math.min(Math.max(height * 0.7, 380), 560);

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: menuOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [menuAnimation, menuOpen]);

  if (!group || group.id === 1) {
    return (
      <SafeAreaView
        edges={["top", "right", "bottom", "left"]}
        style={styles.fallback}
      >
        <HomeHeader
          leading="back"
          onLeadingPress={() => router.replace("/home")}
          title="Grupo invalido"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "right", "bottom", "left"]}
      style={styles.container}
    >
      <HomeHeader
        leading="back"
        onLeadingPress={() => router.replace("/home")}
        title={group.label}
      />

      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: sheetHeight + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            {group.renderIcon(26, theme.colors.text.onAccent)}
          </View>
          <Text style={styles.heroTitle}>{group.label}</Text>
        </View>

        <View style={styles.grid}>
          {group.items.map((item) => (
            <View key={item.key} style={styles.gridItem}>
              <HomeMenuCard
                item={item}
                onPress={() => {
                  navigateToItem(router, item);
                }}
              />
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      <HomeBottomActions
        animation={menuAnimation}
        groups={homeNavigationGroups}
        onSelectGroup={(nextGroupId) => {
          setMenuOpen(false);
          navigateToGroup(router, nextGroupId);
        }}
        onToggle={() => {
          setMenuOpen((current) => !current);
        }}
        open={menuOpen}
        selectedGroupId={group.id}
        sheetHeight={sheetHeight}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.app,
    },
    fallback: {
      flex: 1,
      backgroundColor: theme.colors.background.app,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.lg,
    },
    hero: {
      gap: spacing.sm,
    },
    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.brand.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      ...typography.textStyles.hero,
      color: theme.colors.text.primary,
    },
    heroSubtitle: {
      ...typography.textStyles.body,
      color: theme.colors.text.secondary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -spacing.xs,
      rowGap: spacing.md,
    },
    gridItem: {
      width: "50%",
      paddingHorizontal: spacing.xs,
    },
  });
