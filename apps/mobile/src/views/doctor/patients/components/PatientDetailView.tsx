import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  analysisProviderLabel,
  analysisStatus,
  availableProvidersFromSubscriptions,
  type AnalysisProviderSlug,
} from '../../../../data/analysisProviderLabel';
import { ApiError } from '../../../../services/api.client';
import {
  patientsService,
  type UpdatePatientInput,
} from '../../../../services/patients.service';
import { subscriptionsService } from '../../../../services/subscriptions.service';
import type { PatientAnalysisSummary } from '../../../../types/analysis';
import type { PatientProfile } from '../../../../types/patient';
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await patientsService.listAnalyses(patient.id);
        if (!cancelled) setAnalyses([...list].reverse());
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

        <View style={styles.identity}>
          <Pressable
            style={styles.avatar}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel="Editar datos del paciente"
          >
            <Text style={styles.avatarText}>{initials(patient)}</Text>
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
          <Text style={styles.meta}>Edad: {ageFromBirth(patient.birthDate)}</Text>

          <View style={styles.newAnalysisSection}>
            <Text style={styles.newAnalysisHint}>Nuevo análisis</Text>
            {loadingPlans ? (
              <ActivityIndicator color={primary} />
            ) : availableProviders.length === 0 ? (
              <View style={styles.providerEmpty}>
                <Text style={styles.providerEmptyText}>
                  No tienes planes activos con créditos. Revisa tu suscripción
                  para iniciar un análisis.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.providerScroll}
                contentContainerStyle={styles.providerScrollContent}
              >
                {availableProviders.map((provider) => (
                  <Pressable
                    key={provider.slug}
                    style={styles.providerPill}
                    onPress={() => handleStart(provider.slug, provider.label)}
                  >
                    <Text style={styles.providerPillText}>{provider.label}</Text>
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
                  'La agenda se conectará próximamente.',
                )
              }
            >
              <AppIcon icon={Icons.calendarClock} size={16} color={primary} />
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
              <Text style={styles.historyActionText}>Solicitar Imagen</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <FlatList
            data={analyses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Este paciente aún no tiene análisis registrados.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const typeLabel = analysisProviderLabel(item);
              const status = analysisStatus(item);
              const diagnosis = analysisDiagnosis(item);
              const region = item.bodyRegion?.trim() || '—';
              const thumb = item.coloredUrl || item.imageUrl;
              return (
                <Pressable
                  style={styles.analysisRow}
                  onPress={() => onOpenAnalysis?.(item.id)}
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
                        {formatStamp(item.createdAt)}
                        {item.sharedWithPatient ? ' · Compartido' : ''}
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
