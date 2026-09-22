import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
  formatClassProbPercent,
  normalizedProb,
  parseSkiniverDescription,
} from '../../../../types/analysis';
import { createAnalysisDetailStyles } from '../styles/analysisDetail.styles';
import { AnalysisImageCarousel } from './AnalysisImageCarousel';
import { BodyRegionViewer } from './BodyRegionViewer';
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

/** Une campos de texto libre del ítem sin pisar el `class`/`prob` propios. */
function enrichCandidate(
  item: SkiniverDiagnosisCandidate,
): SkiniverDiagnosisCandidate {
  const parsed = parseSkiniverDescription(item.description);
  if (!parsed) {
    return { ...item, conclusionText: undefined };
  }

  const precise = parsed.preciseDiagnosis?.trim();
  const preciseMatchesClass =
    !!precise &&
    (precise.toLowerCase() === item.class.toLowerCase() ||
      item.class.toLowerCase().includes(precise.toLowerCase()) ||
      precise.toLowerCase().includes(item.class.toLowerCase()));

  // Si el description no es de esta clase, no enriquecer con sus textos.
  if (precise && !preciseMatchesClass) {
    return {
      ...item,
      conclusionText: undefined,
      preciseDiagnosis: undefined,
      riskEvaluation: item.riskEvaluation,
      treatment: item.treatment,
      advice: item.advice,
    };
  }

  return {
    ...item,
    riskEvaluation: item.riskEvaluation || parsed.riskEvaluation || undefined,
    conclusionText: undefined,
    preciseDiagnosis: preciseMatchesClass ? precise : item.preciseDiagnosis,
    treatment: item.treatment || parsed.treatment || undefined,
    advice: item.advice || parsed.advice || undefined,
  };
}

function DonutProb({
  prob,
  color,
}: {
  prob: number | string | null | undefined;
  color: string;
}) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safeProb = normalizedProb(prob);
  const clamped = Math.max(0, Math.min(100, safeProb));
  const offset = c * (1 - clamped / 100);
  const cx = size / 2;
  const cy = size / 2;
  const label = formatClassProbPercent(clamped);

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
        {label}
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
  const icdLabel = item.lesion_code?.trim()
    ? `Codigo ICD: ${item.lesion_code.trim()}`
    : null;

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
        {icdLabel ? (
          <Text style={styles.diagnosisSub} numberOfLines={1}>
            {icdLabel}
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
  patientGender?: string | null;
  detailFooter?: ReactNode;
  view?: 'stats' | 'detail';
  onViewChange?: (view: 'stats' | 'detail') => void;
  /** Candidato de apoyo seleccionado (controlado por el padre para no perderlo). */
  selectedCandidate?: SkiniverDiagnosisCandidate | null;
  onSelectedCandidateChange?: (
    candidate: SkiniverDiagnosisCandidate | null,
  ) => void;
  observationsEditing?: boolean;
  observationsValue?: string;
  onObservationsChange?: (value: string) => void;
  onSaveObservations?: () => void;
  observationsSaving?: boolean;
  selectedNosology?: string | null;
  onPickNosology?: () => void;
};

export function SkiniverResultsSection({
  analysis,
  patientGender,
  detailFooter,
  view: viewProp,
  onViewChange,
  selectedCandidate: selectedCandidateProp,
  onSelectedCandidateChange,
  observationsEditing = false,
  observationsValue = '',
  onObservationsChange,
  onSaveObservations,
  observationsSaving = false,
  selectedNosology = null,
  onPickNosology,
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

  const gaugePercent = extracted.hasHighRiskProb
    ? extracted.highRiskProb
    : 0;

  const list = extracted.items;

  const [internalView, setInternalView] = useState<'stats' | 'detail'>('stats');
  const view = viewProp ?? internalView;
  function setView(next: 'stats' | 'detail') {
    onViewChange?.(next);
    if (viewProp === undefined) setInternalView(next);
  }

  const [internalSelected, setInternalSelected] =
    useState<SkiniverDiagnosisCandidate | null>(null);
  const selectedCandidate =
    selectedCandidateProp !== undefined
      ? selectedCandidateProp
      : internalSelected;

  function setSelectedCandidate(next: SkiniverDiagnosisCandidate | null) {
    onSelectedCandidateChange?.(next);
    if (selectedCandidateProp === undefined) setInternalSelected(next);
  }

  const [bodyOpen, setBodyOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);

  // Snapshot del ítem tocado: class/prob/desease de ESE topn (nunca el top-1).
  const active = useMemo(
    () => (selectedCandidate ? enrichCandidate(selectedCandidate) : null),
    [selectedCandidate],
  );

  // Nombre congelado del candidato seleccionado — jamás aiDiagnosis/finalDiagnosis.
  const displayDiagnosis = (
    selectedCandidate?.class ||
    active?.class ||
    ''
  ).trim() || 'Sin diagnóstico';
  const banner = riskBannerColors(String(active?.risk ?? riskLabel));
  const bodyLabel = analysis.bodyRegion
    ? BODY_PARTS_INFO[analysis.bodyRegion]?.label ?? analysis.bodyRegion
    : null;
  const classProb = selectedCandidate?.prob ?? active?.prob;
  const activeProbLabel =
    classProb != null ? formatClassProbPercent(classProb) : null;

  const conclusionLine =
    (selectedCandidate?.desease || active?.desease) && activeProbLabel
      ? `${activeProbLabel}% ${selectedCandidate?.desease || active?.desease}`
      : selectedCandidate?.desease || active?.desease || null;

  const rootCode =
    typeof extracted.prediction?.lesion_code === 'string'
      ? extracted.prediction.lesion_code
      : undefined;
  const rootClass = extracted.prediction?.class?.trim();
  const isPrimaryDiagnosis =
    !!displayDiagnosis &&
    !!rootClass &&
    displayDiagnosis.toLowerCase() === rootClass.toLowerCase();
  const icdCode =
    selectedCandidate?.lesion_code ||
    active?.lesion_code ||
    (isPrimaryDiagnosis ? rootCode : undefined);

  function openDetail(item: SkiniverDiagnosisCandidate) {
    // Congelar campos de ESTA clase (evaluación propia, no la del top-1).
    const snapshot: SkiniverDiagnosisCandidate = {
      class: String(item.class ?? '').trim(),
      class_raw: item.class_raw,
      prob: Number(item.prob) || 0,
      risk: item.risk,
      risk_level: item.risk_level,
      desease: item.desease,
      lesion_code: item.lesion_code,
      atlas_page_link: item.atlas_page_link,
      description: item.description,
      riskEvaluation: item.riskEvaluation,
      preciseDiagnosis: item.preciseDiagnosis,
      conclusionText: undefined,
      treatment: item.treatment,
      advice: item.advice,
    };
    setSelectedCandidate(snapshot);
    setView('detail');
  }

  function backToStats() {
    setView('stats');
    setSelectedCandidate(null);
  }

  function atlasUrlFor(item: SkiniverDiagnosisCandidate): string | null {
    const fromItem = item.atlas_page_link?.trim();
    if (fromItem) return fromItem;
    const root = extracted.prediction?.atlas_page_link?.trim();
    if (!root) return null;
    const rootClass = extracted.prediction?.class?.trim();
    if (!rootClass || item.class === rootClass || item.class === displayDiagnosis) {
      return root;
    }
    return null;
  }

  async function openEncyclopedia(item: SkiniverDiagnosisCandidate) {
    const atlasUrl = atlasUrlFor(item);
    setStoryOpen(true);
    setStoryTitle(item.class);
    setStoryText(null);
    setStoryError(null);
    if (!atlasUrl) {
      setStoryError('No hay artículo de atlas asociado a este diagnóstico.');
      return;
    }
    setStoryLoading(true);
    try {
      const entry = await encyclopediaService.getByUrl(atlasUrl);
      if (entry?.content) {
        setStoryTitle(entry.title ?? item.class);
        setStoryText(stripHtml(entry.content));
        return;
      }
      const spanishUrl = atlasUrl
        .replace('skinive.ru/', 'skinive.com/es/')
        .replace('skinive.com/ru/', 'skinive.com/es/');
      const opened = await Linking.openURL(spanishUrl).then(
        () => true,
        () => false,
      );
      if (!opened) {
        setStoryError('El artículo del atlas aún no está disponible.');
        return;
      }
      setStoryOpen(false);
    } catch (err) {
      setStoryError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el atlas del diagnóstico.',
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
          onPress={backToStats}
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
              {activeProbLabel
                ? `${displayDiagnosis} ${activeProbLabel}%`
                : displayDiagnosis}
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
          <Pressable
            style={styles.infoRow}
            onPress={() => setBodyOpen(true)}
            accessibilityLabel={`Ver ${bodyLabel} en la figura humana`}
          >
            <AppIcon
              icon={Icons.account}
              size={22}
              color={branding.colors.primary}
            />
            <View style={styles.infoRowBody}>
              <Text style={styles.infoRowValue}>Region del Cuerpo</Text>
              <Text style={styles.diagnosisSub}>{bodyLabel}</Text>
            </View>
            <View style={styles.diagnosisChevronBtn}>
              <AppIcon icon={Icons.chevronRight} size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        ) : null}

        <View style={styles.descBox}>
          <Text style={styles.descTitle}>Descripción:</Text>
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
          {observationsEditing ? (
            <>
              <Pressable
                style={styles.nosologyPickBtn}
                onPress={onPickNosology}
                disabled={observationsSaving}
              >
                <Text style={styles.nosologyPickLabel}>Nosología</Text>
                <Text style={styles.nosologyPickValue} numberOfLines={2}>
                  {selectedNosology?.trim()
                    ? selectedNosology
                    : 'Seleccionar nosología'}
                </Text>
              </Pressable>
              <TextInput
                style={styles.observationsInput}
                value={observationsValue}
                onChangeText={onObservationsChange}
                placeholder="Describe el diagnóstico del médico"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                editable={!observationsSaving}
              />
              <Pressable
                style={[
                  styles.confirmPrimaryBtn,
                  observationsSaving && styles.confirmBtnDisabled,
                ]}
                onPress={onSaveObservations}
                disabled={observationsSaving}
              >
                {observationsSaving ? (
                  <ActivityIndicator color={branding.colors.textOnDark} />
                ) : (
                  <Text style={styles.confirmPrimaryText}>
                    Guardar diagnóstico
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <Text style={styles.observationsText}>
              {analysis.doctorNotes?.trim()
                ? analysis.doctorNotes
                : 'Sin observaciones del médico todavía.'}
            </Text>
          )}
        </View>

        {detailFooter}

        <BodyRegionViewer
          visible={bodyOpen}
          bodyRegion={analysis.bodyRegion}
          label={bodyLabel}
          gender={patientGender ?? analysis.patient?.gender}
          xCoord={analysis.xCoord}
          yCoord={analysis.yCoord}
          zCoord={analysis.zCoord}
          onClose={() => setBodyOpen(false)}
        />

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

      <Text style={styles.gaugeSectionTitle}>Indicador de riesgo general</Text>
      <SkiniverRiskGauge percent={gaugePercent} riskLabel={String(riskLabel)} />

      {list.length > 0 ? (
        <>
          <Text style={styles.supportTitle}>
            Elija una opción de los diagnósticos de apoyo
          </Text>
          {list.map((item, index) => (
            <DiagnosisStatCard
              key={`${item.class}-${item.class_raw ?? index}-${index}`}
              item={item}
              styles={styles}
              onPress={() => openDetail(item)}
            />
          ))}
          <Pressable
            style={styles.supportSelectBtn}
            onPress={() => list[0] && openDetail(list[0])}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar de la lista"
          >
            <Text style={styles.supportSelectBtnText}>
              Seleccionar de la lista
            </Text>
            <AppIcon icon={Icons.chevronRight} size={18} color="#FFFFFF" />
          </Pressable>
        </>
      ) : (
        <Text style={styles.note}>No hay diagnósticos disponibles.</Text>
      )}

      <Text style={styles.disclaimer}>
        PIEL360 AI es una herramienta de apoyo y prediagnóstico dermatológico.
        Analiza algunas enfermedades, pero no sustituye la valoración de un
        dermatólogo ni toma decisiones clínicas automatizadas. Ante cualquier
        duda, consulte a un especialista
      </Text>
    </View>
  );
}
