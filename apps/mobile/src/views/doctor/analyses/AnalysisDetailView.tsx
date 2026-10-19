import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { KeyboardAwareScrollView } from '../../../components/KeyboardAwareScrollView';
import { Icons } from '../../../components/icons';
import { useAuth } from '../../../context/AuthContext';
import { isClinicalPanelUser } from '../../../types/auth';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { analysesService } from '../../../services/analyses.service';
import type { ConfirmAnalysisInput } from '../../../services/analyses.service';
import { patientsService } from '../../../services/patients.service';
import { confirmAction } from '../../../utils/confirm';
import type {
  AnalysisDetail,
  FitzpatrickRawResponse,
  SkiniverDiagnosisCandidate,
  YoucamRawResponse,
} from '../../../types/analysis';
import { skiniverDiagnosisLabel } from '../../../types/skiniver-labels';
import { FITZPATRICK_SCALES } from '../../../data/fitzpatrickLabels';
import { ANALYSIS_PROVIDER_STATIC_LABELS } from '../../../data/analysisProviderLabel';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { ConfirmAnalysisForm } from './components/ConfirmAnalysisForm';
import { FitzpatrickResultsSection } from './components/FitzpatrickResultsSection';
import { SkiniverResultsSection } from './components/SkiniverResultsSection';
import { YoucamResultsSection } from './components/YoucamResultsSection';
import { createAnalysisDetailStyles } from './styles/analysisDetail.styles';
import { YoucamProgressView } from './YoucamProgressView';
import { YoucamReportView } from './YoucamReportView';
import { NosologyPicker } from '../../nosologies/NosologyPicker';
import type { NosologyItem } from '../../../types/nosology';

type AnalysisDetailViewProps = {
  analysisId: string;
  patientName?: string;
  patientGender?: string | null;
  /** Si false, oculta compartir y confirmar (vista paciente). */
  canShare?: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

type SubView = 'detail' | 'progress' | 'report';

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

/** Completa skinType/fitzpatrickType: prioridad al último Fitzpatrick confirmado. */
async function enrichAnalysisPatient(
  detail: AnalysisDetail,
): Promise<AnalysisDetail> {
  let fitzpatrickType: string | null = null;
  let skinType = detail.patient?.skinType ?? null;
  let firstName = detail.patient?.firstName ?? '';
  let lastName = detail.patient?.lastName ?? '';
  let birthDate = detail.patient?.birthDate ?? null;
  let gender = detail.patient?.gender ?? null;

  const [profileResult, historyResult] = await Promise.allSettled([
    patientsService.getById(detail.patientId),
    patientsService.listAnalyses(detail.patientId),
  ]);

  if (profileResult.status === 'fulfilled') {
    const profile = profileResult.value;
    firstName = profile.firstName;
    lastName = profile.lastName;
    gender = profile.gender ?? gender;
    skinType = profile.skinType ?? skinType;
    // Perfil solo como respaldo; el confirmado manda.
    fitzpatrickType = profile.fitzpatrickType ?? null;
    birthDate = profile.birthDate ?? birthDate;
  }

  if (historyResult.status === 'fulfilled') {
    const history = historyResult.value;
    const latestConfirmed = [...history]
      .filter((a) => !!a.fitzpatrickTaskId && a.isConfirmed === true)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

    if (latestConfirmed) {
      const fromRaw = (
        latestConfirmed.aiRawResponse as FitzpatrickRawResponse | null
      )?.fitzpatrick_scale;
      const fromDiagnosis = parseFitzpatrickScale(
        latestConfirmed.finalDiagnosis ?? latestConfirmed.aiDiagnosis,
      );
      const scale = fromRaw ?? fromDiagnosis;
      if (scale && (FITZPATRICK_SCALES as readonly string[]).includes(scale)) {
        fitzpatrickType = scale;
      }
    }
  }

  return {
    ...detail,
    patient: {
      id: detail.patientId,
      firstName,
      lastName,
      birthDate,
      gender,
      skinType,
      fitzpatrickType,
    },
  };
}

function parseFitzpatrickScale(
  diagnosis: string | null | undefined,
): string | null {
  if (!diagnosis) return null;
  const match = diagnosis.match(/\b(I{1,3}|IV|V|VI)\b/i);
  if (!match) return null;
  const value = match[1].toUpperCase();
  return (FITZPATRICK_SCALES as readonly string[]).includes(value)
    ? value
    : null;
}

export function AnalysisDetailView({
  analysisId,
  patientName,
  patientGender,
  canShare,
  onBack,
  onOpenMenu,
  onOpenMessages,
}: AnalysisDetailViewProps) {
  const { user } = useAuth();
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createAnalysisDetailStyles(branding.colors),
    [branding.colors],
  );

  const canManage =
    canShare ??
    (isClinicalPanelUser(user) || user?.role === 'superadmin');
  const showShare = canManage;

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>('detail');
  const [skiniverView, setSkiniverView] = useState<'stats' | 'detail'>('stats');
  const [skiniverSelected, setSkiniverSelected] =
    useState<SkiniverDiagnosisCandidate | null>(null);
  const [nosologyPickerOpen, setNosologyPickerOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [skiniverNotesOpen, setSkiniverNotesOpen] = useState(false);
  const [skiniverNotes, setSkiniverNotes] = useState('');
  const [selectedNosology, setSelectedNosology] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSkiniverView('stats');
    setSkiniverSelected(null);
  }, [analysisId]);

  // Las observaciones ahora se editan siempre (al confirmar y al corregir):
  // se precargan con lo ya guardado para no borrarlas sin querer al guardar.
  useEffect(() => {
    setSkiniverNotes(analysis?.doctorNotes?.trim() ?? '');
  }, [analysis?.id, analysis?.doctorNotes]);

  function handleSkiniverViewChange(next: 'stats' | 'detail') {
    setSkiniverView(next);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await analysesService.getById(analysisId);
        if (cancelled) return;
        // Se muestra ya; los datos del paciente (fototipo, edad…) llegan después.
        setAnalysis(detail);
        setLoading(false);
        const enriched = await enrichAnalysisPatient(detail);
        if (!cancelled) {
          setAnalysis((current) =>
            current && current.id === enriched.id
              ? { ...current, patient: enriched.patient }
              : current,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el análisis.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const isYoucam = !!analysis?.youcamTaskId;
  const isFitzpatrick = !!analysis?.fitzpatrickTaskId;
  const isSkiniver = !!analysis && !isYoucam && !isFitzpatrick;
  const raw = (analysis?.aiRawResponse ?? null) as YoucamRawResponse | null;
  const youcamError =
    isYoucam && raw && raw.error === true
      ? raw.message ?? 'Error al procesar el análisis'
      : null;

  function handleHeaderBack() {
    if (isSkiniver && skiniverView === 'detail') {
      handleSkiniverViewChange('stats');
      return;
    }
    onBack();
  }

  const displayName =
    patientName ??
    (analysis?.patient
      ? `${analysis.patient.firstName} ${analysis.patient.lastName}`.trim()
      : 'Paciente');

  async function handleShare() {
    if (!analysis || analysis.sharedWithPatient || sharing) return;
    setSharing(true);
    try {
      const updated = await analysesService.shareWithPatient(analysis.id);
      setAnalysis(await enrichAnalysisPatient(updated));
      Alert.alert(
        'Análisis compartido',
        'El paciente ya puede verlo en el histórico de su inicio.',
      );
    } catch (err) {
      Alert.alert(
        'No se pudo compartir',
        err instanceof ApiError
          ? err.message
          : 'Inténtalo de nuevo en unos segundos.',
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleUnshare() {
    if (!analysis || !analysis.sharedWithPatient || sharing) return;
    const ok = await confirmAction({
      title: 'Dejar de compartir',
      message: 'El paciente dejará de ver este análisis en su app. ¿Continuar?',
      confirmLabel: 'Dejar de compartir',
      destructive: true,
    });
    if (!ok) return;

    setSharing(true);
    try {
      const updated = await analysesService.unshareWithPatient(analysis.id);
      setAnalysis(await enrichAnalysisPatient(updated));
    } catch (err) {
      Alert.alert(
        'No se pudo dejar de compartir',
        err instanceof ApiError
          ? err.message
          : 'Inténtalo de nuevo en unos segundos.',
      );
    } finally {
      setSharing(false);
    }
  }

  async function handleConfirm(input: {
    isCorrected: boolean;
    finalDiagnosis?: string;
    doctorNotes?: string;
  }) {
    if (!analysis) return;
    const updated = await analysesService.confirm(analysis.id, input);
    setAnalysis(await enrichAnalysisPatient(updated));
    Alert.alert(
      input.isCorrected ? 'Análisis corregido' : 'Análisis confirmado',
      input.isCorrected
        ? `El diagnóstico quedó como: ${input.finalDiagnosis ?? updated.finalDiagnosis ?? '—'}.`
        : 'El resultado quedó confirmado.',
    );
  }

  function openSkiniverCorrection() {
    setSkiniverNotes(analysis?.doctorNotes?.trim() ?? '');
    setSelectedNosology(
      analysis?.isCorrected ? analysis.finalDiagnosis ?? null : null,
    );
    setSkiniverNotesOpen(true);
    setSkiniverView('detail');
    setNosologyPickerOpen(true);
  }

  /** Confirma el diagnóstico seleccionado de la lista (o el de la IA). */
  async function handleSkiniverConfirm(input: ConfirmAnalysisInput) {
    if (!skiniverSelected) {
      Alert.alert(
        'Selecciona un diagnóstico',
        'Elige uno de los diagnósticos de apoyo antes de confirmar.',
      );
      return;
    }
    const notes = skiniverNotes.trim();
    if (!notes) {
      setSkiniverView('detail');
      Alert.alert(
        'Faltan las observaciones',
        'Describe el diagnóstico en observaciones antes de confirmar.',
      );
      return;
    }
    const selectedLabel = skiniverDiagnosisLabel(
      skiniverSelected.class,
      skiniverSelected.class_raw,
    );
    await handleConfirm({
      ...input,
      doctorNotes: notes,
      // El elegido en la lista queda como diagnóstico del registro.
      finalDiagnosis: selectedLabel || skiniverSelected.class,
    });
  }

  async function handleSaveSkiniverNotes() {
    if (!analysis) return;
    const notes = skiniverNotes.trim();
    const nosology = selectedNosology?.trim() ?? '';
    if (!nosology) {
      Alert.alert(
        'Falta la nosología',
        'Selecciona una nosología y describe el diagnóstico en observaciones.',
      );
      setNosologyPickerOpen(true);
      return;
    }
    if (!notes) {
      Alert.alert(
        'Faltan las observaciones',
        'Describe el diagnóstico en observaciones antes de guardar.',
      );
      return;
    }
    setCorrecting(true);
    try {
      await handleConfirm({
        isCorrected: true,
        finalDiagnosis: nosology,
        doctorNotes: notes,
      });
      setSkiniverNotesOpen(false);
    } catch (err) {
      Alert.alert(
        'No se pudo guardar',
        err instanceof ApiError
          ? err.message
          : 'Inténtalo de nuevo en unos segundos.',
      );
    } finally {
      setCorrecting(false);
    }
  }

  function handleNosologySelected(item: NosologyItem) {
    setSelectedNosology(item.name);
    setNosologyPickerOpen(false);
    setSkiniverNotesOpen(true);
    setSkiniverView('detail');
  }

  /** `correct` mientras se corrige; `confirm` mientras falte confirmar (el
   * medico escribe sus notas ahi mismo); `readonly` sin permiso o ya cerrado. */
  const skiniverObservationsMode: 'readonly' | 'confirm' | 'correct' =
    skiniverNotesOpen
      ? 'correct'
      : !canManage || analysis?.isConfirmed
        ? 'readonly'
        : 'confirm';

  const canConfirm =
    canManage && analysis && (!isYoucam || analysis.isValid);

  if (nosologyPickerOpen) {
    return (
      <NosologyPicker
        title="Corregir resultado"
        onCancel={() => {
          if (!correcting) setNosologyPickerOpen(false);
        }}
        onSelect={(item) => {
          void handleNosologySelected(item);
        }}
      />
    );
  }

  if (analysis && isYoucam && analysis.isValid && subView === 'progress') {
    return (
      <YoucamProgressView
        analysis={analysis}
        onBack={() => setSubView('detail')}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  if (analysis && isYoucam && analysis.isValid && subView === 'report') {
    return (
      <YoucamReportView
        analysis={analysis}
        patientName={displayName}
        canShare={showShare}
        onShared={async (next) => {
          setAnalysis(await enrichAnalysisPatient(next));
        }}
        onBack={() => setSubView('detail')}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Pressable
            style={styles.roundBtn}
            onPress={handleHeaderBack}
            accessibilityLabel="Volver"
          >
            <AppIcon
              icon={Icons.back}
              size={22}
              color={branding.colors.iconMuted}
            />
          </Pressable>
          <Text style={styles.cardTitle}>
            {isFitzpatrick
              ? ANALYSIS_PROVIDER_STATIC_LABELS.fitzpatrick
              : 'Resultado del análisis'}
          </Text>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Cerrar"
          >
            <AppIcon
              icon={Icons.close}
              size={18}
              color={branding.colors.iconMuted}
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={branding.colors.primary} />
            <Text style={styles.loadingText}>Cargando resultados…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : analysis ? (
          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.patientName}>{displayName}</Text>
            <Text style={styles.stamp}>{formatStamp(analysis.createdAt)}</Text>

            {showShare ? (
              <Pressable
                style={({ pressed }) => [styles.shareBtn,
                  analysis.sharedWithPatient && styles.shareBtnShared,
                  sharing && styles.shareBtnDisabled, pressed && { backgroundColor: branding.colors.buttonHover }]}
                onPress={
                  analysis.sharedWithPatient ? handleUnshare : handleShare
                }
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator
                    color={
                      analysis.sharedWithPatient
                        ? branding.colors.success
                        : branding.colors.buttonText
                    }
                  />
                ) : (
                  <>
                    <AppIcon
                      icon={
                        analysis.sharedWithPatient
                          ? Icons.eyeOff
                          : Icons.share
                      }
                      size={18}
                      color={
                        analysis.sharedWithPatient
                          ? branding.colors.success
                          : branding.colors.buttonText
                      }
                    />
                    <Text
                      style={[
                        styles.shareBtnText,
                        analysis.sharedWithPatient &&
                          styles.shareBtnTextShared,
                      ]}
                    >
                      {analysis.sharedWithPatient
                        ? 'Dejar de compartir'
                        : 'Compartir análisis'}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            {youcamError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  El análisis no se pudo procesar: {youcamError}
                </Text>
              </View>
            ) : null}

            {isYoucam && !analysis.isValid && !youcamError ? (
              <Text style={styles.note}>
                Procesando el análisis facial… Puedes volver más tarde.
              </Text>
            ) : null}

            {isYoucam && analysis.isValid ? (
              <YoucamResultsSection
                analysis={analysis}
                onOpenProgress={() => setSubView('progress')}
                onOpenReport={() => setSubView('report')}
              />
            ) : null}

            {isFitzpatrick ? (
              <FitzpatrickResultsSection analysis={analysis} />
            ) : null}

            {isSkiniver ? (
              <SkiniverResultsSection
                analysis={analysis}
                patientGender={patientGender ?? analysis.patient?.gender}
                view={skiniverView}
                onViewChange={handleSkiniverViewChange}
                selectedCandidate={skiniverSelected}
                onSelectedCandidateChange={setSkiniverSelected}
                selectionEnabled={Boolean(canConfirm && !analysis.isConfirmed)}
                showProfessionalOutcome={Boolean(canManage)}
                observationsMode={skiniverObservationsMode}
                observationsValue={skiniverNotes}
                onObservationsChange={setSkiniverNotes}
                onSaveObservations={() => void handleSaveSkiniverNotes()}
                observationsSaving={correcting}
                selectedNosology={selectedNosology}
                onPickNosology={() => setNosologyPickerOpen(true)}
                listFooter={
                  canConfirm && !analysis.isConfirmed ? (
                    <ConfirmAnalysisForm
                      aiDiagnosis={
                        skiniverSelected
                          ? skiniverDiagnosisLabel(
                              skiniverSelected.class,
                              skiniverSelected.class_raw,
                            )
                          : analysis.aiDiagnosis
                      }
                      onSubmit={handleSkiniverConfirm}
                      correctMode="nosology"
                      onCorrectPress={openSkiniverCorrection}
                    />
                  ) : canConfirm && analysis.isConfirmed ? (
                    <View style={{ gap: 8, marginTop: 8 }}>
                      <Text style={styles.confirmStatus}>
                        Análisis{' '}
                        {analysis.isCorrected ? 'corregido' : 'confirmado'}
                        {analysis.finalDiagnosis
                          ? `: ${analysis.finalDiagnosis}`
                          : '.'}
                      </Text>
                      <Pressable onPress={openSkiniverCorrection}>
                        <Text style={styles.confirmOutlineText}>
                          Editar observaciones
                        </Text>
                      </Pressable>
                    </View>
                  ) : null
                }
                detailFooter={
                  canConfirm ? (
                    skiniverNotesOpen ? (
                      <Pressable
                        onPress={() => setSkiniverNotesOpen(false)}
                        disabled={correcting}
                      >
                        <Text style={styles.confirmOutlineText}>Cancelar</Text>
                      </Pressable>
                    ) : analysis.isConfirmed ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.confirmStatus}>
                          Análisis{' '}
                          {analysis.isCorrected ? 'corregido' : 'confirmado'}
                          {analysis.finalDiagnosis
                            ? `: ${analysis.finalDiagnosis}`
                            : '.'}
                        </Text>
                        <Pressable onPress={openSkiniverCorrection}>
                          <Text style={styles.confirmOutlineText}>
                            Editar observaciones
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <ConfirmAnalysisForm
                        aiDiagnosis={
                          skiniverSelected
                            ? skiniverDiagnosisLabel(
                                skiniverSelected.class,
                                skiniverSelected.class_raw,
                              )
                            : analysis.aiDiagnosis
                        }
                        onSubmit={handleSkiniverConfirm}
                        correctMode="nosology"
                        onCorrectPress={openSkiniverCorrection}
                      />
                    )
                  ) : null
                }
              />
            ) : null}

            {canConfirm && !isSkiniver ? (
              analysis.isConfirmed ? (
                <Text style={styles.confirmStatus}>
                  Análisis{' '}
                  {analysis.isCorrected ? 'corregido' : 'confirmado'}
                  {analysis.finalDiagnosis
                    ? `: ${analysis.finalDiagnosis}`
                    : '.'}
                </Text>
              ) : (
                <ConfirmAnalysisForm
                  aiDiagnosis={analysis.aiDiagnosis}
                  onSubmit={handleConfirm}
                  correctMode="notes"
                />
              )
            ) : null}
          </KeyboardAwareScrollView>
        ) : null}
      </View>
    </View>
  );
}
