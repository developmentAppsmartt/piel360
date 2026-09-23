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
import { AboutPiel360Modal } from '../../../components/about/AboutPiel360';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import { LegalDocumentModal } from '../../../components/legal/LegalDocumentModal';
import { HomeRemindersStack } from '../../../components/notifications/HomeRemindersStack';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import {
  useNotificationsOptional,
} from '../../../context/NotificationsContext';
import {
  analysisProviderLabel,
  analysisStatus,
} from '../../../data/analysisProviderLabel';
import type { LegalDocId } from '../../../data/legal/documents';
import { ApiError } from '../../../services/api.client';
import { agendaService, type AgendaAppointment } from '../../../services/agenda.service';
import { analysesService } from '../../../services/analyses.service';
import { doctorsService } from '../../../services/doctors.service';
import { notificationsService } from '../../../services/notifications.service';
import { patientsService } from '../../../services/patients.service';
import type { PatientAnalysisSummary } from '../../../types/analysis';
import type { AppNotification } from '../../../types/notifications';
import {
  conversationIdFromNotification,
  isAppointmentNotification,
  selectHomeReminders,
} from '../../../types/notifications';
import type { PatientProfile } from '../../../types/patient';
import { patientDisplayName } from '../../../types/patient';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { SupportChatView } from '../../support/SupportChatView';
import { ChangePasswordFlow } from '../../auth/forgot-password/ForgotPasswordView';
import { AnalysisDetailView } from '../analyses/AnalysisDetailView';
import { AccountDrawer } from '../patients/components/AccountDrawer';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { PaymentsBillingView } from '../payments/PaymentsBillingView';
import { PaymentsView } from '../payments/PaymentsView';
import { DoctorReportsView } from '../reports/DoctorReportsView';
import { FitzpatrickRulesView } from '../clinical-rules/FitzpatrickRulesView';
import { SkinAgeRulesView } from '../clinical-rules/SkinAgeRulesView';
import { DiagnosisLanguageView } from '../settings/DiagnosisLanguageView';
import { createDoctorHomeStyles } from './styles/home.styles';
import { DoctorStatsView } from './DoctorStatsView';
import { InviteColleagueModal } from './InviteColleagueModal';

type DoctorHomeViewProps = {
  onOpenPatients: () => void;
  onOpenMessages?: () => void;
  onOpenChat?: (conversationId?: string) => void;
  onOpenProfile?: () => void;
  onOpenAgenda?: () => void;
  onShowingStatsChange?: (showing: boolean) => void;
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

/** Nombre completo para saludo: Nombre + Apellido. */
function fullDoctorName(
  firstName?: string | null,
  lastName?: string | null,
  fallbackUserName?: string | null,
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  const fromUser = (fallbackUserName ?? '').trim().replace(/^dr\.?\s+/i, '');
  if (fromUser) return fromUser;
  return 'Profesional';
}

function doctorTitleFallback(name: string | undefined): string {
  const last = lastNameFromUserName(name);
  return last || 'Profesional';
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

function appointmentPatientName(a: AgendaAppointment): string {
  if (a.patient) {
    return patientDisplayName(a.patient);
  }
  return 'Paciente';
}

function formatAppointmentStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} - ${time}`;
}

function doctorAppointmentActivity(a: AgendaAppointment): {
  meta: string;
  label: string;
  kind: 'request' | 'done' | 'invalid' | 'pending';
} {
  const when = formatAppointmentStamp(a.startsAt);
  if (a.status === 'requested') {
    return {
      meta: `Solicitó una cita para el ${when}`,
      label: 'Nueva solicitud',
      kind: 'request',
    };
  }
  if (a.status === 'confirmed' && a.initiatedBy === 'doctor') {
    return {
      meta: `Aceptó tu cita para el ${when}`,
      label: 'Cita aceptada',
      kind: 'done',
    };
  }
  if (a.status === 'confirmed') {
    return {
      meta: `Confirmó su cita para el ${when}`,
      label: 'Cita confirmada',
      kind: 'done',
    };
  }
  if (a.status === 'declined') {
    return {
      meta: `Rechazó la cita del ${when}`,
      label: 'Cita rechazada',
      kind: 'invalid',
    };
  }
  if (a.status === 'cancelled') {
    return {
      meta: `Canceló la cita del ${when}`,
      label: 'Cita cancelada',
      kind: 'invalid',
    };
  }
  return {
    meta: `Cita para el ${when}`,
    label: 'Cita',
    kind: 'pending',
  };
}

export function DoctorHomeView({
  onOpenPatients,
  onOpenMessages,
  onOpenChat,
  onOpenProfile,
  onOpenAgenda,
  onShowingStatsChange,
}: DoctorHomeViewProps) {
  const branding = useBranding();
  const { user, logout } = useAuth();
  const notifications = useNotificationsOptional();
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
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [appointmentsConfirmed, setAppointmentsConfirmed] = useState(0);
  const [appointmentsPending, setAppointmentsPending] = useState(0);
  const [homeNotices, setHomeNotices] = useState<AppNotification[]>([]);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<string[]>(
    [],
  );
  const [doctorDisplayName, setDoctorDisplayName] = useState(() =>
    fullDoctorName(undefined, undefined, user?.name),
  );
  const [doctorAvatarUrl, setDoctorAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);
  const [showingLanguage, setShowingLanguage] = useState(false);
  const [showingBilling, setShowingBilling] = useState(false);
  const [showingSupport, setShowingSupport] = useState(false);
  const [showingPassword, setShowingPassword] = useState(false);
  const [showingStats, setShowingStats] = useState(false);
  const [showingAbout, setShowingAbout] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showingReports, setShowingReports] = useState(false);
  const [showingFototipo, setShowingFototipo] = useState(false);
  const [showingEdadPiel, setShowingEdadPiel] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onShowingStatsChange?.(showingStats);
    return () => onShowingStatsChange?.(false);
  }, [showingStats, onShowingStatsChange]);

  const load = useCallback(async () => {
    try {
      const from = ymdLocal(startOfLocalDay());
      const toDay = ymdLocal(addDays(startOfLocalDay(), 60));
      const [list, analysisList, doctor, agenda, notices] = await Promise.all([
        patientsService.list(),
        analysesService.list().catch(() => [] as PatientAnalysisSummary[]),
        doctorsService.getMe().catch(() => null),
        agendaService.getOverview(from, `${toDay}T23:59:59.999`).catch(() => null),
        notificationsService.list(30).catch(() => [] as AppNotification[]),
      ]);
      setPatients(list);
      setAnalyses(analysisList);
      const dayStart = startOfLocalDay().getTime();
      let confirmed = 0;
      let pending = 0;
      const agendaAppointments = agenda?.appointments ?? [];
      for (const a of agendaAppointments) {
        const start = new Date(a.startsAt).getTime();
        if (Number.isNaN(start) || start < dayStart) continue;
        if (a.status === CONFIRMED_APPOINTMENT_STATUS) confirmed += 1;
        else if (PENDING_APPOINTMENT_STATUSES.has(a.status)) pending += 1;
      }
      setAppointments(agendaAppointments);
      setAppointmentsConfirmed(confirmed);
      setAppointmentsPending(pending);
      setAppointmentsCount(confirmed + pending);
      setHomeNotices(notices);
      setDoctorDisplayName(
        fullDoctorName(doctor?.firstName, doctor?.lastName, user?.name),
      );
      setDoctorAvatarUrl(resolveMediaUrl(doctor?.avatarUrl));
      void notifications?.refreshUnread();
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
  }, [user?.name, notifications]);

  useEffect(() => {
    void load();
  }, [load]);

  const welcomeName = doctorDisplayName || doctorTitleFallback(user?.name);
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

  const recentAppointments = useMemo(
    () =>
      [...appointments]
        .filter((a) =>
          ['requested', 'confirmed', 'declined', 'cancelled'].includes(
            a.status,
          ),
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt ?? b.startsAt).getTime() -
            new Date(a.updatedAt ?? a.startsAt).getTime(),
        )
        .slice(0, 6),
    [appointments],
  );

  const homeReminders = useMemo(
    () =>
      selectHomeReminders(homeNotices, {
        dismissedIds: new Set(dismissedReminderIds),
        limit: 3,
      }),
    [homeNotices, dismissedReminderIds],
  );

  async function dismissHomeReminder(item: AppNotification) {
    setDismissedReminderIds((prev) =>
      prev.includes(item.id) ? prev : [...prev, item.id],
    );
    setHomeNotices((prev) =>
      prev.map((n) =>
        n.id === item.id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      ),
    );
    await notifications?.consumeNotification(item.id).catch(() => undefined);
  }

  function openHomeReminder(item: AppNotification) {
    void dismissHomeReminder(item);
    if (item.type === 'message') {
      const conversationId = conversationIdFromNotification(item.data);
      onOpenChat?.(conversationId ?? undefined);
      return;
    }
    if (isAppointmentNotification(item.type)) {
      onOpenAgenda?.();
      return;
    }
    onOpenMessages?.();
  }

  const handleMenuSelect = (id: string) => {
    setMenuOpen(false);
    if (id === 'salir') void logout();
    else if (id === 'perfil' || id === 'config') onOpenProfile?.();
    else if (id === 'suscripcion') {
      setShowingLanguage(false);
      setShowingBilling(false);
      setShowingReports(false);
      setShowingFototipo(false);
      setShowingEdadPiel(false);
      setShowingPayments(true);
    } else if (id === 'idioma') {
      setShowingPayments(false);
      setShowingBilling(false);
      setShowingLanguage(true);
    } else if (id === 'pagos') {
      setShowingPayments(false);
      setShowingLanguage(false);
      setShowingBilling(true);
    } else if (id === 'soporte') {
      setShowingPayments(false);
      setShowingLanguage(false);
      setShowingBilling(false);
      setShowingSupport(true);
    } else if (id === 'password') {
      setShowingPassword(true);
    } else if (id === 'acuerdo') {
      setLegalDoc('terms-professional');
    } else if (id === 'acerca') {
      setShowingAbout(true);
    } else if (id === 'compartir') {
      setInviteOpen(true);
    } else if (id === 'reportes') {
      setShowingFototipo(false);
      setShowingEdadPiel(false);
      setShowingReports(true);
    } else if (id === 'fototipo') {
      setShowingReports(false);
      setShowingEdadPiel(false);
      setShowingFototipo(true);
    } else if (id === 'edad_piel') {
      setShowingReports(false);
      setShowingFototipo(false);
      setShowingEdadPiel(true);
    } else
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

  if (showingSupport) {
    return <SupportChatView onClose={() => setShowingSupport(false)} />;
  }

  if (showingPassword) {
    return (
      <ChangePasswordFlow
        title="Cambiar contraseña"
        initialEmail={user?.email ?? ''}
        onBack={() => setShowingPassword(false)}
        onSuccess={() => setShowingPassword(false)}
      />
    );
  }

  if (showingReports) {
    return (
      <DoctorReportsView
        onBack={() => setShowingReports(false)}
        onOpenMessages={onOpenMessages}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  if (showingFototipo) {
    return (
      <FitzpatrickRulesView
        onBack={() => setShowingFototipo(false)}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  if (showingEdadPiel) {
    return (
      <SkinAgeRulesView
        onBack={() => setShowingEdadPiel(false)}
        onOpenMessages={onOpenMessages}
      />
    );
  }

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
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
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
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
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
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
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
        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
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
                {initials(welcomeName) || '?'}
              </Text>
            )}
          </Pressable>
          <View style={styles.welcomeTextWrap}>
            <Text style={styles.welcomeLabel}>Bienvenido,</Text>
            <View style={styles.welcomeNameRow}>
              <Text style={styles.welcomeName} numberOfLines={1}>
                {welcomeName}
              </Text>
              <Pressable
                style={styles.inviteBtn}
                onPress={() => setInviteOpen(true)}
                accessibilityLabel="Invitar a un colega"
                hitSlop={6}
              >
                <AppIcon
                  icon={Icons.share}
                  size={18}
                  color={branding.colors.primary}
                />
              </Pressable>
            </View>
            {!loading && pendingCount > 0 ? (
              <Text style={styles.pendingHint}>
                {pendingCount} análisis pendiente{pendingCount === 1 ? '' : 's'}{' '}
                de confirmar
              </Text>
            ) : null}
          </View>
        </View>

        <HomeRemindersStack
          items={homeReminders}
          role="doctor"
          embedded
          onDismiss={(item) => void dismissHomeReminder(item)}
          onPress={openHomeReminder}
        />

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
                {recentAppointments.length === 0 && recent.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                      Aún no hay actividad. Las citas y análisis recientes
                      aparecerán aquí.
                    </Text>
                  </View>
                ) : (
                  <>
                    {recentAppointments.map((item) => {
                      const name = appointmentPatientName(item);
                      const activity = doctorAppointmentActivity(item);
                      return (
                        <Pressable
                          key={`appt-${item.id}`}
                          style={styles.activityRow}
                          onPress={() => onOpenAgenda?.()}
                        >
                          <View style={styles.activityAvatar}>
                            <Text style={styles.activityAvatarText}>
                              {initials(name) || 'P'}
                            </Text>
                          </View>
                          <View style={styles.activityBody}>
                            <Text style={styles.activityName}>{name}</Text>
                            <Text style={styles.activityMeta}>
                              {activity.meta}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.badge,
                              activity.kind === 'request' &&
                                styles.badgeRequest,
                              activity.kind === 'done' && styles.badgeDone,
                              activity.kind === 'invalid' &&
                                styles.badgeInvalid,
                              activity.kind === 'pending' &&
                                styles.badgePending,
                            ]}
                          >
                            <View style={styles.activityBadgeRow}>
                              <AppIcon
                                icon={
                                  activity.kind === 'request'
                                    ? Icons.calendarPlus
                                    : activity.kind === 'done'
                                      ? Icons.check
                                      : activity.kind === 'invalid'
                                        ? Icons.close
                                        : Icons.calendarDay
                                }
                                size={12}
                                color={
                                  activity.kind === 'request'
                                    ? '#1D4ED8'
                                    : activity.kind === 'done'
                                      ? '#15803D'
                                      : activity.kind === 'invalid'
                                        ? '#B91C1C'
                                        : '#B45309'
                                }
                              />
                              <Text
                                style={[
                                  styles.badgeText,
                                  activity.kind === 'request' &&
                                    styles.badgeTextRequest,
                                  activity.kind === 'done' &&
                                    styles.badgeTextDone,
                                  activity.kind === 'invalid' &&
                                    styles.badgeTextInvalid,
                                  activity.kind === 'pending' &&
                                    styles.badgeTextPending,
                                ]}
                              >
                                {activity.label}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                    {recent.map((item) => {
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
                    })}
                  </>
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
      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={() => setLegalDoc(null)}
      />
      <AboutPiel360Modal
        visible={showingAbout}
        onClose={() => setShowingAbout(false)}
      />
      <InviteColleagueModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </View>
  );
}
