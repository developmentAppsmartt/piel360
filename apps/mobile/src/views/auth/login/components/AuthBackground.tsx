import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBranding } from '../../../../context/BrandingContext';

type AuthBackgroundProps = {
  children: ReactNode;
};

export function AuthBackground({ children }: AuthBackgroundProps) {
  const branding = useBranding();

  return (
    <View style={styles.root}>
      <ImageBackground
        source={branding.loginHeroImage}
        style={styles.image}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(11,10,18,0.15)', branding.colors.overlay, 'rgba(11,10,18,0.92)']}
          locations={[0, 0.35, 1]}
          style={styles.overlay}
        >
          {children}
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0A12',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
});
