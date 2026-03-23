import { Image, StyleSheet, View } from 'react-native';

export function HomeBrandPanel() {
  return (
    <View style={styles.container}>
      <Image
        resizeMode="contain"
        source={require('../../../../assets/images/pdt-logo-gray.png')}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  logo: {
    width: 250,
    height: 250,
    opacity: 0.92,
  },
});
