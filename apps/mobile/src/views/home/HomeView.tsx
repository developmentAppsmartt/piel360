import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import {
  patientsService,
  type UpdatePatientInput,
} from '../../services/patients.service';
import type { PatientProfile } from '../../types/patient';
import { AccountInfoView } from '../account/AccountInfoView';
import {
  AccountDrawer,
  type AccountMenuId,
} from '../doctor/patients/components/AccountDrawer';
import { EditProfileView } from '../profile/edit/EditProfileView';
import {
  MOCK_ANALYSES,
  MOCK_PATIENT_HOME,
  type MockAnalysisTone,
} from './data/patientHome.mock';
import { createHomeStyles } from './styles/home.styles';

type HomeViewProps = {
  onOpenProfile?: () => void;
  onOpenAgenda?: () => void;
  /** Abre el modal de consentimiento (también desde tab Nuevo Análisis). */
  consentRequestId?: number;
  onConsentContinue?: () => void;
};

type Overlay =
  | null
  | 'config'
  | 'password'
  | 'premios'
  | 'acuerdo'
  | 'soporte'
  | 'acerca';

const OVERLAY_COPY: Record<
  Exclude<Overlay, null | 'config'>,
  { title: string; body: string }
> = {
  password: {
    title: 'Cambiar contraseña',
    body: 'Pronto podrás cambiar tu contraseña desde aquí. Mientras tanto usa “Olvidé mi contraseña” en el inicio de sesión si necesitas restablecerla.',
  },
  premios: {
    title: 'Premios',
    body: 'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
  },
  acuerdo: {
    title: 'Acuerdo de usuario',
    body: 'Al usar Piel 360 aceptas el tratamiento de tus datos de salud con fines de apoyo diagnóstico. El texto legal completo se publicará en esta sección.',
  },
  soporte: {
    title: 'Soporte',
    body: '¿Necesitas ayuda? Escribe a soporte@piel360.com o usa el chat con tu médico desde la pestaña Chat.',
  },
  acerca: {
    title: 'Acerca de Piel 360',
    body: 'Piel 360 AI — versión 1.0.0\n\nApoyo diagnóstico dermatológico con inteligencia artificial. Esta app no sustituye una consulta médica presencial.',
  },
};

const TONE_COLOR: Record<MockAnalysisTone, string> = {
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#16A34A',
};

export function HomeView({
  onOpenProfile,
  onOpenAgenda,
  consentRequestId = 0,
  onConsentContinue,
}: HomeViewProps) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const branding = useBranding();
  const styles = useMemo(() => createHomeStyles(branding.colors), [branding.colors]);
  const onDark = branding.colors.textOnDark;

  const [menuOpen, setMenuOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);

  useEffect(() => {
    if (consentRequestId > 0) setConsentOpen(true);
  }, [consentRequestId]);

  const loadPatient = useCallback(async () => {
    setLoadingPatient(true);
    try {
      const mine = await patientsService.getMyPatient();
      setPatient(mine);
      return mine;
    } catch (err) {
      Alert.alert(
        'Perfil',
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar tu perfil.',
      );
      return null;
    } finally {
      setLoadingPatient(false);
    }
  }, []);

  async function handleMenuSelect(id: AccountMenuId) {
    setMenuOpen(false);
    if (id === 'salir') {
      void logout();
      return;
    }
    if (id === 'perfil') {
      onOpenProfile?.();
      return;
    }
    if (id === 'config') {
      const p = patient ?? (await loadPatient());
      if (p) setOverlay('config');
      return;
    }
    if (id === 'seguridad') return;
    if (
      id === 'password' ||
      id === 'premios' ||
      id === 'acuerdo' ||
      id === 'soporte' ||
      id === 'acerca'
    ) {
      setOverlay(id);
    }
  }

  async function handleSaveProfile(input: UpdatePatientInput) {
    if (!patient) return;
    const updated = await patientsService.update(patient.id, input);
    setPatient(updated);
    setOverlay(null);
    Alert.alert('Listo', 'Tu perfil se actualizó correctamente.');
  }

  if (overlay === 'config') {
    if (loadingPatient || !patient) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={branding.colors.primary} />
        </View>
      );
    }
    return (
      <EditProfileView
        patient={patient}
        onBack={() => setOverlay(null)}
        onSave={handleSaveProfile}
      />
    );
  }

  if (overlay) {
    const copy = OVERLAY_COPY[overlay];
    return (
      <AccountInfoView
        title={copy.title}
        body={copy.body}
        onBack={() => setOverlay(null)}
      />
    );
  }

  const mock = MOCK_PATIENT_HOME;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.logoDot}>
          <Text style={styles.logoText}>P360</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            hitSlop={8}
            accessibilityLabel="Premios"
            onPress={() => setOverlay('premios')}
          >
            <AppIcon icon={Icons.gift} size={22} color={onDark} />
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityLabel="Notificaciones"
            onPress={() =>
              Alert.alert('Notificaciones', `${mock.notificationCount} avisos (mock).`)
            }
          >
            <View>
              <AppIcon icon={Icons.bell} size={22} color={onDark} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{mock.notificationCount}</Text>
              </View>
            </View>
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityLabel="Mi cuenta"
            onPress={() => setMenuOpen(true)}
          >
            <AppIcon icon={Icons.menu} size={24} color={onDark} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Bienvenido a Piel 360 AI</Text>
          <Text style={styles.welcomeSubtitle}>
            Tu piel tiene mucho que decir. Escúchala aquí
          </Text>
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{mock.initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{mock.displayName}</Text>
            <Text style={styles.profileMeta}>
              Última actualización: {mock.lastUpdate}
            </Text>
            <Text style={styles.profileMeta}>{mock.document}</Text>
            <Text style={styles.profileMeta}>{mock.ageLabel}</Text>
          </View>
        </View>

        <Pressable
          style={styles.linkCard}
          onPress={() =>
            Alert.alert(
              'Consejos',
              'Contenido de consejos (mock). Se conectará al CMS/API.',
            )
          }
        >
          <View style={styles.linkIconWrap}>
            <AppIcon icon={Icons.smile} size={22} color={branding.colors.primary} />
          </View>
          <Text style={styles.linkLabel}>Consejos para el cuidado de la piel</Text>
          <AppIcon icon={Icons.chevronRight} size={20} color={branding.colors.muted} />
        </Pressable>

        <Pressable
          style={styles.linkCard}
          onPress={() =>
            Alert.alert(
              'Enfermedades',
              'Enciclopedia de enfermedades (mock). Se conectará al servicio.',
            )
          }
        >
          <View style={styles.linkIconWrap}>
            <AppIcon
              icon={Icons.prescription}
              size={22}
              color={branding.colors.primary}
            />
          </View>
          <Text style={styles.linkLabel}>Enfermedades de la piel</Text>
          <AppIcon icon={Icons.chevronRight} size={20} color={branding.colors.muted} />
        </Pressable>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Histórico Análisis</Text>
          <Pressable
            style={styles.assignLink}
            onPress={() => {
              onOpenAgenda?.();
              Alert.alert('Asignar cita', 'Flujo de citas (mock).');
            }}
          >
            <AppIcon
              icon={Icons.calendarClock}
              size={16}
              color={branding.colors.primary}
            />
            <Text style={styles.assignText}>Asignar Cita</Text>
          </Pressable>
        </View>

        <View style={styles.historyList}>
          {MOCK_ANALYSES.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.historyRow,
                index === MOCK_ANALYSES.length - 1 && styles.historyRowLast,
              ]}
              onPress={() =>
                Alert.alert(item.title, `Detalle mock · ${item.dateLabel}`)
              }
            >
              <View style={[styles.thumb, { backgroundColor: item.thumbColor }]} />
              <AppIcon
                icon={item.tone === 'success' ? Icons.check : Icons.sad}
                size={20}
                color={TONE_COLOR[item.tone]}
              />
              <View style={styles.historyBody}>
                <Text style={styles.historyItemTitle}>{item.title}</Text>
                <Text style={styles.historyItemMeta}>{item.dateLabel}</Text>
                {item.doctor ? (
                  <Text style={styles.historyItemMeta}>{item.doctor}</Text>
                ) : null}
              </View>
              <AppIcon
                icon={Icons.chevronRight}
                size={18}
                color={branding.colors.muted}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
        variant="patient"
      />

      <Modal
        visible={consentOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConsentOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setConsentOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconWrap}>
              <AppIcon
                icon={Icons.smile}
                size={32}
                color={branding.colors.primary}
              />
            </View>
            <Text style={styles.modalTitle}>Consentimiento</Text>
            <Text style={styles.modalBody}>
              Lee por favor antes de realizar el análisis. Se usará una foto de
              tu piel para un diagnóstico asistido por IA. No sustituye una
              consulta presencial.
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                setConsentOpen(false);
                onConsentContinue?.();
                Alert.alert(
                  'Nuevo análisis',
                  'Consentimiento aceptado (mock). El flujo de captura se conectará al servicio.',
                );
              }}
            >
              <Text style={styles.modalButtonText}>Continuar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
