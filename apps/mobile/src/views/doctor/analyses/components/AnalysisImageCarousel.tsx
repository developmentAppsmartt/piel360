import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useBranding } from '../../../../context/BrandingContext';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';

export type CarouselImage = {
  label: string;
  url: string | null | undefined;
};

type AnalysisImageCarouselProps = {
  images: CarouselImage[];
  /** Fondo detrás de máscaras transparentes (YouCam). */
  backgroundUrl?: string | null;
};

export function AnalysisImageCarousel({
  images,
  backgroundUrl,
}: AnalysisImageCarouselProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const available = useMemo(
    () =>
      images.filter(
        (img): img is { label: string; url: string } => !!img.url,
      ),
    [images],
  );

  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(0, available.length - 1));
  const current = available[safeIndex];

  if (available.length === 0) {
    return (
      <Text style={styles.note}>
        Las imágenes aún se están procesando o no están disponibles.
      </Text>
    );
  }

  return (
    <View style={styles.carousel}>
      <View style={styles.carouselFrame}>
        {backgroundUrl ? (
          <>
            <Image
              source={{ uri: backgroundUrl }}
              style={styles.carouselImage}
              contentFit="contain"
            />
            <Image
              source={{ uri: current.url }}
              style={styles.carouselOverlay}
              contentFit="contain"
            />
          </>
        ) : (
          <Image
            source={{ uri: current.url }}
            style={styles.carouselImage}
            contentFit="contain"
          />
        )}
      </View>

      <Text style={styles.carouselLabel}>{current.label}</Text>

      <View style={styles.carouselDots}>
        {available.map((img, i) => (
          <Pressable
            key={`${img.label}-${i}`}
            onPress={() => setIndex(i)}
            style={[
              styles.carouselDot,
              i === safeIndex && styles.carouselDotActive,
            ]}
            accessibilityLabel={`Ver ${img.label}`}
          />
        ))}
      </View>

      {available.length > 1 ? (
        <View style={styles.carouselNav}>
          <Pressable
            style={[
              styles.carouselNavBtn,
              safeIndex === 0 && styles.carouselNavBtnDisabled,
            ]}
            disabled={safeIndex === 0}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={styles.carouselNavText}>Anterior</Text>
          </Pressable>
          <Pressable
            style={[
              styles.carouselNavBtn,
              safeIndex === available.length - 1 &&
                styles.carouselNavBtnDisabled,
            ]}
            disabled={safeIndex === available.length - 1}
            onPress={() =>
              setIndex((i) => Math.min(available.length - 1, i + 1))
            }
          >
            <Text style={styles.carouselNavText}>Siguiente</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
