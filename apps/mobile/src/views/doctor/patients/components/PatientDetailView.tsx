import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  ANALYSIS_PROVIDER_STATIC_LABELS,
  analysisProviderLabel,
  analysisStatus,
  availableProvidersFromSubscriptions,
  isAnalysisProviderSlug,
  type AnalysisProviderSlug,
} from '../../../../data/analysisProviderLabel';
import { ApiError } from '../../../../services/api.client';
import {
  patientsService,
  type AnalysisRequest,
  type UpdatePatientInput,
} from '../../../../services/patients.service';
import { subscriptionsService } from '../../../../services/subscriptions.service';
import type { PatientAnalysisSummary } from '../../../../types/analysis';
import type { PatientProfile } from '../../../../types/patient';
import { formatSignedYears } from '../../../../data/skinAge';
import type { Subscription } from '../../../../types/subscription';
import {
  formatPatientDocument,
  patientDisplayName,
} from '../../../profile/data/patient';
import { EditProfileView } from '../../../profile/edit/EditProfileView';
import { DoctorHeader } from './DoctorHeader';
import { createDoctorPatientsStyles } from '../styles/patients.styles';
import { createPatientDetailStyles } from '../styles/patientDetail.styles';

function ageFromBirth(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return `${age} Años`;
}

function formatUpdate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function initials(p: PatientProfile): string {
  return [p.firstName, p.lastName]
    .map((x) => x?.[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

function analysisDiagnosis(item: PatientAnalysisSummary): string {
  return item.finalDiagnosis?.trim() || item.aiDiagnosis?.trim() || '—';
}

type PatientDetailViewProps = {
  patient: PatientProfile;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
  onOpenAnalysis?: (analysisId: string) => void;
  onStartAnalysis?: (provider: AnalysisProviderSlug) => void;
  onPatientUpdated?: (patient: PatientProfile) => void;
};

export function PatientDetailView({
  patient,
  onBack,
  onOpenMenu,
  onOpenMessages,
  onOpenAnalysis,
  onStartAnalysis,
  onPatientUpdated,
}: PatientDetailViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createPatientDetailStyles(branding.colors),
    [branding.colors],
  );

  const [analyses, setAnalyses] = useState<PatientAnalysisSummary[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AnalysisRequest[]>(
    [],
  );
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, pending] = await Promise.all([
          patientsService.listAnalyses(patient.id),
          patientsService
            .listPendingAnalysisRequests(patient.id)
            .catch(() => [] as AnalysisRequest[]),
        ]);
        if (!cancelled) {
          setAnalyses([...list].reverse());
          setPendingRequests(pending);
        }
      } catch (err) {
        if (!cancelled) {
          Alert.alert(
            'Historial',
            err instanceof ApiError
              ? err.message
              : 'No se pudo cargar el histórico de análisis.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlans(true);
      try {
        const list = await subscriptionsService.listMine();
        if (!cancelled) setSubscriptions(list);
      } catch {
        if (!cancelled) setSubscriptions([]);
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableProviders = useMemo(
    () => availableProvidersFromSubscriptions(subscriptions),
    [subscriptions],
  );

  const doc = formatPatientDocument(patient.docType, patient.docNumber);
  const name = patientDisplayName(patient);
  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const muted = branding.colors.muted;

  function handleStart(provider: AnalysisProviderSlug, label: string) {
    if (onStartAnalysis) {
      onStartAnalysis(provider);
      return;
    }
    Alert.alert(
      label,
      'El flujo de este análisis se conectará en una próxima iteración.',
    );
  }

  function pendingLabel(slug: string): string {
    return isAnalysisProviderSlug(slug)
      ? ANALYSIS_PROVIDER_STATIC_LABELS[slug]
      : 'Análisis solicitado';
  }

  const listItems = useMemo(() => {
    const requests = pendingRequests.map((request) => ({
      kind: 'request' as const,
      id: `request-${request.id}`,
      request,
    }));
    const history = analyses.map((analysis) => ({
      kind: 'analysis' as const,
      id: analysis.id,
      analysis,
    }));
    return [...requests, ...history];
  }, [pendingRequests, analyses]);

  async function handleCancelRequest(request: AnalysisRequest) {
    if (cancellingId) return;
    setCancellingId(request.id);
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    try {
      await patientsService.cancelAnalysisRequest(patient.id, request.id);
    } catch (err) {
      setPendingRequests((prev) =>
        prev.some((r) => r.id === request.id) ? prev : [...prev, request],
      );
      Alert.alert(
        'No se pudo cancelar',
        err instanceof ApiError
          ? err.message
          : 'Intenta de nuevo en un momento.',
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSavePatient(input: UpdatePatientInput) {
    const updated = await patientsService.update(patient.id, input);
    onPatientUpdated?.(updated);
    setEditing(false);
    Alert.alert('Listo', 'Los datos del paciente se actualizaron.');
  }

  if (editing) {
    return (
      <EditProfileView
        patient={patient}
        title="Datos del paciente"
        emailEditable={false}
        analyses={analyses}
        requirePhoneOtp={false}
        onBack={() => setEditing(false)}
        onSave={handleSavePatient}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        messageCount={1}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <AppIcon icon={Icons.back} size={22} color={muted} />
          </Pressable>
          <Text style={styles.cardTitle}>Datos del paciente</Text>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Cerrar"
          >
            <AppIcon icon={Icons.close} size={18} color={muted} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="always"
            removeClippedSubviews={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListHeaderComponent={
              <View>
                <View style={styles.identity}>
                  <Pressable
                    style={styles.avatar}
                    onPress={() => setEditing(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Editar datos del paciente"
                  >
                    {patient.avatarUrl ? (
                      <Image
                        source={{ uri: patient.avatarUrl }}
                        style={styles.avatarImage}
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <Text style={styles.avatarText}>{initials(patient)}</Text>
                    )}
                  </Pressable>
                  <Text style={styles.avatarHint}>Toca la foto para editar</Text>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.meta}>
                    Última actualización: {formatUpdate(patient.updatedAt)}
                  </Text>
                  <Text style={styles.meta}>
                    ID: {patient.id}
                    {doc ? `  ·  ${doc}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    Edad cronológica: {ageFromBirth(patient.birthDate)}
                    {ageFromBirth(patient.birthDate) !== '—' ? ' años' : ''}
                  </Text>
                  {patient.lastSkinAgeYears != null ? (
                    <Text style={styles.meta}>
                      Salud de la piel:{' '}
                      {Math.round(patient.lastSkinAgeYears)} años
                      {patient.lastSkinAgeDifference != null
                        ? `  ·  Diferencia: ${formatSignedYears(patient.lastSkinAgeDifference)}`
                        : ''}
                    </Text>
                  ) : null}

                  <View style={styles.newAnalysisSection}>
                    <Text style={styles.newAnalysisHint}>Nuevo análisis</Text>
                    {loadingPlans ? (
                      <ActivityIndicator color={primary} />
                    ) : availableProviders.length === 0 ? (
                      <View style={styles.providerEmpty}>
                        <Text style={styles.providerEmptyText}>
                          No tienes planes activos con créditos. Revisa tu
                          suscripción para iniciar un análisis.
                        </Text>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        style={styles.providerScroll}
                        contentContainerStyle={styles.providerScrollContent}
                      >
                        {availableProviders.map((provider) => (
                          <Pressable
                            key={provider.slug}
                            style={styles.providerPill}
                            onPress={() =>
                              handleStart(provider.slug, provider.label)
                            }
                          >
                            <Text style={styles.providerPillText}>
                              {provider.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>

                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>Historial de análisis</Text>
                  <View style={styles.historyActions}>
                    <Pressable
                      style={styles.historyAction}
                      onPress={() =>
                        Alert.alert(
                          'Asignar Cita',
                          'Usa la pestaña Agenda para proponer una cita a este paciente.',
                        )
                      }
                    >
                      <AppIcon
                        icon={Icons.calendarClock}
                        size={16}
                        color={primary}
                      />
                      <Text style={styles.historyActionText}>Asignar Cita</Text>
                    </Pressable>
                    <Pressable
                      style={styles.historyAction}
                      onPress={() =>
                        Alert.alert(
                          'Solicitar Imagen',
                          'La solicitud de imagen se conectará próximamente.',
                        )
                      }
                    >
                      <AppIcon icon={Icons.image} size={16} color={primary} />
                      <Text style={styles.historyActionText}>
                        Solicitar Imagen
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.empty, { paddingHorizontal: 16 }]}>
                <Text style={styles.emptyText}>
                  Este paciente aún no tiene análisis ni solicitudes.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.kind === 'request') {
                const req = item.request;
                const busy = cancellingId === req.id;
                return (
                  <View style={styles.analysisRow}>
                    <View style={styles.thumb}>
                      <AppIcon icon={Icons.skin} size={22} color={primary} />
                    </View>
                    <View style={styles.analysisBody}>
                      <View style={styles.metaBadges}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText} numberOfLines={1}>
                            {pendingLabel(req.providerSlug)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            styles.statusBadgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              styles.statusBadgeTextPending,
                            ]}
                          >
                            Solicitado
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.diagnosis} numberOfLines={1}>
                        Pendiente en app del paciente
                      </Text>
                      <View style={styles.stampRow}>
                        <AppIcon
                          icon={Icons.calendarClock}
                          size={13}
                          color={primary}
                        />
                        <Text style={styles.stamp}>
                          {formatStamp(req.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.pendingCancelBtn}
                      activeOpacity={0.7}
                      disabled={busy}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      onPress={() => void handleCancelRequest(req)}
                      accessibilityRole="button"
                      accessibilityLabel="Cancelar solicitud"
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={styles.pendingCancelText}>Cancelar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }

              const analysis = item.analysis;
              const typeLabel = analysisProviderLabel(analysis);
              const status = analysisStatus(analysis);
              const diagnosis = analysisDiagnosis(analysis);
              const region = analysis.bodyRegion?.trim() || '—';
              const thumb = analysis.coloredUrl || analysis.imageUrl;
              return (
                <Pressable
                  style={styles.analysisRow}
                  onPress={() => onOpenAnalysis?.(analysis.id)}
                >
                  <View style={styles.thumb}>
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        style={styles.thumbImage}
                      />
                    ) : (
                      <AppIcon icon={Icons.skin} size={22} color={primary} />
                    )}
                  </View>
                  <View style={styles.analysisBody}>
                    <View style={styles.metaBadges}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText} numberOfLines={1}>
                          {typeLabel}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          status.kind === 'invalid' &&
                            styles.statusBadgeInvalid,
                          status.kind === 'confirmed' &&
                            styles.statusBadgeConfirmed,
                          status.kind === 'corrected' &&
                            styles.statusBadgeCorrected,
                          status.kind === 'pending' &&
                            styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            status.kind === 'invalid' &&
                              styles.statusBadgeTextInvalid,
                            status.kind === 'confirmed' &&
                              styles.statusBadgeTextConfirmed,
                            status.kind === 'corrected' &&
                              styles.statusBadgeTextCorrected,
                            status.kind === 'pending' &&
                              styles.statusBadgeTextPending,
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.diagnosis} numberOfLines={1}>
                      {diagnosis}
                    </Text>
                    <Text style={styles.regionLine} numberOfLines={1}>
                      Región: {region}
                    </Text>
                    <View style={styles.stampRow}>
                      <AppIcon
                        icon={Icons.calendarClock}
                        size={13}
                        color={primary}
                      />
                      <Text style={styles.stamp}>
                        {formatStamp(analysis.createdAt)}
                        {analysis.sharedWithPatient ? ' · Compartido' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.goBtn}>
                    <AppIcon
                      icon={Icons.chevronRight}
                      size={16}
                      color={onDark}
                    />
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}
