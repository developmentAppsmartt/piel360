import { useEventListener } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

const splashSource = require('../../assets/splash.mp4');

/** Fallback por si el video no dispara playToEnd (error de carga, etc.). */
const SPLASH_MAX_MS = 8_000;

type SplashVideoProps = {
  onFinish: () => void;
};

export function SplashVideo({ onFinish }: SplashVideoProps) {
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  const player = useVideoPlayer(splashSource, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEventListener(player, 'playToEnd', finish);

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error' || error) finish();
  });

  useEffect(() => {
    void SplashScreen.hideAsync();
    const timeout = setTimeout(finish, SPLASH_MAX_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoView
        style={styles.video}
        player={player}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxWidth: 520,
  },
});
