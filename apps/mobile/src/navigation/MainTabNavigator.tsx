import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { Icons, type AppIconName } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import {
  patientsService,
  type AnalysisRequest,
} from '../services/patients.service';
import { isDoctorVerificationActive, isClinicalPanelUser } from '../types/auth';
import { DoctorHomeView } from '../views/doctor/home/DoctorHomeView';
import { DoctorPatientsView } from '../views/doctor/patients/DoctorPatientsView';
import { DoctorAgendaView } from '../views/agenda/DoctorAgendaView';
import { PatientAgendaView } from '../views/agenda/PatientAgendaView';
import { HomeView } from '../views/home/HomeView';
import { MessagesView } from '../views/messages/MessagesView';
import type { ChatQuickActionId } from '../views/messages/components/ChatQuickActions';
import { ProfileView } from '../views/profile/ProfileView';

type TabKey =
  | 'home'
  | 'patients'
  | 'agenda'
  | 'analysis'
  | 'search'
  | 'chat'
  | 'profile';

const DOCTOR_TABS: { key: TabKey; label: string; icon: AppIconName }[] = [
  { key: 'home', label: 'Inicio', icon: Icons.home },
  { key: 'patients', label: 'Pacientes', icon: Icons.accountGroup },
  { key: 'agenda', label: 'Agenda', icon: Icons.calendar },
  { key: 'chat', label: 'Chat', icon: Icons.chat },
  { key: 'profile', label: 'Perfil', icon: Icons.account },
];

const DOCTOR_PENDING_TABS: { key: TabKey; label: string; icon: AppIconName }[] =
  [{ key: 'profile', label: 'Perfil', icon: Icons.account }];

/** Tabs paciente: Inicio | Agenda | Nuevo Análisis | Chat | Perfil */
const PATIENT_TABS: {
  key: TabKey;
  label: string;
  icon: AppIconName;
  center?: boolean;
}[] = [
  { key: 'home', label: 'Inicio', icon: Icons.home },
  { key: 'agenda', label: 'Agenda', icon: Icons.calendar },
  {
    key: 'analysis',
    label: 'Nuevo Análisis',
    icon: Icons.plus,
    center: true,
  },
  { key: 'chat', label: 'Chat', icon: Icons.chat },
  { key: 'profile', label: 'Perfil', icon: Icons.account },
];

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const { user, refreshDoctorVerification } = useAuth();
  const isDoctor = isClinicalPanelUser(user);
  const doctorActive =
    !isDoctor || isDoctorVerificationActive(user?.verificationStatus);
  const [hasAssignedDoctor, setHasAssignedDoctor] = useState(() =>
    isClinicalPanelUser(user),
  );
  const tabs = useMemo(() => {
    if (!isDoctor) {
      if (hasAssignedDoctor) return PATIENT_TABS;
      return PATIENT_TABS.filter(
        (t) => t.key !== 'agenda' && t.key !== 'chat',
      );
    }
    return doctorActive ? DOCTOR_TABS : DOCTOR_PENDING_TABS;
  }, [isDoctor, doctorActive, hasAssignedDoctor]);
  const [activeTab, setActiveTab] = useState<TabKey>(
    isDoctor && !doctorActive ? 'profile' : 'home',
  );
  const [chatThreadOpen, setChatThreadOpen] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [consentRequestId, setConsentRequestId] = useState(0);
  const [homeIntent, setHomeIntent] = useState<'tips' | 'history' | null>(
    null,
  );
  const [pendingRequests, setPendingRequests] = useState<AnalysisRequest[]>(
    [],
  );
  const activeColor = branding.colors.primary;
  const inactiveColor = '#9CA3AF';
  const analysisUnlocked = pendingRequests.length > 0;
  const hideTabBar =
    (activeTab === 'chat' && chatThreadOpen) ||
    (isDoctor && activeTab === 'patients' && creatingPatient);

  useEffect(() => {
    if (!isDoctor) return;
    void refreshDoctorVerification();
  }, [isDoctor, refreshDoctorVerification]);

  useEffect(() => {
    if (isDoctor) {
      setHasAssignedDoctor(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const mine = await patientsService.getMyPatient();
        if (!cancelled) setHasAssignedDoctor(Boolean(mine?.doctorId));
      } catch {
        if (!cancelled) setHasAssignedDoctor(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDoctor, activeTab, user?.id]);

  useEffect(() => {
    if (isDoctor && !doctorActive && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [isDoctor, doctorActive, activeTab]);

  useEffect(() => {
    if (isDoctor || hasAssignedDoctor) return;
    if (activeTab === 'agenda' || activeTab === 'chat') {
      setActiveTab('home');
    }
  }, [isDoctor, hasAssignedDoctor, activeTab]);

  const refreshPendingRequests = useCallback(async () => {
    if (isDoctor) {
      setPendingRequests([]);
      return;
    }
    try {
      const pending = await patientsService.getMyPendingAnalysisRequests();
      setPendingRequests(pending);
    } catch {
      setPendingRequests([]);
    }
  }, [isDoctor]);

  useEffect(() => {
    void refreshPendingRequests();
  }, [refreshPendingRequests, activeTab]);

  async function onPatientTabPress(key: TabKey) {
    if (
      !hasAssignedDoctor &&
      (key === 'agenda' || key === 'chat')
    ) {
      Alert.alert(
        'Sin profesional',
        'Cuando un profesional te asigne a su consulta, podrás usar Agenda y Chat.',
      );
      return;
    }
    if (key === 'analysis') {
      let pending: AnalysisRequest[] = [];
      try {
        pending = await patientsService.getMyPendingAnalysisRequests();
        setPendingRequests(pending);
      } catch {
        setPendingRequests([]);
      }
      if (pending.length === 0) {
        Alert.alert(
          'Nuevo Análisis',
          'Tu médico debe solicitarte un análisis desde su consulta para desbloquear esta opción.',
        );
        return;
      }
      setActiveTab('home');
      setConsentRequestId((n) => n + 1);
      return;
    }
    setActiveTab(key);
  }

  function onDoctorTabPress(key: TabKey) {
    if (!doctorActive && key !== 'profile') {
      Alert.alert(
        'Verificación pendiente',
        'Tu cuenta está en revisión. Solo puedes acceder a tu perfil hasta que un administrador active tu cuenta.',
      );
      setActiveTab('profile');
      return;
    }
    setActiveTab(key);
  }

  function handleChatQuickAction(id: ChatQuickActionId) {
    if (id === 'cita') {
      setActiveTab('agenda');
      return;
    }
    if (isDoctor) {
      setActiveTab('agenda');
      return;
    }
    if (id === 'receta') {
      setHomeIntent('tips');
      setActiveTab('home');
      return;
    }
    if (id === 'resultado') {
      setHomeIntent('history');
      setActiveTab('home');
    }
  }

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        {doctorActive &&
        (activeTab === 'home' || (!isDoctor && activeTab === 'analysis')) ? (
          isDoctor ? (
            <DoctorHomeView
              onOpenPatients={() => setActiveTab('patients')}
              onOpenMessages={() => setActiveTab('chat')}
              onOpenProfile={() => setActiveTab('profile')}
            />
          ) : (
            <HomeView
              onOpenProfile={() => setActiveTab('profile')}
              onOpenAgenda={() => setActiveTab('agenda')}
              onOpenMessages={() => setActiveTab('chat')}
              consentRequestId={consentRequestId}
              pendingAnalysisRequests={pendingRequests}
              onPendingRequestConsumed={() => void refreshPendingRequests()}
              homeIntent={homeIntent}
              onHomeIntentConsumed={() => setHomeIntent(null)}
            />
          )
        ) : null}
        {doctorActive && activeTab === 'patients' ? (
          <DoctorPatientsView
            onOpenMessages={() => setActiveTab('chat')}
            onOpenProfile={() => setActiveTab('profile')}
            onCreatingChange={setCreatingPatient}
          />
        ) : null}
        {doctorActive && activeTab === 'agenda' && hasAssignedDoctor ? (
          isDoctor ? (
            <DoctorAgendaView
              onOpenMessages={() => setActiveTab('chat')}
              onOpenProfile={() => setActiveTab('profile')}
            />
          ) : (
            <PatientAgendaView
              onOpenMessages={() => setActiveTab('chat')}
              onOpenProfile={() => setActiveTab('profile')}
            />
          )
        ) : null}
        {doctorActive && activeTab === 'chat' && (isDoctor || hasAssignedDoctor) ? (
          <MessagesView
            onThreadOpenChange={setChatThreadOpen}
            onOpenProfile={() => setActiveTab('profile')}
            onQuickAction={handleChatQuickAction}
          />
        ) : null}
        {activeTab === 'profile' || (isDoctor && !doctorActive) ? (
          <ProfileView onOpenMessages={() => setActiveTab('chat')} />
        ) : null}
      </View>

      {!hideTabBar ? (
        <View
          style={[
            styles.tabBar,
            { paddingBottom: Math.max(insets.bottom, 10) },
          ]}
        >
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            const isCenter = 'center' in tab && tab.center;
            const lockedCenter = isCenter && !isDoctor && !analysisUnlocked;
            const color = lockedCenter
              ? '#C4C4C4'
              : isCenter
                ? activeColor
                : active
                  ? activeColor
                  : inactiveColor;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabItem, isCenter && styles.tabItemCenter]}
                onPress={() =>
                  isDoctor
                    ? onDoctorTabPress(tab.key)
                    : void onPatientTabPress(tab.key)
                }
                accessibilityRole="tab"
                accessibilityState={{
                  selected: active,
                  disabled: lockedCenter,
                }}
                accessibilityLabel={tab.label}
              >
                <View
                  style={
                    isCenter
                      ? [
                          styles.centerIconWrap,
                          {
                            backgroundColor: lockedCenter
                              ? '#D1D5DB'
                              : branding.colors.primary,
                          },
                        ]
                      : undefined
                  }
                >
                  <AppIcon
                    icon={tab.icon}
                    size={isCenter ? 26 : 22}
                    color={isCenter ? branding.colors.textOnDark : color}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    { color },
                    isCenter && styles.tabLabelCenter,
                  ]}
                  numberOfLines={isCenter ? 2 : 1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  tabItemCenter: {
    marginTop: -18,
  },
  centerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelCenter: {
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 72,
  },
});
