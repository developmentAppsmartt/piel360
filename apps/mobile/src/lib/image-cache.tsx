import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/**
 * Las URLs firmadas de S3 cambian en cada respuesta (firma y fecha en la query),
 * así que se cachean por la ruta del archivo para no descargarlas otra vez.
 * `v2`: se reescribieron las máscaras estéticas para quitar el velo gris.
 * Sin este sufijo el disco seguía pintando la copia opaca.
 */
const CACHE_DE_IMAGEN = 'v2';

export function cachedImageSource(uri: string): ImageSource {
  const queryAt = uri.indexOf('?');
  const ruta = queryAt < 0 ? uri : uri.slice(0, queryAt);
  return { uri, cacheKey: `${ruta}#${CACHE_DE_IMAGEN}` };
}

/** Descarga en segundo plano las imágenes para que aparezcan sin espera al elegirlas. */
export function ImagePreloader({
  uris,
  enabled = true,
}: {
  uris: string[];
  /** Esperar a que cargue lo visible para no competir por la red. */
  enabled?: boolean;
}) {
  if (!enabled || !uris.length) return null;
  return (
    <View style={styles.hidden} pointerEvents="none" accessibilityElementsHidden>
      {uris.map((uri) => (
        <Image
          key={uri}
          source={cachedImageSource(uri)}
          cachePolicy="memory-disk"
          priority="low"
          style={styles.pixel}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
  },
  pixel: {
    width: 1,
    height: 1,
  },
});
