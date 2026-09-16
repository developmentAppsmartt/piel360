import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

const SPLASH_IMAGES = [
  require('../../assets/splash-1.png'),
  require('../../assets/splash-2.png'),
] as const;

/** Tiempo visible por imagen (sin contar el crossfade). */
const IMAGE_HOLD_MS = 4_000;
/** Duración del fade entre imágenes / salida. */
const FADE_MS = 700;

type SplashIntroProps = {
  onFinish: () => void;
};

/**
 * Splash de marca: splash-1 → splash-2 → login, con transición suave.
 * Modal a pantalla completa para no mostrar tabs/navegación debajo.
 */
export function SplashIntro({ onFinish }: SplashIntroProps) {
  const { width, height } = useWindowDimensions();
  const finishedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    void SplashScreen.hideAsync();

    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();

    const clearTimers = () => {
      for (const t of timers.current) clearTimeout(t);
      timers.current = [];
    };

    const t1 = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || finishedRef.current) return;
        setIndex(1);
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();

        const t2 = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: FADE_MS,
            useNativeDriver: true,
          }).start(({ finished: done }) => {
            if (done) finish();
          });
        }, IMAGE_HOLD_MS);
        timers.current.push(t2);
      });
    }, IMAGE_HOLD_MS);
    timers.current.push(t1);

    const safety = setTimeout(finish, IMAGE_HOLD_MS * 2 + FADE_MS * 4 + 1_000);
    timers.current.push(safety);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, []);

  return (
    <Modal
      visible
      animationType="none"
      transparent={false}
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={() => undefined}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.imageWrap, { opacity }]}>
          <Image
            source={SPLASH_IMAGES[index]}
            style={{ width, height }}
            resizeMode="cover"
            accessibilityLabel={`Piel 360 — presentación ${index + 1}`}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

/** @deprecated Usar SplashIntro */
export const SplashVideo = SplashIntro;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
});
