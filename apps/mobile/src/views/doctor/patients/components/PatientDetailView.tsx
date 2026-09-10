import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  analysisStatus,
  availableProvidersFromSubscriptions,
  isAnalysisProviderSlug,
  type AnalysisProviderSlug,
} from '../../../../data/analysisProviderLabel';
import { ApiError } from '../../../../services/api.client';
import { patientsService, type AnalysisRequest, type UpdatePatientInput } from '../../../../services/patients.service';
import { messagesService } from '../../../../services/messages.service';
import { subscriptionsService } from '../../../../services/subscriptions.service';
import type { PatientAnalysisSummary } from '../../../../types/analysis';
import type { PatientProfile } from '../../../../types/patient';
import { bodyRegionLabel } from '../../../../data/bodyRegions';
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
  return String(age);
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

function dayKey(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Acepta dd/mm/yyyy, dd-mm-yyyy o yyyy-mm-dd. */
function parseFlexibleDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
  }
  return null;
}

function matchesDateQuery(iso: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const stamp = formatStamp(iso).toLowerCase();
  const key = dayKey(iso);
  if (stamp.includes(q) || (key && key.includes(q))) return true;

  const rangeParts = q.split(/\s+(?:–|-|a|al)\s+/i).filter(Boolean);
  if (rangeParts.length === 2) {
    const from = parseFlexibleDate(rangeParts[0]);
    const to = parseFlexibleDate(rangeParts[1]);
    const item = new Date(iso);
    if (from && to && !Number.isNaN(item.getTime())) {
      const start = new Date(from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      return item >= start && item <= end;
    }
  }

  const single = parseFlexibleDate(q);
  if (single && key) {
    const yyyy = single.getFullYear();
    const mm = String(single.getMonth() + 1).padStart(2, '0');
    const dd = String(single.getDate()).padStart(2, '0');
    return key === `${yyyy}-${mm}-${dd}`;
  }

  return false;
}

function initials(p: PatientProfile): string {
  return [p.firstName, p.lastName]
    .map((x) => x?.[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

type AnalysisKindVisual = {
  slug: AnalysisProviderSlug;
  title: string;
  icon: (typeof Icons)[keyof typeof Icons];
  accent: string;
  iconBg: string;
};

const ANALYSIS_KIND_VISUAL: Record<AnalysisProviderSlug, AnalysisKindVisual> = {
  youcam: {
    slug: 'youcam',
    title: 'Análisis Estético',
    icon: Icons.aesthetic,
    accent: '#3B82C4',
    iconBg: '#D7EAF7',
  },
  skiniver: {
    slug: 'skiniver',
    title: 'Análisis Dermatológico',
    icon: Icons.dermAnalysis,
    accent: '#7C5CBF',
    iconBg: '#E4D7F3',
  },
  fitzpatrick: {
    slug: 'fitzpatrick',
    title: 'Análisis Fototipo',
    icon: Icons.fototipo,
    accent: '#2A9B8F',
    iconBg: '#D2EEE9',
  },
};

function resolveAnalysisSlug(row: {
  youcamTaskId?: string | null;
  fitzpatrickTaskId?: string | null;
  providerSlug?: string | null;
}): AnalysisProviderSlug {
  if (row.providerSlug && isAnalysisProviderSlug(row.providerSlug)) {
    return row.providerSlug;
  }
  if (row.youcamTaskId) return 'youcam';
  if (row.fitzpatrickTaskId) return 'fitzpatrick';
  return 'skiniver';
}

/** Texto diferencial bajo el título según tipo de análisis. */
function analysisDifferentialDetail(
  slug: AnalysisProviderSlug,
  bodyRegion?: string | null,
): string {
  if (slug === 'skiniver') {
    const region = bodyRegionLabel(bodyRegion);
    return region ? `Región: ${region}` : 'Región corporal';
  }
  if (slug === 'youcam') return 'Evaluación facial y textura';
  return 'Tipo de piel y protección solar';
}

function historyStatusPresentation(status: {
  kind: 'invalid' | 'corrected' | 'confirmed' | 'pending';
  label: string;
}): { label: string; tone: 'done' | 'progress' | 'invalid' | 'other' } {
  if (status.kind === 'invalid') return { label: 'Inválido', tone: 'invalid' };
  if (status.kind === 'pending') return { label: 'En proceso', tone: 'progress' };
  if (status.kind === 'confirmed' || status.kind === 'corrected') {
    return { label: 'Completado', tone: 'done' };
  }
  return { label: status.label, tone: 'other' };
}

const ANALYSIS_TYPE_CARDS: Array<{
  slug: AnalysisProviderSlug;
  line1: string;
  line2: string;
  icon: (typeof Icons)[keyof typeof Icons];
  accent: string;
  background: string;
  border: string;
  iconBg: string;
}> = [
  {
    slug: 'youcam',
    line1: 'Análisis',
    line2: 'Estético',
    icon: Icons.aesthetic,
    accent: '#3B82C4',
    background: '#EAF4FB',
    border: '#C5DFF0',
    iconBg: '#D7EAF7',
  },
  {
    slug: 'skiniver',
    line1: 'Análisis',
    line2: 'Dermatológico',
    icon: Icons.dermAnalysis,
    accent: '#7C5CBF',
    background: '#F1EBF8',
    border: '#D9C8EE',
    iconBg: '#E4D7F3',
  },
  {
    slug: 'fitzpatrick',
    line1: 'Análisis',
    line2: 'Fototipo',
    icon: Icons.fototipo,
    accent: '#2A9B8F',
    background: '#E8F6F3',
    border: '#BFE6DF',
    iconBg: '#D2EEE9',
  },
];

type PatientDetailViewProps = {
  patient: PatientProfile;
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
  onOpenAgenda?: () => void;
  onOpenAnalysis?: (analysisId: string) => void;
  onStartAnalysis?: (provider: AnalysisProviderSlug) => void;
  onPatientUpdated?: (patient: PatientProfile) => void;
};

export function PatientDetailView({
  patient,
  onBack,
  onOpenMenu,
  onOpenMessages,
  onOpenAgenda,
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
  const [dateQuery, setDateQuery] = useState('');
  const [requestPickerOpen, setRequestPickerOpen] = useState(false);
  const [imageRequestOpen, setImageRequestOpen] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [requestingSlug, setRequestingSlug] =
    useState<AnalysisProviderSlug | null>(null);

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
  const ageLabel = ageFromBirth(patient.birthDate);
  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const muted = branding.colors.muted;

  function handleStart(provider: AnalysisProviderSlug, label: string) {
    const allowed = availableProviders.some((p) => p.slug === provider);
    if (!allowed) {
      Alert.alert(
        label,
        'No tienes un plan activo con créditos para este tipo de análisis. Revisa tu suscripción.',
      );
      return;
    }
    if (onStartAnalysis) {
      onStartAnalysis(provider);
      return;
    }
    Alert.alert(
      label,
      'El flujo de este análisis se conectará en una próxima iteración.',
    );
  }

  async function handleRequestAnalysis(slug: AnalysisProviderSlug) {
    if (requestingSlug) return;
    const label = ANALYSIS_KIND_VISUAL[slug].title;
    setRequestingSlug(slug);
    try {
      const created = await patientsService.createAnalysisRequest(
        patient.id,
        slug,
      );
      setPendingRequests((prev) =>
        prev.some((r) => r.id === created.id) ? prev : [created, ...prev],
      );
      setRequestPickerOpen(false);
      Alert.alert(
        'Solicitud enviada',
        `El paciente verá «${label}» en su listado de análisis solicitados (Nuevo Análisis).`,
      );
    } catch (err) {
      Alert.alert(
        'No se pudo solicitar',
        err instanceof ApiError
          ? err.message
          : 'Intenta de nuevo o verifica que el paciente tenga cuenta de acceso.',
      );
    } finally {
      setRequestingSlug(null);
    }
  }

  async function openPatientChat() {
    const conversation = await messagesService.getOrCreate({
      patientId: patient.id,
    });
    return conversation.id;
  }

  async function requestImageFromPatient() {
    if (sendingImage) return;
    setSendingImage(true);
    try {
      const conversationId = await openPatientChat();
      await messagesService.sendText(
        conversationId,
        [
          'Te solicito una imagen de la zona del cuerpo donde se encuentra la lesión. Sigue las siguientes instrucciones:',
          '',
          'Toma una foto detallada, distancia no mayor a 10 cm, usa luz brillante, evita objetos extraños en la foto.',
        ].join('\n'),
      );
      setImageRequestOpen(false);
      Alert.alert(
        'Solicitud enviada',
        'Se pidió la imagen por el chat del paciente.',
      );
    } catch (err) {
      Alert.alert(
        'No se pudo solicitar',
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar la solicitud de imagen.',
      );
    } finally {
      setSendingImage(false);
    }
  }

  async function captureAndSendImage(source: 'camera' | 'library') {
    if (sendingImage) return;
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        source === 'camera'
          ? 'Necesitamos acceso a la cámara para capturar la imagen.'
          : 'Necesitamos acceso a la galería para enviar la imagen.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    setSendingImage(true);
    try {
      const conversationId = await openPatientChat();
      await messagesService.sendAttachment(conversationId, {
        uri: asset.uri,
        name: asset.fileName ?? 'imagen.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      await messagesService.sendText(
        conversationId,
        'Imagen enviada desde la ficha del paciente.',
      );
      setImageRequestOpen(false);
      Alert.alert('Imagen enviada', 'La imagen quedó en el chat con el paciente.');
    } catch (err) {
      Alert.alert(
        'No se pudo enviar',
        err instanceof ApiError
          ? err.message
          : 'No se pudo capturar o enviar la imagen.',
      );
    } finally {
      setSendingImage(false);
    }
  }

  const listItems = useMemo(() => {
    const requests = pendingRequests
      .filter((request) => matchesDateQuery(request.createdAt, dateQuery))
      .map((request) => ({
        kind: 'request' as const,
        id: `request-${request.id}`,
        request,
      }));
    const history = analyses
      .filter((analysis) => matchesDateQuery(analysis.createdAt, dateQuery))
      .map((analysis) => ({
        kind: 'analysis' as const,
        id: analysis.id,
        analysis,
      }));
    return [...requests, ...history];
  }, [pendingRequests, analyses, dateQuery]);

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
                      <Text style={styles.avatarText}>
                        {initials(patient)}
                      </Text>
                    )}
                  </Pressable>
                  <View style={styles.identityInfo}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.meta}>
                      ID: {patient.id}
                      {doc ? `  ·  ${doc}` : ''}
                    </Text>
                    <View style={styles.metaRow}>
                      <AppIcon
                        icon={Icons.calendarDay}
                        size={14}
                        color={primary}
                      />
                      <Text style={styles.meta}>
                        Última actualización: {formatUpdate(patient.updatedAt)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <AppIcon icon={Icons.account} size={14} color={primary} />
                      <Text style={styles.meta}>
                        Edad: {ageLabel === '—' ? '—' : `${ageLabel} años`}
                      </Text>
                    </View>
                    {patient.lastSkinAgeYears != null ? (
                      <Text style={styles.meta}>
                        Salud de la piel:{' '}
                        {Math.round(patient.lastSkinAgeYears)} años
                        {patient.lastSkinAgeDifference != null
                          ? ` · Diferencia: ${formatSignedYears(patient.lastSkinAgeDifference)}`
                          : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.dateSearchWrap}>
                  <AppIcon
                    icon={Icons.calendar}
                    size={18}
                    color={primary}
                  />
                  <TextInput
                    style={styles.dateSearchInput}
                    value={dateQuery}
                    onChangeText={setDateQuery}
                    placeholder="Buscar por fecha o rango"
                    placeholderTextColor="#9CA3AF"
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                    returnKeyType="search"
                  />
                  <AppIcon
                    icon={Icons.settings}
                    size={18}
                    color={muted}
                  />
                </View>

                <View style={styles.newAnalysisSection}>
                  <Text style={styles.newAnalysisHint}>
                    Seleccionar tipo de análisis
                  </Text>
                  {loadingPlans ? (
                    <ActivityIndicator color={primary} />
                  ) : (
                    <View style={styles.providerCards}>
                      {ANALYSIS_TYPE_CARDS.map((card) => {
                        const enabled = availableProviders.some(
                          (p) => p.slug === card.slug,
                        );
                        const label = `${card.line1} ${card.line2}`;
                        return (
                          <Pressable
                            key={card.slug}
                            style={[
                              styles.providerCard,
                              {
                                backgroundColor: card.background,
                                borderColor: card.border,
                                opacity: enabled || loadingPlans ? 1 : 0.55,
                              },
                            ]}
                            onPress={() => handleStart(card.slug, label)}
                          >
                            <View
                              style={[
                                styles.providerCardIcon,
                                { backgroundColor: card.iconBg },
                              ]}
                            >
                              <AppIcon
                                icon={card.icon}
                                size={22}
                                color={card.accent}
                              />
                            </View>
                            <View style={styles.providerCardTextCol}>
                              <Text
                                style={[
                                  styles.providerCardText,
                                  { color: card.accent },
                                ]}
                              >
                                {card.line1}
                              </Text>
                              <Text
                                style={[
                                  styles.providerCardText,
                                  { color: card.accent },
                                ]}
                                numberOfLines={1}
                              >
                                {card.line2}
                              </Text>
                            </View>
                            <AppIcon
                              icon={Icons.chevronRight}
                              size={18}
                              color={card.accent}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  {!loadingPlans && availableProviders.length === 0 ? (
                    <View style={styles.providerEmpty}>
                      <Text style={styles.providerEmptyText}>
                        No tienes planes activos con créditos. Revisa tu
                        suscripción para iniciar un análisis.
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.clinicalActions}>
                    <Pressable
                      style={[styles.clinicalAction, styles.clinicalActionPrimary]}
                      onPress={() => {
                        if (onOpenAgenda) {
                          onOpenAgenda();
                          return;
                        }
                        Alert.alert(
                          'Asignar cita',
                          'Usa la pestaña Agenda para proponer una cita a este paciente.',
                        );
                      }}
                    >
                      <AppIcon
                        icon={Icons.calendarDay}
                        size={16}
                        color={onDark}
                      />
                      <Text
                        style={styles.clinicalActionPrimaryText}
                        numberOfLines={1}
                      >
                        Asignar cita
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.clinicalAction,
                        styles.clinicalActionSecondary,
                      ]}
                      onPress={() => setImageRequestOpen(true)}
                    >
                      <AppIcon icon={Icons.image} size={16} color={primary} />
                      <Text
                        style={styles.clinicalActionSecondaryText}
                        numberOfLines={1}
                      >
                        Solicitar imagen
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>Análisis realizados</Text>
                  <View style={styles.historyActions}>
                    <Pressable
                      style={styles.historyActionSecondary}
                      onPress={() => setRequestPickerOpen(true)}
                    >
                      <AppIcon icon={Icons.camera} size={15} color={primary} />
                      <Text style={styles.historyActionSecondaryText}>
                        Solicitar análisis
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.empty, { paddingHorizontal: 16 }]}>
                <Text style={styles.emptyText}>
                  {dateQuery.trim()
                    ? 'No hay análisis que coincidan con esa fecha o rango.'
                    : 'Este paciente aún no tiene análisis ni solicitudes.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.kind === 'request') {
                const req = item.request;
                const busy = cancellingId === req.id;
                const kind = resolveAnalysisSlug({
                  providerSlug: req.providerSlug,
                });
                const visual = ANALYSIS_KIND_VISUAL[kind];
                return (
                  <View style={styles.analysisRow}>
                    <View
                      style={[
                        styles.kindIcon,
                        { backgroundColor: visual.iconBg },
                      ]}
                    >
                      <AppIcon
                        icon={visual.icon}
                        size={22}
                        color={visual.accent}
                      />
                    </View>
                    <View style={styles.analysisBody}>
                      <View style={styles.analysisTitleRow}>
                        <Text style={styles.analysisTitle} numberOfLines={1}>
                          {visual.title}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            styles.statusBadgeProgress,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              styles.statusBadgeTextProgress,
                            ]}
                          >
                            En proceso
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.differential} numberOfLines={1}>
                        Pendiente en app del paciente
                      </Text>
                      <View style={styles.stampRow}>
                        <AppIcon
                          icon={Icons.calendarDay}
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
              const kind = resolveAnalysisSlug(analysis);
              const visual = ANALYSIS_KIND_VISUAL[kind];
              const status = historyStatusPresentation(
                analysisStatus(analysis),
              );
              const differential = analysisDifferentialDetail(
                kind,
                analysis.bodyRegion,
              );
              return (
                <Pressable
                  style={styles.analysisRow}
                  onPress={() => onOpenAnalysis?.(analysis.id)}
                >
                  <View
                    style={[
                      styles.kindIcon,
                      { backgroundColor: visual.iconBg },
                    ]}
                  >
                    <AppIcon
                      icon={visual.icon}
                      size={22}
                      color={visual.accent}
                    />
                  </View>
                  <View style={styles.analysisBody}>
                    <View style={styles.analysisTitleRow}>
                      <Text style={styles.analysisTitle} numberOfLines={1}>
                        {visual.title}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          status.tone === 'done' && styles.statusBadgeDone,
                          status.tone === 'progress' &&
                            styles.statusBadgeProgress,
                          status.tone === 'invalid' &&
                            styles.statusBadgeInvalid,
                          status.tone === 'other' && styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            status.tone === 'done' &&
                              styles.statusBadgeTextDone,
                            status.tone === 'progress' &&
                              styles.statusBadgeTextProgress,
                            status.tone === 'invalid' &&
                              styles.statusBadgeTextInvalid,
                            status.tone === 'other' &&
                              styles.statusBadgeTextPending,
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.differential} numberOfLines={1}>
                      {differential}
                    </Text>
                    <View style={styles.stampRow}>
                      <AppIcon
                        icon={Icons.calendarDay}
                        size={13}
                        color={primary}
                      />
                      <Text style={styles.stamp}>
                        {formatStamp(analysis.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <AppIcon
                    icon={Icons.chevronRight}
                    size={20}
                    color={primary}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <Modal
        visible={imageRequestOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sendingImage) setImageRequestOpen(false);
        }}
      >
        <Pressable
          style={styles.requestOverlay}
          onPress={() => {
            if (!sendingImage) setImageRequestOpen(false);
          }}
        >
          <Pressable
            style={styles.requestSheet}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.requestSheetTitle}>Solicitar imagen</Text>
            <Text style={styles.requestSheetSubtitle}>
              Captura o elige una foto y envíala al chat del paciente, o pídele
              que la adjunte.
            </Text>
            <Pressable
              style={[styles.requestOption, { borderColor: '#E5E7EB' }]}
              disabled={sendingImage}
              onPress={() => void captureAndSendImage('camera')}
            >
              <AppIcon icon={Icons.camera} size={20} color={primary} />
              <Text style={styles.requestOptionText}>Tomar foto y enviar</Text>
            </Pressable>
            <Pressable
              style={[styles.requestOption, { borderColor: '#E5E7EB' }]}
              disabled={sendingImage}
              onPress={() => void captureAndSendImage('library')}
            >
              <AppIcon icon={Icons.image} size={20} color={primary} />
              <Text style={styles.requestOptionText}>
                Elegir de galería y enviar
              </Text>
            </Pressable>
            <Pressable
              style={[styles.requestOption, { borderColor: '#E5E7EB' }]}
              disabled={sendingImage}
              onPress={() => void requestImageFromPatient()}
            >
              <AppIcon icon={Icons.chat} size={20} color={primary} />
              <Text style={styles.requestOptionText}>
                Pedir imagen al paciente
              </Text>
            </Pressable>
            {sendingImage ? (
              <ActivityIndicator color={primary} />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={requestPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!requestingSlug) setRequestPickerOpen(false);
        }}
      >
        <Pressable
          style={styles.requestOverlay}
          onPress={() => {
            if (!requestingSlug) setRequestPickerOpen(false);
          }}
        >
          <Pressable
            style={styles.requestSheet}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.requestSheetTitle}>Solicitar análisis</Text>
            <Text style={styles.requestSheetSubtitle}>
              El paciente completará el análisis desde «Nuevo Análisis» en su
              app.
            </Text>
            {ANALYSIS_TYPE_CARDS.map((card) => {
              const busy = requestingSlug === card.slug;
              const label = `${card.line1} ${card.line2}`;
              return (
                <Pressable
                  key={card.slug}
                  style={[
                    styles.requestOption,
                    {
                      backgroundColor: card.background,
                      borderColor: card.border,
                      opacity: requestingSlug && !busy ? 0.55 : 1,
                    },
                  ]}
                  disabled={!!requestingSlug}
                  onPress={() => void handleRequestAnalysis(card.slug)}
                >
                  <View
                    style={[
                      styles.requestOptionIcon,
                      { backgroundColor: card.iconBg },
                    ]}
                  >
                    <AppIcon
                      icon={card.icon}
                      size={20}
                      color={card.accent}
                    />
                  </View>
                  <Text
                    style={[styles.requestOptionText, { color: card.accent }]}
                  >
                    {label}
                  </Text>
                  {busy ? (
                    <ActivityIndicator size="small" color={card.accent} />
                  ) : (
                    <AppIcon
                      icon={Icons.chevronRight}
                      size={18}
                      color={card.accent}
                    />
                  )}
                </Pressable>
              );
            })}
            <Pressable
              style={styles.requestCancel}
              disabled={!!requestingSlug}
              onPress={() => setRequestPickerOpen(false)}
            >
              <Text style={styles.requestCancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
