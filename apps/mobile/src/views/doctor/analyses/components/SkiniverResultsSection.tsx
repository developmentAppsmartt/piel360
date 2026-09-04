import { useMemo, useState, type ReactNode } from 'react';
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
import {
  extractSkiniverSupportDiagnoses,
  normalizedProb,
  parseSkiniverDescription,
} from '../../../../types/analysis';
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

/** Une campos ya parseados + re-parse de `description` por si el item llega crudo. */
function enrichCandidate(
  item: SkiniverDiagnosisCandidate,
): SkiniverDiagnosisCandidate {
  if (
    item.riskEvaluation &&
    item.preciseDiagnosis &&
    item.treatment &&
    item.advice
  ) {
    return item;
  }
  const parsed = parseSkiniverDescription(item.description);
  if (!parsed) return item;
  return {
    ...item,
    riskEvaluation: item.riskEvaluation || parsed.riskEvaluation || undefined,
    conclusionText: item.conclusionText || parsed.conclusionText || undefined,
    preciseDiagnosis:
      item.preciseDiagnosis || parsed.preciseDiagnosis || undefined,
    treatment: item.treatment || parsed.treatment || undefined,
    advice: item.advice || parsed.advice || undefined,
  };
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
  const safeProb = Number.isFinite(prob)
    ? Math.max(0, Math.min(100, prob))
    : 0;
  const offset = c * (1 - safeProb / 100);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="#E5E7EB"
          strokeWidth={String(stroke)}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={String(stroke)}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: '#374151',
        }}
      >
        {safeProb.toFixed(1).replace('.', ',')}
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
  detailFooter?: ReactNode;
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

  const extracted = useMemo(
    () =>
      extractSkiniverSupportDiagnoses(
        analysis.aiRawResponse as SkiniverRawResponse | null,
        3,
      ),
    [analysis.aiRawResponse],
  );

  const riskLabel =
    extracted.riskLabel !== '—'
      ? extracted.riskLabel
      : analysis.aiDiagnosis ?? '—';
  const gaugePercent = (() => {
    const raw = extracted.highRiskProb || analysis.aiProbability || 0;
    return raw <= 1 ? raw * 100 : raw;
  })();

  const list = extracted.items;

  const [internalView, setInternalView] = useState<'stats' | 'detail'>('stats');
  const view = viewProp ?? internalView;
  function setView(next: 'stats' | 'detail') {
    onViewChange?.(next);
    if (viewProp === undefined) setInternalView(next);
  }

  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const [storyOpen, setStoryOpen] = useState(false);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  const active = useMemo(() => {
    const base =
      (selectedClass
        ? list.find((item) => item.class === selectedClass)
        : null) ??
      list[0] ??
      null;
    return base ? enrichCandidate(base) : null;
  }, [list, selectedClass]);

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

  const conclusionLine =
    active?.conclusionText ||
    (active?.desease
      ? activeProb != null
        ? `${activeProb}% ${active.desease}`
        : active.desease
      : null);

  const rootCode =
    typeof extracted.prediction?.lesion_code === 'string'
      ? extracted.prediction.lesion_code
      : undefined;
  const isPrimaryDiagnosis =
    !!active &&
    (!!extracted.prediction?.class
      ? active.class === extracted.prediction.class
      : list[0]?.class === active.class);
  const icdCode = active?.lesion_code || (isPrimaryDiagnosis ? rootCode : undefined);

  function openDetail(item: SkiniverDiagnosisCandidate) {
    setSelectedClass(item.class);
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
    const riskEvalText = active.riskEvaluation?.trim();
    const hasAdviceBlock = Boolean(
      conclusionLine ||
        active.preciseDiagnosis ||
        active.treatment ||
        active.advice,
    );

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
            size={22}
            color={branding.colors.primary}
          />
          <View style={styles.infoRowBody}>
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
          <AppIcon icon={Icons.alertCircle} size={22} color={banner.text} />
          <View style={styles.infoRowBody}>
            <Text style={[styles.infoRowValue, { color: banner.text }]}>
              Nivel de Riesgo: {active.risk || riskLabel}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.infoRow}
          onPress={() => openEncyclopedia(active)}
        >
          <AppIcon
            icon={Icons.information}
            size={22}
            color={branding.colors.primary}
          />
          <View style={styles.infoRowBody}>
            <Text style={styles.infoRowValue}>
              {displayDiagnosis}
              {!analysis.finalDiagnosis && activeProb != null
                ? `: ${activeProb} %`
                : ''}
            </Text>
            <Text style={styles.diagnosisSub}>
              {icdCode
                ? `Codigo ICD: ${icdCode}`
                : 'Codigo ICD: no disponible'}
            </Text>
          </View>
          <View style={styles.diagnosisChevronBtn}>
            <AppIcon icon={Icons.chevronRight} size={16} color="#FFFFFF" />
          </View>
        </Pressable>

        {bodyLabel ? (
          <View style={styles.infoRow}>
            <AppIcon
              icon={Icons.account}
              size={22}
              color={branding.colors.primary}
            />
            <View style={styles.infoRowBody}>
              <Text style={styles.infoRowValue}>Region del Cuerpo</Text>
              <Text style={styles.diagnosisSub}>{bodyLabel}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.descBox}>
          <Text style={styles.descTitle}>Decripcion:</Text>
          {riskEvalText ? (
            <Text style={styles.descBody}>
              Evaluacion de Riesgos: {riskEvalText}
            </Text>
          ) : (
            <Text style={styles.missingNote}>
              Sin evaluación de riesgos en la respuesta.
            </Text>
          )}

          {hasAdviceBlock ? (
            <View style={[styles.conclusionBox, { marginTop: 14 }]}>
              <AppIcon
                icon={Icons.account}
                size={20}
                color={branding.colors.primary}
              />
              <View style={{ flex: 1, gap: 6 }}>
                {conclusionLine ? (
                  <Text style={styles.conclusionText}>
                    Conclusion: {conclusionLine}
                  </Text>
                ) : null}
                {active.preciseDiagnosis ? (
                  <Text style={styles.descBody}>
                    Diagnóstico preciso: {active.preciseDiagnosis}
                  </Text>
                ) : null}
                {active.treatment ? (
                  <Text style={styles.descBody}>
                    Tratamiento: {active.treatment}
                  </Text>
                ) : null}
                {active.advice ? (
                  <Text style={styles.descBody}>
                    Consejo: {active.advice}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
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
