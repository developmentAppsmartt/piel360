import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import {
  analysisProviderLabel,
  analysisStatus,
} from '../../../data/analysisProviderLabel';
import { ApiError } from '../../../services/api.client';
import { agendaService } from '../../../services/agenda.service';
import { analysesService } from '../../../services/analyses.service';
import { doctorsService } from '../../../services/doctors.service';
import { patientsService } from '../../../services/patients.service';
import type { PatientAnalysisSummary } from '../../../types/analysis';
import type { PatientProfile } from '../../../types/patient';
import { patientDisplayName } from '../../../types/patient';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { AnalysisDetailView } from '../analyses/AnalysisDetailView';
import { AccountDrawer } from '../patients/components/AccountDrawer';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { PaymentsBillingView } from '../payments/PaymentsBillingView';
import { PaymentsView } from '../payments/PaymentsView';
import { DiagnosisLanguageView } from '../settings/DiagnosisLanguageView';
import { createDoctorHomeStyles } from './styles/home.styles';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { DoctorStatsView } from './DoctorStatsView';

type DoctorHomeViewProps = {
  onOpenPatients: () => void;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
  onOpenAgenda?: () => void;
};

const PENDING_APPOINTMENT_STATUSES = new Set(['proposed', 'requested']);
const CONFIRMED_APPOINTMENT_STATUS = 'confirmed';

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function lastNameFromUserName(name: string | undefined): string {
  const raw = (name ?? '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/^dr\.?\s+/i, '');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? cleaned;
}

function doctorTitleFallback(name: string | undefined): string {
  const last = lastNameFromUserName(name);
  return last ? `Dr. ${last}` : 'Doctor';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function analysisPatientName(a: PatientAnalysisSummary): string {
  if (a.patient) {
    return patientDisplayName(a.patient);
  }
  return 'Paciente';
}

export function DoctorHomeView({
  onOpenPatients,
  onOpenMessages,
  onOpenProfile,
  onOpenAgenda,
}: DoctorHomeViewProps) {
  const branding = useBranding();
  const { user, logout } = useAuth();
  const styles = useMemo(
    () => createDoctorHomeStyles(branding.colors),
    [branding.colors],
  );
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [analyses, setAnalyses] = useState<PatientAnalysisSummary[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [appointmentsConfirmed, setAppointmentsConfirmed] = useState(0);
  const [appointmentsPending, setAppointmentsPending] = useState(0);
  const [doctorLastName, setDoctorLastName] = useState(
    lastNameFromUserName(user?.name),
  );
  const [doctorAvatarUrl, setDoctorAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);
  const [showingLanguage, setShowingLanguage] = useState(false);
  const [showingBilling, setShowingBilling] = useState(false);
  const [showingStats, setShowingStats] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const from = ymdLocal(startOfLocalDay());
      const toDay = ymdLocal(addDays(startOfLocalDay(), 60));
      const [list, analysisList, doctor, agenda] = await Promise.all([
        patientsService.list(),
        analysesService.list().catch(() => [] as PatientAnalysisSummary[]),
        doctorsService.getMe().catch(() => null),
        agendaService.getOverview(from, `${toDay}T23:59:59.999`).catch(() => null),
      ]);
      setPatients(list);
      setAnalyses(analysisList);
      const dayStart = startOfLocalDay().getTime();
      let confirmed = 0;
      let pending = 0;
      for (const a of agenda?.appointments ?? []) {
        const start = new Date(a.startsAt).getTime();
        if (Number.isNaN(start) || start < dayStart) continue;
        if (a.status === CONFIRMED_APPOINTMENT_STATUS) confirmed += 1;
        else if (PENDING_APPOINTMENT_STATUSES.has(a.status)) pending += 1;
      }
      setAppointmentsConfirmed(confirmed);
      setAppointmentsPending(pending);
      setAppointmentsCount(confirmed + pending);
      if (doctor?.lastName?.trim()) {
        setDoctorLastName(doctor.lastName.trim());
      }
      setDoctorAvatarUrl(resolveMediaUrl(doctor?.avatarUrl));
    } catch (err) {
      Alert.alert(
        'Inicio',
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las métricas.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const welcomeName = doctorLastName
    ? `Dr. ${doctorLastName}`
    : doctorTitleFallback(user?.name);
  const primary = branding.colors.primary;
  const primaryDark = branding.colors.primaryDark;
  const secondary = branding.colors.secondary;

  const dermatologicoCount = useMemo(
    () =>
      analyses.filter((a) => !a.youcamTaskId && !a.fitzpatrickTaskId).length,
    [analyses],
  );
  const esteticoCount = useMemo(
    () => analyses.filter((a) => !!a.youcamTaskId).length,
    [analyses],
  );
  const fototipoCount = useMemo(
    () => analyses.filter((a) => !!a.fitzpatrickTaskId).length,
    [analyses],
  );
  const pendingCount = useMemo(
    () => analyses.filter((a) => !a.isConfirmed && a.isValid !== false).length,
    [analyses],
  );

  const recent = useMemo(
    () =>
      [...analyses]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 8),
    [analyses],
  );

  const handleMenuSelect = (id: string) => {
    setMenuOpen(false);
    if (id === 'salir') void logout();
    else if (id === 'perfil' || id === 'config') onOpenProfile?.();
    else if (id === 'suscripcion') {
      setShowingLanguage(false);
      setShowingBilling(false);
      setShowingPayments(true);
    } else if (id === 'idioma') {
      setShowingPayments(false);
      setShowingBilling(false);
      setShowingLanguage(true);
    } else if (id === 'pagos') {
      setShowingPayments(false);
      setShowingLanguage(false);
      setShowingBilling(true);
    }
    else if (id === 'acerca')
      Alert.alert(
        'Acerca de Piel 360',
        'Piel 360 AI — versión 1.0.0\nApoyo diagnóstico dermatológico con IA.',
      );
    else
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
  };

  const stats: {
    value: string;
    label: string;
    hint?: string;
    icon: AppIconName;
    iconColor: string;
    onPress?: () => void;
  }[] = [
    {
      value: String(patients.length),
      label: 'Pacientes',
      icon: Icons.accountGroup,
      iconColor: primary,
      onPress: onOpenPatients,
    },
    {
      value: String(dermatologicoCount),
      label: 'Dermatológico',
      icon: Icons.dermAnalysis,
      iconColor: '#0D9488',
    },
    {
      value: String(esteticoCount),
      label: 'Estético',
      icon: Icons.aesthetic,
      iconColor: '#7C3AED',
    },
    {
      value: String(fototipoCount),
      label: 'Fototipo',
      icon: Icons.fototipo,
      iconColor: '#B45309',
    },
    {
      value: String(appointmentsCount),
      label: 'Nuevas Citas',
      hint: `${appointmentsConfirmed} conf. · ${appointmentsPending} pend.`,
      icon: Icons.calendarPlus,
      iconColor: primaryDark,
      onPress: onOpenAgenda,
    },
    {
      value: String(dermatologicoCount + esteticoCount + fototipoCount),
      label: 'Estadísticas',
      icon: Icons.chartBar,
      iconColor: '#0D9488',
      onPress: () => setShowingStats(true),
    },
  ];

  if (showingLanguage) {
    return (
      <>
        <DiagnosisLanguageView
          onBack={() => setShowingLanguage(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant="doctor"
        />
      </>
    );
  }

  if (showingBilling) {
    return (
      <>
        <PaymentsBillingView
          onBack={() => setShowingBilling(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant="doctor"
        />
      </>
    );
  }

  if (showingPayments) {
    return (
      <>
        <PaymentsView
          onBack={() => setShowingPayments(false)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant="doctor"
        />
      </>
    );
  }

  if (showingStats) {
    return (
      <DoctorStatsView
        dermatologicoCount={dermatologicoCount}
        esteticoCount={esteticoCount}
        fototipoCount={fototipoCount}
        pendingCount={pendingCount}
        patientsCount={patients.length}
        onBack={() => setShowingStats(false)}
      />
    );
  }

  if (selectedAnalysisId) {
    const selected = analyses.find((a) => a.id === selectedAnalysisId);
    return (
      <>
        <AnalysisDetailView
          analysisId={selectedAnalysisId}
          patientName={
            selected ? analysisPatientName(selected) : undefined
          }
          onBack={() => setSelectedAnalysisId(null)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant="doctor"
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        messageCount={1}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenMessages={onOpenMessages}
        onOpenGift={() =>
          Alert.alert(
            'Premios',
            'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
          )
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={primary}
          />
        }
      >
        <View style={styles.welcomeRow}>
          <Pressable
            style={styles.avatar}
            onPress={onOpenProfile}
            accessibilityLabel="Mi cuenta"
          >
            {doctorAvatarUrl ? (
              <Image
                source={{ uri: doctorAvatarUrl }}
                style={styles.avatarImage}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text style={styles.avatarText}>
                {initials(welcomeName.replace(/^Dr\.\s*/i, '')) || 'DR'}
              </Text>
            )}
          </Pressable>
          <View style={styles.welcomeTextWrap}>
            <Text style={styles.welcomeLabel}>Bienvenido,</Text>
            <Text style={styles.welcomeName}>{welcomeName}</Text>
            {!loading && pendingCount > 0 ? (
              <Text style={styles.pendingHint}>
                {pendingCount} análisis pendiente{pendingCount === 1 ? '' : 's'}{' '}
                de confirmar
              </Text>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {[0, 1].map((row) => (
                <View key={`stats-row-${row}`} style={styles.statsRow}>
                  {stats.slice(row * 3, row * 3 + 3).map((s) => (
                    <Pressable
                      key={s.label}
                      style={styles.statCard}
                      onPress={s.onPress}
                      disabled={!s.onPress}
                    >
                      <View
                        style={[
                          styles.statIconWrap,
                          { backgroundColor: `${s.iconColor}22` },
                        ]}
                      >
                        <AppIcon icon={s.icon} size={22} color={s.iconColor} />
                      </View>
                      <Text style={[styles.statValue, { color: s.iconColor }]}>
                        {s.value}
                      </Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                      {s.hint ? (
                        <Text style={styles.statHint}>{s.hint}</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={onOpenPatients}
                accessibilityLabel="Mis Pacientes"
              >
                <LinearGradient
                  colors={[primaryDark, secondary]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.actionBtnInner}
                >
                  <AppIcon
                    icon={Icons.accountGroup}
                    size={20}
                    color={branding.colors.textOnDark}
                  />
                  <Text style={styles.actionBtnText}>Mis Pacientes</Text>
                  <AppIcon
                    icon={Icons.chevronRight}
                    size={18}
                    color={branding.colors.textOnDark}
                  />
                </LinearGradient>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => setShowingStats(true)}
                accessibilityLabel="Estadísticas"
              >
                <LinearGradient
                  colors={[secondary, '#7C3AED']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.actionBtnInner}
                >
                  <AppIcon
                    icon={Icons.chartBar}
                    size={20}
                    color={branding.colors.textOnDark}
                  />
                  <Text style={styles.actionBtnText}>Estadísticas</Text>
                  <AppIcon
                    icon={Icons.chevronRight}
                    size={18}
                    color={branding.colors.textOnDark}
                  />
                </LinearGradient>
              </Pressable>
            </View>

            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Actividad reciente</Text>
                <Pressable
                  onPress={onOpenPatients}
                  hitSlop={8}
                  accessibilityLabel="Ver todas"
                >
                  <Text style={styles.sectionLink}>Ver todas ›</Text>
                </Pressable>
              </View>
              <View style={styles.activityCard}>
                {recent.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                      Aún no hay análisis. Crea un paciente e inicia un análisis
                      desde Mis Pacientes.
                    </Text>
                  </View>
                ) : (
                  recent.map((item) => {
                    const name = analysisPatientName(item);
                    const status = analysisStatus(item);
                    const typeLabel = analysisProviderLabel(item);
                    return (
                      <Pressable
                        key={item.id}
                        style={styles.activityRow}
                        onPress={() => setSelectedAnalysisId(item.id)}
                      >
                        <View style={styles.activityAvatar}>
                          <Text style={styles.activityAvatarText}>
                            {initials(name) || 'P'}
                          </Text>
                        </View>
                        <View style={styles.activityBody}>
                          <Text style={styles.activityName}>{name}</Text>
                          <Text style={styles.activityMeta}>
                            {typeLabel} ·{' '}
                            {new Date(item.createdAt).toLocaleDateString(
                              'es-CO',
                            )}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            status.kind === 'pending' && styles.badgePending,
                            status.kind === 'confirmed' && styles.badgeDone,
                            status.kind === 'corrected' && styles.badgeDone,
                            status.kind === 'invalid' && styles.badgeInvalid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              status.kind === 'pending' &&
                                styles.badgeTextPending,
                              (status.kind === 'confirmed' ||
                                status.kind === 'corrected') &&
                                styles.badgeTextDone,
                              status.kind === 'invalid' &&
                                styles.badgeTextInvalid,
                            ]}
                          >
                            {status.label}
                          </Text>
                        </View>
                        <AppIcon
                          icon={Icons.chevronRight}
                          size={18}
                          color={branding.colors.muted}
                        />
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
        variant="doctor"
      />
    </View>
  );
}
