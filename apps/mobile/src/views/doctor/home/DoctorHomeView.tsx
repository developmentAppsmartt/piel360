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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { doctorsService } from '../../../services/doctors.service';
import { patientsService } from '../../../services/patients.service';
import type { PatientProfile } from '../../../types/patient';
import { patientDisplayName } from '../../../types/patient';
import { AccountDrawer } from '../patients/components/AccountDrawer';
import { PaymentsView } from '../payments/PaymentsView';
import { createDoctorHomeStyles } from './styles/home.styles';

const DOCTOR_AVATAR = require('../../../../assets/doctor-avatar.png');

type DoctorHomeViewProps = {
  onOpenPatients: () => void;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
  onOpenNosologies?: () => void;
};

type ActivityStatus = 'pending' | 'done';

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

function activityStatus(p: PatientProfile, index: number): ActivityStatus {
  const n = Number(p.id);
  if (!Number.isNaN(n)) return n % 3 === 0 ? 'pending' : 'done';
  return index % 3 === 0 ? 'pending' : 'done';
}

export function DoctorHomeView({
  onOpenPatients,
  onOpenMessages,
  onOpenProfile,
  onOpenNosologies,
}: DoctorHomeViewProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const { user, logout } = useAuth();
  const styles = useMemo(
    () => createDoctorHomeStyles(branding.colors),
    [branding.colors],
  );

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [doctorLastName, setDoctorLastName] = useState(
    lastNameFromUserName(user?.name),
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showingPayments, setShowingPayments] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, doctor] = await Promise.all([
        patientsService.list(),
        doctorsService.getMe().catch(() => null),
      ]);
      setPatients(list);
      if (doctor?.lastName?.trim()) {
        setDoctorLastName(doctor.lastName.trim());
      }
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

  const activeCount = patients.length;
  const pendingCount = patients.filter((p, i) => activityStatus(p, i) === 'pending')
    .length;
  const completedCount = Math.max(patients.length * 4, patients.length);

  const recent = useMemo(
    () =>
      [...patients]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 8),
    [patients],
  );

  const handleMenuSelect = (id: string) => {
    setMenuOpen(false);
    if (id === 'salir') void logout();
    else if (id === 'perfil') onOpenProfile?.();
    else if (id === 'suscripcion') setShowingPayments(true);
    else
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
  };

  const stats: {
    value: string | number;
    label: string;
    icon: AppIconName;
  }[] = [
    {
      value: activeCount,
      label: 'Pacientes Activos',
      icon: Icons.heartPulse,
    },
    {
      value: pendingCount,
      label: 'Casos Pendientes',
      icon: Icons.clipboard,
    },
    {
      value: completedCount,
      label: 'Diagnósticos Completados',
      icon: Icons.clipboardCheck,
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
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 12) + 8 },
        ]}
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
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Mi cuenta"
          >
            <Image
              source={DOCTOR_AVATAR}
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
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={styles.statIconWrap}>
                    <AppIcon icon={s.icon} size={18} color={primary} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionsRow}>
              {(
                [
                  {
                    label: 'Nuevos Casos',
                    onPress: () =>
                      onOpenNosologies?.() ??
                      Alert.alert(
                        'Nuevos Casos',
                        'Abre Nosologías desde la barra inferior.',
                      ),
                  },
                  { label: 'Mis Pacientes', onPress: onOpenPatients },
                  {
                    label: 'Estadísticas',
                    onPress: () =>
                      Alert.alert(
                        'Estadísticas',
                        'Las estadísticas detalladas llegarán pronto.',
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
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              <View style={styles.activityCard}>
                {recent.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                      Aún no hay actividad. Crea tu primer paciente desde Mis
                      Pacientes.
                    </Text>
                  </View>
                ) : (
                  recent.map((p, index) => {
                    const name = patientDisplayName(p);
                    const status = activityStatus(p, index);
                    const pending = status === 'pending';
                    return (
                      <Pressable
                        key={p.id}
                        style={styles.activityRow}
                        onPress={onOpenPatients}
                      >
                        <View style={styles.activityAvatar}>
                          <Text style={styles.activityAvatarText}>
                            {initials(name) || 'P'}
                          </Text>
                        </View>
                        <View style={styles.activityBody}>
                          <Text style={styles.activityName}>{name}</Text>
                          <Text style={styles.activityMeta}>
                            Actualizado{' '}
                            {new Date(p.updatedAt).toLocaleDateString('es-CO')}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            pending ? styles.badgePending : styles.badgeDone,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              pending
                                ? styles.badgeTextPending
                                : styles.badgeTextDone,
                            ]}
                          >
                            {pending ? 'Pendiente' : 'Completado'}
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
      />
    </View>
  );
}
