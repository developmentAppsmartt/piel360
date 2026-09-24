import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const MARKETING = [
  require('../../assets/splash-1.png'),
  require('../../assets/splash-2.png'),
] as const;

const HOLD_MS = 2_800;
const FADE_MS = 450;
const SAFETY_MS = HOLD_MS * 2 + FADE_MS * 6 + 2_000;

type SplashIntroProps = {
  onFinish: () => void;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function animateTo(
  value: Animated.Value,
  toValue: number,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start(() => resolve());
  });
}

/**
 * splash-1 → splash-2 → app.
 * El logo nativo ya cubre el arranque; aquí no se vuelve a pintar para evitar
 * el icono de Android 12 pegado arriba de la status bar.
 */
export function SplashIntro({ onFinish }: SplashIntroProps) {
  const { width, height } = useWindowDimensions();
  const finishedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  const onRootLayout = () => {
    if (ready) return;
    setReady(true);
    // Sin animación de salida: en Android el icono del splash nativo
    // a veces queda “pegado” arriba si fade > 0.
    SplashScreen.setOptions({ duration: 0, fade: false });
    SplashScreen.hide();
  };

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < MARKETING.length; i++) {
        if (cancelled || finishedRef.current) return;

        if (i > 0) {
          setIndex(i);
          await wait(32);
        }

        await animateTo(opacity, 1, FADE_MS);
        if (cancelled || finishedRef.current) return;

        await wait(HOLD_MS);
        if (cancelled || finishedRef.current) return;

        await animateTo(opacity, 0, FADE_MS);
      }

      if (!cancelled) finish();
    };

    void run();

    const safety = setTimeout(finish, SAFETY_MS);
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listo una vez
  }, [ready]);

  const w = Math.max(width, 1);
  const h = Math.max(height, 1);

  return (
    <View style={styles.container} onLayout={onRootLayout}>
      <Animated.View style={[styles.imageWrap, { opacity }]}>
        <Image
          source={MARKETING[index]!}
          style={{ width: w, height: h }}
          resizeMode="cover"
          accessibilityLabel="Piel 360 — presentación"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}

/** @deprecated Usar SplashIntro */
export const SplashVideo = SplashIntro;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: '#FFFFFF',
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
});
