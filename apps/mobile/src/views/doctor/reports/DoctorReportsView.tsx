import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ApiError } from '../../../services/api.client';
import { doctorReportsService } from '../../../services/doctor-reports.service';
import {
  formatDeltaValue,
  rangeForDays,
  sortCategories,
  type DoctorReportsFilters,
  type LifestyleReport,
  type LifestyleReportSection,
  type ReportDelta,
  type SkinHealthReport,
  type SkinReportCategory,
  type TopProblemsSort,
} from '../../../types/skin-report';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import {
  CategoryRankingBars,
  ScoreDistributionDonut,
  ScoreTrendChart,
  SegmentBars,
} from './components/ReportCharts';
import {
  createDoctorReportsStyles,
  type DoctorReportsStyles,
} from './styles/doctorReports.styles';

type ReportTab =
  | 'resumen'
  | 'necesidades'
  | 'top'
  | 'nacimiento'
  | 'mascotas'
  | 'actividad'
  | 'clinico';

const PRESETS = [
  { key: '30d', label: '30 días', days: 30, trendMonths: 3 },
  { key: '3m', label: '3 meses', days: 90, trendMonths: 3 },
  { key: '6m', label: '6 meses', days: 180, trendMonths: 6 },
  { key: '12m', label: '12 meses', days: 365, trendMonths: 12 },
] as const;

const SKIN_TABS: { key: ReportTab; label: string }[] = [
  { key: 'resumen', label: 'Resumen de salud de la piel' },
  { key: 'necesidades', label: 'Mapa de necesidades' },
  { key: 'top', label: 'Top problemas' },
];

const LIFESTYLE_TABS: { key: ReportTab; label: string }[] = [
  { key: 'nacimiento', label: 'Tipo de nacimiento' },
  { key: 'mascotas', label: 'Mascotas y salud de la piel' },
  { key: 'actividad', label: 'Actividad física y deporte' },
  { key: 'clinico', label: 'Análisis clínico IA' },
];

const SORT_OPTIONS: { value: TopProblemsSort; label: string }[] = [
  { value: 'score', label: 'Puntuación más baja' },
  { value: 'affected', label: 'Pacientes afectados' },
  { value: 'trend', label: 'Peor evolución' },
];

type DoctorReportsViewProps = {
  onBack: () => void;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

export function DoctorReportsView({
  onBack,
  onOpenMessages,
}: DoctorReportsViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createDoctorReportsStyles(branding.colors),
    [branding.colors],
  );
  const primary = branding.colors.primary;

  const [filters, setFilters] = useState<DoctorReportsFilters>(() => ({
    ...rangeForDays(180),
    trendMonths: 6,
  }));
  const [presetKey, setPresetKey] = useState<string>('6m');
  const [tab, setTab] = useState<ReportTab>('resumen');
  const [sort, setSort] = useState<TopProblemsSort>('score');
  const [report, setReport] = useState<SkinHealthReport | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestyleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [skin, life] = await Promise.all([
        doctorReportsService.getSkinHealth(filters),
        doctorReportsService.getLifestyle(filters).catch(() => null),
      ]);
      setReport(skin);
      setLifestyle(life);
    } catch (err) {
      setReport(null);
      setLifestyle(null);
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar los reportes.',
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPreset(days: number, trendMonths: number, key: string) {
    setPresetKey(key);
    setFilters((prev) => ({
      ...prev,
      ...rangeForDays(days),
      trendMonths,
    }));
  }

  const isEmpty = report != null && report.distributionTotal === 0;
  const isLifestyleTab =
    tab === 'nacimiento' ||
    tab === 'mascotas' ||
    tab === 'actividad' ||
    tab === 'clinico';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack
        onBack={onBack}
        onOpenMenu={onBack}
        onOpenMessages={onOpenMessages}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.title}>Reportes</Text>
          <Text style={styles.subtitle}>
            Analítica de salud de la piel de tus pacientes a partir de los
            análisis de piel con IA.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Periodo</Text>
          <View style={styles.filtersRow}>
            {PRESETS.map((p) => {
              const active = presetKey === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => applyPreset(p.days, p.trendMonths, p.key)}
                  style={[
                    styles.presetChip,
                    active && styles.presetChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      active && styles.presetChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.cardHint}>
            Desde {filters.from} · Hasta {filters.to}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <View style={[styles.tabsSegment, styles.tabsSegmentWrap]}>
            {SKIN_TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.tabsSegment, styles.tabsSegmentWrap]}>
            {LIFESTYLE_TABS.map((item) => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading && !report && !isLifestyleTab ? (
          <ActivityIndicator color={primary} style={{ marginTop: 24 }} />
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading && report ? <ActivityIndicator color={primary} /> : null}

        {report && isEmpty && !isLifestyleTab ? (
          <View style={styles.card}>
            <View style={styles.emptyWrap}>
              <AppIcon
                icon={Icons.chartBar}
                size={32}
                color={branding.colors.muted}
              />
              <Text style={styles.emptyTitle}>
                Aún no hay datos en este periodo
              </Text>
              <Text style={styles.emptyBody}>
                Estos reportes se construyen con los análisis de piel con IA.
                Amplía el rango de fechas o realiza un análisis para empezar a
                ver resultados.
              </Text>
            </View>
          </View>
        ) : null}

        {report && !isEmpty && tab === 'resumen' ? (
          <ResumenTab report={report} styles={styles} primary={primary} />
        ) : null}
        {report && !isEmpty && tab === 'necesidades' ? (
          <NeedsTab report={report} styles={styles} primary={primary} />
        ) : null}
        {report && !isEmpty && tab === 'top' ? (
          <TopTab
            report={report}
            styles={styles}
            sort={sort}
            onSortChange={setSort}
            primary={primary}
          />
        ) : null}

        {isLifestyleTab ? (
          <LifestyleTab
            section={
              tab === 'nacimiento'
                ? lifestyle?.birthType
                : tab === 'mascotas'
                  ? lifestyle?.pets
                  : tab === 'actividad'
                    ? lifestyle?.activity
                    : lifestyle?.clinicalAi
            }
            styles={styles}
            primary={primary}
            mode={tab === 'clinico' ? 'volume' : 'score'}
            loading={loading && !lifestyle}
            description={
              tab === 'nacimiento'
                ? 'Puntaje promedio de piel según tipo de nacimiento del paciente.'
                : tab === 'mascotas'
                  ? 'Relación entre mascotas en el hogar y el puntaje promedio de piel.'
                  : tab === 'actividad'
                    ? 'Puntaje promedio de piel según hábito de actividad física.'
                    : 'Volumen de análisis por proveedor clínico (Dermatológico, Estético, Fototipo).'
            }
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function KpiCard({
  styles,
  label,
  delta,
  decimals = 0,
  unit,
  hint,
}: {
  styles: DoctorReportsStyles;
  label: string;
  delta: ReportDelta;
  decimals?: number;
  unit?: 'pct' | 'years' | null;
  hint?: string;
}) {
  const value = formatDeltaValue(delta.current, { decimals, unit });
  const deltaText =
    delta.delta == null
      ? null
      : `${delta.delta > 0 ? '+' : ''}${formatDeltaValue(delta.delta, {
          decimals,
          unit: unit === 'pct' ? null : unit,
        })} vs anterior`;

  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text
        style={[styles.kpiValue, { fontSize: value.length > 8 ? 18 : 22 }]}
      >
        {value}
      </Text>
      {deltaText ? (
        <Text
          style={[
            styles.kpiDelta,
            {
              color:
                delta.delta == null
                  ? '#6B7280'
                  : delta.delta >= 0
                    ? '#16A34A'
                    : '#DC2626',
            },
          ]}
        >
          {deltaText}
        </Text>
      ) : null}
      {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
    </View>
  );
}

function HighlightCard({
  styles,
  label,
  name,
  score,
  tone,
}: {
  styles: DoctorReportsStyles;
  label: string;
  name: string | null;
  score: number | null;
  tone: 'good' | 'bad';
}) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text
        style={[
          styles.kpiValue,
          tone === 'bad' ? styles.highlightBad : styles.highlightGood,
          { fontSize: 16 },
        ]}
        numberOfLines={2}
      >
        {name ?? '—'}
      </Text>
      {score != null ? (
        <Text style={styles.kpiHint}>Puntaje promedio {score.toFixed(0)}</Text>
      ) : null}
    </View>
  );
}

function ResumenTab({
  report,
  styles,
  primary,
}: {
  report: SkinHealthReport;
  styles: DoctorReportsStyles;
  primary: string;
}) {
  const { kpis } = report;
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.kpiGrid}>
        <KpiCard
          styles={styles}
          label="Pacientes analizados"
          delta={kpis.patientsAnalyzed}
        />
        <KpiCard
          styles={styles}
          label="Análisis realizados"
          delta={kpis.analyses}
        />
        <KpiCard
          styles={styles}
          label="Puntaje promedio de piel"
          delta={kpis.averageScore}
          decimals={1}
        />
        <KpiCard
          styles={styles}
          label="Edad promedio de piel"
          delta={kpis.averageSkinAge}
          decimals={1}
        />
        <KpiCard
          styles={styles}
          label="Diferencia edad de piel vs real"
          delta={kpis.skinAgeDifference}
          decimals={1}
          unit="years"
          hint="Requiere fecha de nacimiento del paciente"
        />
        <KpiCard
          styles={styles}
          label="Pacientes en estado crítico"
          delta={kpis.criticalPatientsPct}
          decimals={0}
          unit="pct"
        />
        <HighlightCard
          styles={styles}
          label="Categoría más comprometida"
          name={kpis.worstCategory?.label ?? null}
          score={kpis.worstCategory?.avgScore ?? null}
          tone="bad"
        />
        <HighlightCard
          styles={styles}
          label="Categoría con mejor resultado"
          name={kpis.bestCategory?.label ?? null}
          score={kpis.bestCategory?.avgScore ?? null}
          tone="good"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Distribución de puntajes de piel</Text>
        <Text style={styles.cardHint}>
          {report.distributionTotal} análisis clasificados según puntuación
          global.
        </Text>
        <ScoreDistributionDonut
          slices={report.distribution}
          total={report.distributionTotal}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evolución del puntaje promedio</Text>
        <Text style={styles.cardHint}>
          Últimos {report.range.trendMonths} meses.
        </Text>
        <ScoreTrendChart points={report.scoreTrend} primaryColor={primary} />
      </View>

      <Text style={styles.footerNote}>
        Un paciente se considera en estado crítico cuando alguna categoría baja
        de 50 puntos. Porcentajes calculados sobre {kpis.metricPatients}{' '}
        {kpis.metricPatients === 1 ? 'paciente' : 'pacientes'} con mediciones en
        el periodo.
      </Text>
    </View>
  );
}

function CategoryDetail({
  styles,
  category,
}: {
  styles: DoctorReportsStyles;
  category: SkinReportCategory | null;
}) {
  if (!category) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{category.label}</Text>
      <Text style={styles.cardHint}>
        {category.patients} pacientes · {category.patientsAffected} afectados (
        {category.affectedPct.toFixed(0)}%) · candidatos protocolo{' '}
        {category.candidatePct.toFixed(0)}%
      </Text>
      <Text style={styles.kpiValue}>
        {category.avgScore != null ? category.avgScore.toFixed(1) : '—'} pts
      </Text>
      <ScoreTrendChart
        points={category.trend.map((p) => ({
          period: p.period,
          avgScore: p.avgScore,
          analyses: 0,
        }))}
        emptyMessage="Sin evolución para esta categoría."
      />
    </View>
  );
}

function NeedsTab({
  report,
  styles,
}: {
  report: SkinHealthReport;
  styles: DoctorReportsStyles;
  primary: string;
}) {
  const needs = report.categories.slice(0, 10);
  const strengths = report.categories.slice(-5).reverse();
  const [selectedKey, setSelectedKey] = useState<string | null>(
    needs[0]?.key ?? null,
  );
  const selected =
    report.categories.find((c) => c.key === selectedKey) ?? null;

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Necesidades prioritarias</Text>
        <Text style={styles.cardHint}>
          Categorías con menor puntaje promedio: las que requieren mayor
          atención.
        </Text>
        <CategoryRankingBars
          categories={needs}
          variant="needs"
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fortalezas de la piel</Text>
        <Text style={styles.cardHint}>
          Categorías con mejores puntajes promedio.
        </Text>
        <CategoryRankingBars
          categories={strengths}
          variant="strengths"
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      </View>
      <CategoryDetail styles={styles} category={selected} />
    </View>
  );
}

function TopTab({
  report,
  styles,
  sort,
  onSortChange,
  primary,
}: {
  report: SkinHealthReport;
  styles: DoctorReportsStyles;
  sort: TopProblemsSort;
  onSortChange: (s: TopProblemsSort) => void;
  primary: string;
}) {
  const rows = sortCategories(report.categories, sort).slice(0, 10);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Top problemas</Text>
      <Text style={styles.cardHint}>
        Categorías que más necesitan intervención según el criterio elegido.
      </Text>
      <View style={styles.filtersRow}>
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSortChange(opt.value)}
              style={[
                styles.presetChip,
                active && {
                  borderColor: primary,
                  backgroundColor: primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetChipText,
                  active && styles.presetChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <CategoryRankingBars categories={rows} variant="needs" />
      <View style={{ gap: 6, marginTop: 4 }}>
        {rows.map((c) => (
          <Text key={c.key} style={styles.categoryMeta}>
            {c.label}: {c.patientsAffected}/{c.patients} afectados (
            {c.affectedPct.toFixed(0)}%)
            {c.trendDelta == null
              ? ''
              : ` · evol. ${c.trendDelta > 0 ? '+' : ''}${c.trendDelta.toFixed(1)}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

function LifestyleTab({
  section,
  styles,
  primary,
  mode,
  loading,
  description,
}: {
  section: LifestyleReportSection | undefined;
  styles: DoctorReportsStyles;
  primary: string;
  mode: 'score' | 'volume';
  loading: boolean;
  description: string;
}) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }
  if (!section) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyBody}>
          No se pudo cargar este reporte. Verifica que la API tenga el endpoint
          de lifestyle desplegado.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{section.title}</Text>
      <Text style={styles.cardHint}>{description}</Text>
      <SegmentBars
        segments={section.segments}
        valueKey={mode === 'score' ? 'avgScore' : 'pct'}
        barColor={primary}
      />
      {section.segments.length > 0 ? (
        <View style={{ gap: 4, marginTop: 8 }}>
          {section.segments.map((s) => (
            <Text key={s.key} style={styles.categoryMeta}>
              {s.label}: {s.patients} pacientes ({s.pct.toFixed(0)}%)
              {s.analyses != null ? ` · ${s.analyses} análisis` : ''}
              {s.avgScore != null
                ? ` · puntaje ${s.avgScore.toFixed(0)}`
                : ''}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyBody}>
          Sin datos en el periodo. Completa el perfil de pacientes (nacimiento,
          mascotas, actividad) o realiza análisis para ver resultados.
        </Text>
      )}
    </View>
  );
}
