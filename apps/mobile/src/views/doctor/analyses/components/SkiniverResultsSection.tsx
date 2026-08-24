import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { BODY_PARTS_INFO } from '../../../../data/bodyRegions';
import { ApiError } from '../../../../services/api.client';
import {
  encyclopediaService,
  stripHtml,
} from '../../../../services/encyclopedia.service';
import type {
  AnalysisDetail,
  SkiniverDiagnosisCandidate,
  SkiniverRawResponse,
} from '../../../../types/analysis';
import { normalizedProb, parseSkiniverPrediction } from '../../../../types/analysis';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';
import { AnalysisImageCarousel } from './AnalysisImageCarousel';
import { SkiniverRiskGauge } from './SkiniverRiskGauge';

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#EAB308',
  high: '#ef4444',
};

function riskBannerColors(risk: string): {
  bg: string;
  border: string;
  text: string;
} {
  const key = risk.toLowerCase();
  if (key.includes('alto') || key.includes('high')) {
    return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' };
  }
  if (key.includes('bajo') || key.includes('low')) {
    return { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' };
  }
  return { bg: '#FFFBEB', border: '#FDE68A', text: '#A16207' };
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}${mm}${yyyy} ${hh}:${min}`;
}

function DonutProb({
  prob,
  color,
}: {
  prob: number;
  color: string;
}) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, prob)) / 100;
  const offset = c * (1 - pct);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#E5E7EB"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: '#374151',
        }}
      >
        {prob.toFixed(1).replace('.', ',')}
      </Text>
    </View>
  );
}

function DiagnosisStatCard({
  item,
  onPress,
  styles,
}: {
  item: SkiniverDiagnosisCandidate;
  onPress: () => void;
  styles: ReturnType<typeof createAnalysisDetailStyles>;
}) {
  const prob = normalizedProb(item.prob);
  const color = RISK_COLORS[item.risk_level ?? ''] ?? RISK_COLORS.medium;

  return (
    <Pressable style={styles.diagnosisCard} onPress={onPress}>
      <DonutProb prob={prob} color={color} />
      <View style={styles.diagnosisBody}>
        <Text style={styles.diagnosisTitle} numberOfLines={2}>
          {item.class}
        </Text>
        {item.desease ? (
          <Text style={styles.diagnosisSub} numberOfLines={1}>
            {item.desease}
          </Text>
        ) : null}
      </View>
      <View style={styles.diagnosisChevronBtn}>
        <AppIcon icon={Icons.chevronRight} size={18} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

type SkiniverResultsSectionProps = {
  analysis: AnalysisDetail;
  /** Pie de la vista detalle (confirmar / corregir). */
  detailFooter?: ReactNode;
  /** Vista controlada desde el padre (para el botón Volver del header). */
  view?: 'stats' | 'detail';
  onViewChange?: (view: 'stats' | 'detail') => void;
};

export function SkiniverResultsSection({
  analysis,
  detailFooter,
  view: viewProp,
  onViewChange,
}: SkiniverResultsSectionProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const prediction = parseSkiniverPrediction(
    analysis.aiRawResponse as SkiniverRawResponse | null,
  );

  const riskLabel = prediction?.risk ?? analysis.aiDiagnosis ?? '—';
  const gaugePercent = (() => {
    const raw = prediction?.high_risk_prob ?? analysis.aiProbability ?? 0;
    return raw <= 1 ? raw * 100 : raw;
  })();

  const topn = Array.isArray(prediction?.topn) ? prediction.topn : [];
  const fallbackTop: SkiniverDiagnosisCandidate | null = prediction?.class
    ? {
        class: prediction.class,
        prob: prediction.prob ?? analysis.aiProbability ?? 0,
        risk: prediction.risk ?? '—',
        desease: undefined,
        atlas_page_link: undefined,
      }
    : null;
  const list = topn.length > 0 ? topn : fallbackTop ? [fallbackTop] : [];

  const [internalView, setInternalView] = useState<'stats' | 'detail'>('stats');
  const view = viewProp ?? internalView;
  function setView(next: 'stats' | 'detail') {
    onViewChange?.(next);
    if (viewProp === undefined) setInternalView(next);
  }

  const [selected, setSelected] = useState<SkiniverDiagnosisCandidate | null>(
    null,
  );

  const [storyOpen, setStoryOpen] = useState(false);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  const [descLoading, setDescLoading] = useState(false);
  const [description, setDescription] = useState<string | null>(null);

  const active = selected ?? list[0] ?? null;
  const displayDiagnosis =
    analysis.finalDiagnosis?.trim() ||
    active?.class ||
    analysis.aiDiagnosis ||
    'Sin diagnóstico';
  const banner = riskBannerColors(String(active?.risk ?? riskLabel));
  const bodyLabel = analysis.bodyRegion
    ? BODY_PARTS_INFO[analysis.bodyRegion]?.label ?? analysis.bodyRegion
    : null;
  const activeProb =
    active != null ? Math.round(normalizedProb(active.prob)) : null;

  useEffect(() => {
    let cancelled = false;
    const link = active?.atlas_page_link;
    if (!link || view !== 'detail') {
      setDescription(null);
      return;
    }
    setDescLoading(true);
    (async () => {
      try {
        const entry = await encyclopediaService.getByUrl(link);
        if (!cancelled) {
          setDescription(
            entry?.content ? stripHtml(entry.content).slice(0, 900) : null,
          );
        }
      } catch {
        if (!cancelled) setDescription(null);
      } finally {
        if (!cancelled) setDescLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active?.atlas_page_link, view]);

  function openDetail(item: SkiniverDiagnosisCandidate) {
    setSelected(item);
    setView('detail');
  }

  async function openEncyclopedia(item: SkiniverDiagnosisCandidate) {
    setStoryOpen(true);
    setStoryTitle(item.class);
    setStoryText(null);
    setStoryError(null);
    if (!item.atlas_page_link) {
      setStoryError('No hay artículo de enciclopedia asociado.');
      return;
    }
    setStoryLoading(true);
    try {
      const entry = await encyclopediaService.getByUrl(item.atlas_page_link);
      if (!entry?.content) {
        setStoryError('La historia aún no está disponible.');
        return;
      }
      setStoryTitle(entry.title ?? item.class);
      setStoryText(stripHtml(entry.content));
    } catch (err) {
      setStoryError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la historia.',
      );
    } finally {
      setStoryLoading(false);
    }
  }

  if (view === 'detail' && active) {
    return (
      <View style={styles.skiniverBlock}>
        <Pressable
          style={styles.backToStats}
          onPress={() => setView('stats')}
          accessibilityLabel="Volver a estadísticas"
        >
          <AppIcon
            icon={Icons.back}
            size={18}
            color={branding.colors.primary}
          />
          <Text style={styles.backToStatsText}>Estadísticas</Text>
        </Pressable>

        <Text style={styles.resultHeroTitle}>Resultado Piel 360 AI</Text>

        <View style={styles.resultMetaBar}>
          <Text style={styles.resultMetaId}>ID # {analysis.id}</Text>
        </View>

        <AnalysisImageCarousel
          images={[
            { label: 'Original', url: analysis.imageUrl },
            { label: 'Coloreada', url: analysis.coloredUrl },
            { label: 'Máscara', url: analysis.maskedUrl },
          ]}
        />

        <View style={styles.infoRow}>
          <AppIcon
            icon={Icons.calendarClock}
            size={20}
            color={branding.colors.muted}
          />
          <View style={styles.infoRowBody}>
            <Text style={styles.infoRowLabel}>Fecha</Text>
            <Text style={styles.infoRowValue}>
              {formatStamp(analysis.createdAt)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.infoRow,
            { backgroundColor: banner.bg, borderColor: banner.border },
          ]}
        >
          <AppIcon icon={Icons.alertCircle} size={20} color={banner.text} />
          <View style={styles.infoRowBody}>
            <Text style={[styles.infoRowLabel, { color: banner.text }]}>
              Nivel de riesgo
            </Text>
            <Text style={[styles.infoRowValue, { color: banner.text }]}>
              {active.risk || riskLabel}
            </Text>
          </View>
        </View>

        <Pressable style={styles.infoRow} onPress={() => openEncyclopedia(active)}>
          <AppIcon
            icon={Icons.document}
            size={20}
            color={branding.colors.primary}
          />
          <View style={styles.infoRowBody}>
            <Text style={styles.infoRowLabel}>
              {analysis.isCorrected ? 'Diagnóstico corregido' : 'Diagnóstico'}
            </Text>
            <Text style={styles.infoRowValue}>
              {displayDiagnosis}
              {!analysis.finalDiagnosis && activeProb != null
                ? `: ${activeProb}%`
                : ''}
            </Text>
            {active?.desease && !analysis.finalDiagnosis ? (
              <Text style={styles.diagnosisSub}>{active.desease}</Text>
            ) : null}
            <Text style={styles.missingNote}>
              Código ICD: no disponible en la respuesta actual.
            </Text>
          </View>
          <AppIcon
            icon={Icons.chevronRight}
            size={18}
            color={branding.colors.muted}
          />
        </Pressable>

        {bodyLabel ? (
          <View style={styles.infoRow}>
            <AppIcon
              icon={Icons.mapMarker}
              size={20}
              color={branding.colors.muted}
            />
            <View style={styles.infoRowBody}>
              <Text style={styles.infoRowLabel}>Región del cuerpo</Text>
              <Text style={styles.infoRowValue}>{bodyLabel}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.descBox}>
          <Text style={styles.descTitle}>Descripción</Text>
          {descLoading ? (
            <ActivityIndicator color={branding.colors.primary} />
          ) : description ? (
            <Text style={styles.descBody}>{description}</Text>
          ) : (
            <Text style={styles.missingNote}>
              Sin descripción estructurada. Se usa la enciclopedia si hay enlace
              disponible.
            </Text>
          )}
        </View>

        <View style={styles.conclusionBox}>
          <AppIcon
            icon={Icons.account}
            size={18}
            color={branding.colors.primary}
          />
          <Text style={styles.conclusionText}>
            Conclusión
            {activeProb != null && !analysis.finalDiagnosis
              ? `: ${activeProb}% `
              : ': '}
            {displayDiagnosis}
          </Text>
        </View>

        <View style={styles.descBox}>
          <Text style={styles.descTitle}>
            Diagnóstico preciso · Tratamiento · Consejo
          </Text>
          <Text style={styles.missingNote}>
            Estos campos aún no llegan en el análisis. El equipo de backend debe
            enviarlos en la respuesta para mostrarlos aquí.
          </Text>
        </View>

        <View style={styles.observationsBox}>
          <Text style={styles.observationsLabel}>Observaciones</Text>
          <Text style={styles.observationsText}>
            {analysis.doctorNotes?.trim()
              ? analysis.doctorNotes
              : 'Sin observaciones del médico todavía.'}
          </Text>
        </View>

        {detailFooter}

        <Modal
          visible={storyOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setStoryOpen(false)}
        >
          <View style={styles.storyModalBackdrop}>
            <View style={styles.storyModalCard}>
              <View style={styles.storyModalHeader}>
                <Text style={styles.storyModalTitle} numberOfLines={2}>
                  {storyTitle ?? 'Historia'}
                </Text>
                <Pressable
                  style={styles.roundBtn}
                  onPress={() => setStoryOpen(false)}
                >
                  <AppIcon
                    icon={Icons.close}
                    size={18}
                    color={branding.colors.muted}
                  />
                </Pressable>
              </View>
              <ScrollView
                style={styles.storyScroll}
                contentContainerStyle={styles.storyScrollContent}
              >
                {storyLoading ? (
                  <ActivityIndicator color={branding.colors.primary} />
                ) : storyError ? (
                  <Text style={styles.note}>{storyError}</Text>
                ) : storyText ? (
                  <Text style={styles.storyBody}>{storyText}</Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.skiniverBlock}>
      <Text style={styles.resultHeroTitle}>Resultado Piel 360 AI</Text>

      <SkiniverRiskGauge percent={gaugePercent} riskLabel={String(riskLabel)} />

      {list.length > 0 ? (
        <>
          <Text style={styles.supportTitle}>
            Elija una opción de los diagnósticos de apoyo
          </Text>
          {list.map((item, index) => (
            <DiagnosisStatCard
              key={`${item.class}-${index}`}
              item={item}
              styles={styles}
              onPress={() => openDetail(item)}
            />
          ))}
          <Pressable onPress={() => list[0] && openDetail(list[0])}>
            <Text style={styles.supportLink}>Seleccionar de la lista</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.note}>No hay diagnósticos disponibles.</Text>
      )}

      <Text style={styles.disclaimer}>
        La IA solo cubre algunas enfermedades y es una ayuda diagnóstica. Consulta
        siempre a un dermatólogo.
      </Text>
      <Text style={styles.supportLink}>Ver acuerdo de usuario</Text>
    </View>
  );
}
