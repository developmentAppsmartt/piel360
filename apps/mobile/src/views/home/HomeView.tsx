import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { analysesService } from '../../services/analyses.service';
import {
  patientsService,
  type UpdatePatientInput,
} from '../../services/patients.service';
import type { PatientAnalysisSummary, YoucamRawResponse } from '../../types/analysis';
import {
  parseYoucamMetrics,
  youcamOverallScore,
} from '../../types/analysis';
import type { PatientProfile } from '../../types/patient';
import { YoucamAnalysisFlow } from '../analyses/youcam-flow/YoucamAnalysisFlow';
import { AccountInfoView } from '../account/AccountInfoView';
import { AnalysisDetailView } from '../doctor/analyses/AnalysisDetailView';
import {
  AccountDrawer,
  type AccountMenuId,
} from '../doctor/patients/components/AccountDrawer';
import { EditProfileView } from '../profile/edit/EditProfileView';
import {
  formatPatientDocument,
  patientDisplayName,
} from '../profile/data/patient';
import { createHomeStyles } from './styles/home.styles';

type HomeViewProps = {
  onOpenProfile?: () => void;
  onOpenAgenda?: () => void;
  onOpenMessages?: () => void;
  /** Abre el flujo YouCam (también desde tab Nuevo Análisis). */
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

function initialsOf(patient: PatientProfile): string {
  return [patient.firstName, patient.lastName]
    .map((x) => x?.[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

function analysisTitle(item: PatientAnalysisSummary): string {
  const diagnosis =
    item.finalDiagnosis?.trim() || item.aiDiagnosis?.trim() || '';
  if (diagnosis) return diagnosis;
  if (item.youcamTaskId) {
    const metrics = parseYoucamMetrics(
      item.aiRawResponse as YoucamRawResponse | null,
    );
    const overall = youcamOverallScore(metrics);
    return overall != null
      ? `Análisis facial · ${Math.round(overall)} pts`
      : 'Análisis facial';
  }
  return 'Análisis';
}

function analysisTone(
  item: PatientAnalysisSummary,
): 'danger' | 'warning' | 'success' {
  if (item.youcamTaskId) {
    const metrics = parseYoucamMetrics(
      item.aiRawResponse as YoucamRawResponse | null,
    );
    const overall = youcamOverallScore(metrics);
    if (overall != null && overall < 70) return 'danger';
    if (overall != null && overall < 85) return 'warning';
    return 'success';
  }
  const label = (
    item.finalDiagnosis ??
    item.aiDiagnosis ??
    ''
  ).toLowerCase();
  if (
    label.includes('melanoma') ||
    label.includes('carcinoma') ||
    label.includes('bowen') ||
    label.includes('cáncer') ||
    label.includes('cancer')
  ) {
    return 'danger';
  }
  if (label.includes('nevo') || label.includes('nevus')) return 'warning';
  return 'success';
}

const TONE_COLOR = {
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#16A34A',
} as const;

export function HomeView({
  onOpenProfile,
  onOpenAgenda,
  onOpenMessages,
  consentRequestId = 0,
  onConsentContinue,
}: HomeViewProps) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const branding = useBranding();
  const styles = useMemo(() => createHomeStyles(branding.colors), [branding.colors]);
  const onDark = branding.colors.textOnDark;

  const [menuOpen, setMenuOpen] = useState(false);
  const [youcamFlowOpen, setYoucamFlowOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [analyses, setAnalyses] = useState<PatientAnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (consentRequestId > 0) setYoucamFlowOpen(true);
  }, [consentRequestId]);

  const loadHome = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await patientsService.getMyPatient();
      setPatient(mine);
      if (mine) {
        const list = await analysesService.list();
        setAnalyses(list);
      } else {
        setAnalyses([]);
      }
    } catch (err) {
      Alert.alert(
        'Inicio',
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar tu información.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

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
      if (!patient) await loadHome();
      if (patient || (await patientsService.getMyPatient())) {
        setOverlay('config');
      }
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

  if (youcamFlowOpen) {
    return (
      <>
        <YoucamAnalysisFlow
          onClose={() => {
            setYoucamFlowOpen(false);
            onConsentContinue?.();
          }}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant="patient"
        />
      </>
    );
  }

  if (selectedAnalysisId) {
    return (
      <AnalysisDetailView
        analysisId={selectedAnalysisId}
        patientName={patient ? patientDisplayName(patient) : undefined}
        canShare={false}
        onBack={() => {
          setSelectedAnalysisId(null);
          void loadHome();
        }}
        onOpenMenu={() => setMenuOpen(true)}
      />
    );
  }

  if (overlay === 'config') {
    if (loading || !patient) {
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

  const name = patient ? patientDisplayName(patient) : 'Paciente';
  const doc = patient
    ? formatPatientDocument(patient.docType, patient.docNumber)
    : '';
  const initials = patient ? initialsOf(patient) : '—';

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
              Alert.alert(
                'Notificaciones',
                'Las notificaciones se conectarán en una próxima versión.',
              )
            }
          >
            <AppIcon icon={Icons.bell} size={22} color={onDark} />
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityLabel="Chat con mi médico"
            onPress={() => onOpenMessages?.()}
          >
            <AppIcon icon={Icons.chat} size={22} color={onDark} />
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={branding.colors.primary} />
        </View>
      ) : (
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
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileMeta}>
                Última actualización:{' '}
                {patient ? formatUpdate(patient.updatedAt) : '—'}
              </Text>
              {doc ? <Text style={styles.profileMeta}>{doc}</Text> : null}
              <Text style={styles.profileMeta}>
                Edad: {ageFromBirth(patient?.birthDate ?? null)}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.linkCard}
            onPress={() =>
              Alert.alert(
                'Consejos',
                'Contenido de consejos. Se conectará al CMS/API.',
              )
            }
          >
            <View style={styles.linkIconWrap}>
              <AppIcon
                icon={Icons.smile}
                size={22}
                color={branding.colors.primary}
              />
            </View>
            <Text style={styles.linkLabel}>
              Consejos para el cuidado de la piel
            </Text>
            <AppIcon
              icon={Icons.chevronRight}
              size={20}
              color={branding.colors.muted}
            />
          </Pressable>

          <Pressable
            style={styles.linkCard}
            onPress={() =>
              Alert.alert(
                'Enfermedades',
                'Enciclopedia de enfermedades. Se conectará al servicio.',
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
            <AppIcon
              icon={Icons.chevronRight}
              size={20}
              color={branding.colors.muted}
            />
          </Pressable>

          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Histórico Análisis</Text>
            <Pressable
              style={styles.assignLink}
              onPress={() => {
                onOpenAgenda?.();
                Alert.alert('Asignar cita', 'Flujo de citas próximamente.');
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
            {analyses.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>
                  Aún no tienes análisis compartidos por tu médico.
                </Text>
              </View>
            ) : (
              analyses.map((item, index) => {
                const tone = analysisTone(item);
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.historyRow,
                      index === analyses.length - 1 && styles.historyRowLast,
                    ]}
                    onPress={() => setSelectedAnalysisId(item.id)}
                  >
                    <View
                      style={[
                        styles.thumb,
                        { backgroundColor: `${TONE_COLOR[tone]}33` },
                      ]}
                    >
                      <AppIcon
                        icon={Icons.skin}
                        size={22}
                        color={branding.colors.primary}
                      />
                    </View>
                    <AppIcon
                      icon={tone === 'success' ? Icons.check : Icons.sad}
                      size={20}
                      color={TONE_COLOR[tone]}
                    />
                    <View style={styles.historyBody}>
                      <Text style={styles.historyItemTitle}>
                        {analysisTitle(item)}
                      </Text>
                      <Text style={styles.historyItemMeta}>
                        {formatStamp(item.createdAt)}
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
        </ScrollView>
      )}

      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
        variant="patient"
      />

    </View>
  );
}
