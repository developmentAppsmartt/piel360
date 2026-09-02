import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useBranding } from '../../../context/BrandingContext';
import { useDeviceLayout } from '../../../styles/deviceLayout';
import { analysesService } from '../../../services/analyses.service';
import { ApiError } from '../../../services/api.client';
import { youcamService } from '../../../services/youcam.service';
import type { YoucamRawResponse } from '../../../types/analysis';

type YoucamProcessingStepProps = {
  patientId: string;
  imageUri: string;
  onDone: (analysisId: string) => void;
  onError: (message: string) => void;
};

const POLL_MS = 2500;
const MAX_WAIT_MS = 120_000;

function youcamErrorFromRaw(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as YoucamRawResponse;
  if (r.error) return r.message || 'Error en el análisis estético';
  return null;
}

/**
 * Loader estilo Perfect (arcos) mientras se sube y procesa el análisis YouCam.
 * Al terminar navega a resultados vía onDone.
 */
export function YoucamProcessingStep({
  patientId,
  imageUri,
  onDone,
  onError,
}: YoucamProcessingStepProps) {
  const branding = useBranding();
  const { conventionScale, isTablet } = useDeviceLayout();
  const scale = isTablet ? conventionScale : 1;
  const size = Math.round(220 * scale);
  const stroke = Math.max(10, Math.round(10 * scale));
  const innerGap = Math.round(18 * scale);
  const stageSize = Math.round(260 * scale);
  const dashOn = Math.max(6, Math.round(6 * scale));
  const dashOff = Math.max(10, Math.round(10 * scale));
  const spin = useRef(new Animated.Value(0)).current;
  const [label, setLabel] = useState('Analizando tu piel…');
  const cancelled = useRef(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    cancelled.current = false;
    const started = Date.now();

    (async () => {
      try {
        setLabel('Enviando captura…');
        const created = await youcamService.createAnalysis({
          patientId,
          imageUri,
        });
        if (cancelled.current) return;

        setLabel('Procesando métricas faciales…');
        while (!cancelled.current && Date.now() - started < MAX_WAIT_MS) {
          const detail = await analysesService.getById(created.analysisId);
          const err = youcamErrorFromRaw(detail.aiRawResponse);
          if (err) {
            onError(err);
            return;
          }
          if (detail.isValid) {
            setLabel('Listo');
            onDone(created.analysisId);
            return;
          }
          await new Promise((r) => setTimeout(r, POLL_MS));
        }

        // Timeout: igual abrimos el detalle (sigue procesando en backend)
        onDone(created.analysisId);
      } catch (e) {
        if (cancelled.current) return;
        onError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'No se pudo completar el análisis.',
        );
      }
    })();

    return () => {
      cancelled.current = true;
    };
  }, [patientId, imageUri, onDone, onError]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dotSize = Math.max(5, Math.round(5 * scale));

  return (
    <View style={styles.root}>
      <View style={[styles.stage, { width: stageSize, height: stageSize }]}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.15" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dashOn} ${dashOff}`}
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r - innerGap}
              stroke="url(#g)"
              strokeWidth={stroke + 4}
              fill="none"
              strokeDasharray={`${c * 0.28} ${c}`}
              strokeLinecap="round"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r - innerGap}
              stroke="url(#g)"
              strokeWidth={stroke + 4}
              fill="none"
              strokeDasharray={`${c * 0.28} ${c}`}
              strokeDashoffset={c * 0.5}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        <View
          style={[
            styles.dots,
            {
              width: Math.round(56 * scale),
              height: Math.round(68 * scale),
              gap: Math.max(4, Math.round(4 * scale)),
            },
          ]}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.label, isTablet && { fontSize: 19 }]}>{label}</Text>
      <Text style={[styles.powered, { color: branding.colors.primary }]}>
        Powered by Piel360
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stage: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    width: 56,
    height: 68,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  label: {
    marginTop: 28,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  powered: {
    position: 'absolute',
    bottom: 36,
    fontSize: 12,
    fontWeight: '600',
  },
});
