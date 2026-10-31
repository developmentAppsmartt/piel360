import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useBranding } from '../../../context/BrandingContext';
import { analysesService } from '../../../services/analyses.service';
import { ApiError } from '../../../services/api.client';
import type { AnalysisDetail } from '../../../types/analysis';
import type { BodySelection } from '../../../data/bodyRegions';

type SkiniverProcessingStepProps = {
  patientId: string;
  imageUri: string;
  selection: BodySelection;
  doctorNotes?: string;
  onDone: (analysisId: string) => void;
  onError: (message: string) => void;
};

const STAGES = [
  { min: 0, label: 'Pre procesamiento' },
  { min: 18, label: 'Analizando' },
  { min: 40, label: 'Calculando nivel de riesgo' },
  { min: 62, label: 'Determinando patología' },
  { min: 84, label: 'Diagnósticos completos' },
] as const;

const IMAGE_POLL_MS = 2000;
const IMAGE_POLL_ATTEMPTS = 8;

/**
 * El efecto se vuelve a montar si el padre re-renderiza (callbacks nuevos)
 * o en Strict Mode. Sin esta caché, cada montaje hace otro POST /analyses
 * y el historial muestra el mismo dermatológico varias veces.
 */
const inflightCreates = new Map<string, Promise<AnalysisDetail>>();

function createKey(
  patientId: string,
  imageUri: string,
  selection: BodySelection,
  doctorNotes?: string,
): string {
  return [
    patientId,
    imageUri,
    selection.bodyRegion,
    selection.xCoord,
    selection.yCoord,
    selection.zCoord,
    doctorNotes?.trim() ?? '',
  ].join('|');
}

/**
 * Carga estilo Skiniver: foto + línea de escaneo + % + etapa.
 * El POST es síncrono; el progreso es una animación de UX mientras espera.
 */
export function SkiniverProcessingStep({
  patientId,
  imageUri,
  selection,
  doctorNotes,
  onDone,
  onError,
}: SkiniverProcessingStepProps) {
  const branding = useBranding();
  const [progress, setProgress] = useState(4);
  const [stage, setStage] = useState(STAGES[0].label);
  const scanY = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onDoneRef.current = onDone;
  onErrorRef.current = onError;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          padding: 16,
          justifyContent: 'center',
        },
        card: {
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 16,
          gap: 14,
          borderWidth: 1,
          borderColor: '#EEF0F3',
        },
        title: {
          fontSize: 16,
          fontWeight: '800',
          color: branding.colors.text,
          textAlign: 'center',
        },
        frame: {
          width: '100%',
          aspectRatio: 1,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#0F172A',
        },
        image: {
          width: '100%',
          height: '100%',
        },
        scanLine: {
          position: 'absolute',
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: '#FFFFFF',
          opacity: 0.9,
          ...(Platform.OS === 'web'
            ? {
                boxShadow: `0 0 8px ${branding.colors.primary}`,
              }
            : {
                shadowColor: branding.colors.primary,
                shadowOpacity: 0.6,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              }),
        },
        percent: {
          fontSize: 28,
          fontWeight: '800',
          color: branding.colors.primary,
          textAlign: 'center',
        },
        track: {
          height: 6,
          borderRadius: 3,
          backgroundColor: '#E5E7EB',
          overflow: 'hidden',
        },
        fill: {
          height: 6,
          borderRadius: 3,
          backgroundColor: branding.colors.primary,
        },
        stage: {
          fontSize: 14,
          fontWeight: '700',
          color: branding.colors.muted,
          textAlign: 'center',
        },
      }),
    [branding.colors],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanY]);

  useEffect(() => {
    let cancelled = false;
    finished.current = false;
    let tick: ReturnType<typeof setInterval> | null = null;
    const key = createKey(patientId, imageUri, selection, doctorNotes);

    const bumpProgress = (target: number) => {
      if (cancelled) return;
      setProgress((p) => {
        const next = Math.min(99, Math.max(p, target));
        const label =
          [...STAGES].reverse().find((s) => next >= s.min)?.label ??
          STAGES[0].label;
        setStage(label);
        return next;
      });
    };

    tick = setInterval(() => {
      if (cancelled || finished.current) return;
      setProgress((p) => {
        if (p >= 92) return p;
        const next = p + (p < 40 ? 3 : p < 70 ? 2 : 1);
        const label =
          [...STAGES].reverse().find((s) => next >= s.min)?.label ??
          STAGES[0].label;
        setStage(label);
        return next;
      });
    }, 280);

    (async () => {
      try {
        bumpProgress(10);
        let pending = inflightCreates.get(key);
        if (!pending) {
          pending = analysesService.create({
            patientId,
            imageUri,
            bodyRegion: selection.bodyRegion,
            xCoord: selection.xCoord,
            yCoord: selection.yCoord,
            zCoord: selection.zCoord,
            doctorNotes,
          });
          inflightCreates.set(key, pending);
        }
        const created = await pending;
        inflightCreates.delete(key);
        if (cancelled) return;

        bumpProgress(88);
        setStage('Diagnósticos completos');

        // Las imágenes colored/masked pueden llegar segundos después.
        for (let i = 0; i < IMAGE_POLL_ATTEMPTS; i++) {
          if (cancelled) return;
          const status = await analysesService.getProcessingStatus(created.id);
          if (status.hasColored || status.hasMasked) break;
          await new Promise((r) => setTimeout(r, IMAGE_POLL_MS));
        }

        if (cancelled) return;
        finished.current = true;
        setProgress(100);
        setStage('Diagnósticos completos');
        onDoneRef.current(created.id);
      } catch (e) {
        inflightCreates.delete(key);
        if (cancelled) return;
        onErrorRef.current(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'No se pudo completar el análisis dermatológico.',
        );
      } finally {
        if (tick) clearInterval(tick);
      }
    })();

    return () => {
      cancelled = true;
      if (tick) clearInterval(tick);
    };
  }, [patientId, imageUri, selection, doctorNotes]);

  const translateY = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 280],
  });

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Piel 360 AI Analizando…</Text>
        <View style={styles.frame}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
          />
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY }] }]}
          />
        </View>
        <Text style={styles.percent}>{Math.round(progress)}%</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stage}>{stage}</Text>
      </View>
    </View>
  );
}
