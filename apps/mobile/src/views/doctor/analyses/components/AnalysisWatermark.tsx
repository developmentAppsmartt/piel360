import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

const WATERMARK = require('../../../../../assets/piel-marca.png');

/**
 * "Análisis realizado por Piel 360 AI" sobre la imagen de un resultado.
 * Va en blanco (tint) para que se lea sobre cualquier foto, y fuera de la capa
 * de zoom del visor para que no se mueva con la imagen.
 */
export function AnalysisWatermark() {
  return (
    <View style={styles.wrap}>
      <Image
        source={WATERMARK}
        style={styles.image}
        contentFit="contain"
        tintColor="#FFFFFF"
        accessibilityLabel="Análisis realizado por Piel 360 AI"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: '44%',
    maxWidth: 220,
    aspectRatio: 1280 / 435,
    zIndex: 3,
    opacity: 0.80,
    pointerEvents: 'none',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
