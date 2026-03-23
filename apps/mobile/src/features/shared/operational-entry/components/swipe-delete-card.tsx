import { AntDesign } from '@expo/vector-icons';
import { ReactNode, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useThemedStyles, type AppTheme } from '@/src/theme/theme-provider';

type SwipeDeleteCardProps = {
  deleteTitle: string;
  deleteHelper: string;
  onDelete: () => void;
  children: ReactNode;
};

export function SwipeDeleteCard({
  deleteTitle,
  deleteHelper,
  onDelete,
  children,
}: SwipeDeleteCardProps) {
  const swipeableRef = useRef<Swipeable | null>(null);
  const styles = useThemedStyles(createStyles);

  function renderLeftActions() {
    return (
      <View style={styles.swipedRow}>
        <AntDesign color="white" name="delete" size={34} />
        <Text style={styles.swipedTitle}>{deleteTitle}</Text>
        <Text style={styles.swipedHelper}>{deleteHelper}</Text>
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      containerStyle={styles.swipeContainer}
      friction={2}
      leftThreshold={76}
      overshootLeft={false}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={() => {
        swipeableRef.current?.close();
        onDelete();
      }}
    >
      {children}
    </Swipeable>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  swipeContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  swipedRow: {
    minHeight: 150,
    borderRadius: 10,
    backgroundColor: theme.colors.status.error,
    justifyContent: 'center',
    paddingLeft: 18,
    gap: 4,
  },
  swipedTitle: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  swipedHelper: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 11,
    lineHeight: 15,
    maxWidth: 180,
  },
});
