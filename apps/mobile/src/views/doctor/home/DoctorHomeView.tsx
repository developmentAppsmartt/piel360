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
import { PaymentsView } from '../payments/PaymentsView';
import { createDoctorHomeStyles } from './styles/home.styles';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';

const DOCTOR_AVATAR = require('../../../../assets/doctor-avatar.png');

type DoctorHomeViewProps = {
  onOpenPatients: () => void;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
};

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
  const [doctorLastName, setDoctorLastName] = useState(
    lastNameFromUserName(user?.name),
  );
  const [doctorAvatarUrl, setDoctorAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const [list, analysisList, doctor] = await Promise.all([
        patientsService.list(),
        analysesService.list().catch(() => [] as PatientAnalysisSummary[]),
        doctorsService.getMe().catch(() => null),
      ]);
      setPatients(list);
      setAnalyses(analysisList);
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
    else if (id === 'suscripcion') setShowingPayments(true);
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
    value: number;
    label: string;
    icon: AppIconName;
  }[] = [
    {
      value: patients.length,
      label: 'Pacientes',
      icon: Icons.accountGroup,
    },
    {
      value: dermatologicoCount,
      label: 'Dermatológico',
      icon: Icons.skin,
    },
    {
      value: esteticoCount,
      label: 'Estético',
      icon: Icons.smile,
    },
    {
      value: fototipoCount,
      label: 'Fototipo',
      icon: Icons.heartPulse,
    },
  ];

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
        <View style={styles.topRow}>
          <Pressable
            style={styles.avatar}
            onPress={onOpenProfile}
            accessibilityLabel="Mi cuenta"
          >
            <Image
              source={
                doctorAvatarUrl ? { uri: doctorAvatarUrl } : DOCTOR_AVATAR
              }
              style={styles.avatarImage}
              accessibilityIgnoresInvertColors
            />
          </Pressable>
          <Pressable
            style={styles.bellBtn}
            onPress={onOpenMessages}
            accessibilityLabel="Notificaciones"
          >
            <AppIcon icon={Icons.bell} size={22} color={primary} />
          </Pressable>
        </View>

        <View>
          <Text style={styles.welcomeLabel}>Bienvenido,</Text>
          <Text style={styles.welcomeName}>{welcomeName}</Text>
          {!loading && pendingCount > 0 ? (
            <Text style={styles.pendingHint}>
              {pendingCount} análisis pendiente{pendingCount === 1 ? '' : 's'}{' '}
              de confirmar
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                {stats.slice(0, 2).map((s) => (
                  <View key={s.label} style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <AppIcon icon={s.icon} size={18} color={primary} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.statsRow}>
                {stats.slice(2, 4).map((s) => (
                  <View key={s.label} style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <AppIcon icon={s.icon} size={18} color={primary} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actionsRow}>
              {(
                [
                  {
                    label: 'Nuevos Casos',
                    onPress: onOpenPatients,
                  },
                  { label: 'Mis Pacientes', onPress: onOpenPatients },
                  {
                    label: 'Estadísticas',
                    onPress: () =>
                      Alert.alert(
                        'Resumen de análisis',
                        [
                          `Dermatológico: ${dermatologicoCount}`,
                          `Estético: ${esteticoCount}`,
                          `Fototipo: ${fototipoCount}`,
                          `Pendientes de confirmar: ${pendingCount}`,
                          `Total: ${analyses.length}`,
                        ].join('\n'),
                      ),
                  },
                ] as const
              ).map((action) => (
                <Pressable
                  key={action.label}
                  style={styles.actionBtn}
                  onPress={action.onPress}
                >
                  <LinearGradient
                    colors={[primaryDark, secondary]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.actionBtnInner}
                  >
                    <Text style={styles.actionBtnText}>{action.label}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>

            <View>
              <Text style={styles.sectionTitle}>Actividad reciente</Text>
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
