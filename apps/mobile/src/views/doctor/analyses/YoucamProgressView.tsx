import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { YOUCAM_METRIC_LABELS } from '../../../data/youcamMetricLabels';
import { analysesService } from '../../../services/analyses.service';
import { patientsService } from '../../../services/patients.service';
import type {
  AnalysisDetail,
  PatientAnalysisSummary,
  YoucamRawResponse,
} from '../../../types/analysis';
import {
  parseYoucamMetrics,
  YOUCAM_MAIN_METRIC_TYPES,
  youcamScoresByType,
} from '../../../types/analysis';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createYoucamResultsStyles } from './styles/youcamResults.styles';

type YoucamProgressViewProps = {
  analysis: AnalysisDetail;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

/** vertical = listado con barras horizontales; horizontal = columnas. */
type LayoutMode = 'vertical' | 'horizontal';

function shortLabel(type: string): string {
  const full = YOUCAM_METRIC_LABELS[type] ?? type;
  if (full.length <= 10) return full;
  return full.split(/[\s—-]/)[0] ?? full.slice(0, 9);
}

export function YoucamProgressView({
  analysis,
  onBack,
  onOpenMenu,
  onOpenMessages,
}: YoucamProgressViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createYoucamResultsStyles(branding.colors),
    [branding.colors],
  );

  const [layout, setLayout] = useState<LayoutMode>('vertical');
  const [loading, setLoading] = useState(true);
  const [previous, setPrevious] = useState<PatientAnalysisSummary | null>(null);

  const currentScores = useMemo(
    () =>
      youcamScoresByType(
        parseYoucamMetrics(analysis.aiRawResponse as YoucamRawResponse | null),
      ),
    [analysis.aiRawResponse],
  );

  const previousScores = useMemo(
    () =>
      previous
        ? youcamScoresByType(
            parseYoucamMetrics(
              previous.aiRawResponse as YoucamRawResponse | null,
            ),
          )
        : {},
    [previous],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let list: PatientAnalysisSummary[] = [];
        try {
          list = await patientsService.listAnalyses(analysis.patientId);
        } catch {
          list = await analysesService.list();
        }
        const youcam = list
          .filter(
            (a) =>
              !!a.youcamTaskId &&
              a.isValid !== false &&
              a.id !== analysis.id,
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        if (!cancelled) setPrevious(youcam[0] ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysis.id, analysis.patientId]);

  const rows = YOUCAM_MAIN_METRIC_TYPES.filter(
    (type) => currentScores[type] != null || previousScores[type] != null,
  );

  return (
    <View style={styles.progressScreen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        messageCount={1}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
      <View style={styles.progressCard}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Pressable onPress={onBack} hitSlop={8}>
            <AppIcon
              icon={Icons.back}
              size={24}
              color={branding.colors.muted}
            />
          </Pressable>
          <Text style={styles.progressTitle}>Avance en la Salud de la Piel</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.toggleRow}>
          {(['horizontal', 'vertical'] as const).map((mode) => {
            const on = layout === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                onPress={() => setLayout(mode)}
              >
                <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
                  {mode === 'horizontal' ? 'Columnas' : 'Listado'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.toggleHint}>
          {layout === 'vertical'
            ? 'Listado: una métrica por fila con barras horizontales.'
            : 'Columnas: barras verticales; desliza a la derecha para ver más.'}
        </Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: branding.colors.primary },
              ]}
            />
            <Text style={styles.legendText}>Análisis actual</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#D1D5DB' }]} />
            <Text style={styles.legendText}>Último análisis</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={branding.colors.primary} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              layout === 'horizontal' ? styles.colChartScroll : undefined
            }
          >
            {!previous ? (
              <Text style={styles.note}>
                Aún no hay un análisis YouCam anterior para comparar. Se muestran
                solo las métricas del análisis actual.
              </Text>
            ) : null}

            {layout === 'vertical' ? (
              rows.map((type) => {
                const current = currentScores[type];
                const prev = previousScores[type];
                return (
                  <View key={type} style={styles.barRow}>
                    <Text style={styles.barLabel}>
                      {YOUCAM_METRIC_LABELS[type] ?? type}
                    </Text>
                    <View style={styles.barPair}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${current ?? 0}%`,
                              backgroundColor: branding.colors.primary,
                            },
                          ]}
                        />
                      </View>
                      {prev != null ? (
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${prev}%`,
                                backgroundColor: '#D1D5DB',
                              },
                            ]}
                          />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.barMeta}>
                      Actual: {current != null ? Math.round(current) : '—'}
                      {prev != null ? ` · Anterior: ${Math.round(prev)}` : ''}
                    </Text>
                  </View>
                );
              })
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colChartRow}
              >
                {rows.map((type) => {
                  const current = currentScores[type] ?? 0;
                  const prev = previousScores[type];
                  return (
                    <View key={type} style={styles.colItem}>
                      <Text style={styles.colValue}>
                        {Math.round(current)}
                        {prev != null ? `/${Math.round(prev)}` : ''}
                      </Text>
                      <View style={styles.colBars}>
                        <View style={styles.colBarTrack}>
                          <View
                            style={[
                              styles.colBarFill,
                              {
                                height: `${Math.max(4, current)}%`,
                                backgroundColor: branding.colors.primary,
                              },
                            ]}
                          />
                        </View>
                        {prev != null ? (
                          <View style={styles.colBarTrack}>
                            <View
                              style={[
                                styles.colBarFill,
                                {
                                  height: `${Math.max(4, prev)}%`,
                                  backgroundColor: '#D1D5DB',
                                },
                              ]}
                            />
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.colLabel} numberOfLines={2}>
                        {shortLabel(type)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
