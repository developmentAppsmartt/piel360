import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { Icons, type AppIconName } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { DoctorHomeView } from '../views/doctor/home/DoctorHomeView';
import { DoctorPatientsView } from '../views/doctor/patients/DoctorPatientsView';
import { HomeView } from '../views/home/HomeView';
import { MessagesView } from '../views/messages/MessagesView';
import { NosologiesView } from '../views/nosologies/NosologiesView';
import { ProfileView } from '../views/profile/ProfileView';
import { PlaceholderTabView } from '../views/shared/PlaceholderTabView';

type TabKey =
  | 'home'
  | 'patients'
  | 'nosologias'
  | 'agenda'
  | 'analysis'
  | 'search'
  | 'chat'
  | 'profile';

const DOCTOR_TABS: { key: TabKey; label: string; icon: AppIconName }[] = [
  { key: 'home', label: 'Inicio', icon: Icons.home },
  { key: 'patients', label: 'Pacientes', icon: Icons.accountGroup },
  { key: 'nosologias', label: 'Nosologías', icon: Icons.nosology },
  { key: 'chat', label: 'Chat', icon: Icons.chat },
  { key: 'profile', label: 'Perfil', icon: Icons.account },
];

/** Tabs del mockup paciente: Inicio | Agenda | Nuevo Análisis | Buscar | Perfil */
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
  { key: 'search', label: 'Buscar', icon: Icons.search },
  { key: 'profile', label: 'Perfil', icon: Icons.account },
];

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const tabs = useMemo(
    () => (isDoctor ? DOCTOR_TABS : PATIENT_TABS),
    [isDoctor],
  );
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [chatThreadOpen, setChatThreadOpen] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [consentRequestId, setConsentRequestId] = useState(0);
  const activeColor = branding.colors.primary;
  const inactiveColor = '#9CA3AF';
  const hideTabBar =
    (activeTab === 'chat' && chatThreadOpen) ||
    (isDoctor && activeTab === 'patients' && creatingPatient);

  function onPatientTabPress(key: TabKey) {
    if (key === 'analysis') {
      setActiveTab('home');
      setConsentRequestId((n) => n + 1);
      return;
    }
    setActiveTab(key);
  }

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        {activeTab === 'home' || (!isDoctor && activeTab === 'analysis') ? (
          isDoctor ? (
            <DoctorHomeView
              onOpenPatients={() => setActiveTab('patients')}
              onOpenMessages={() => setActiveTab('chat')}
              onOpenProfile={() => setActiveTab('profile')}
              onOpenNosologies={() => setActiveTab('nosologias')}
            />
          ) : (
            <HomeView
              onOpenProfile={() => setActiveTab('profile')}
              onOpenAgenda={() => setActiveTab('agenda')}
              consentRequestId={consentRequestId}
            />
          )
        ) : null}
        {activeTab === 'patients' ? (
          <DoctorPatientsView
            onOpenMessages={() => setActiveTab('chat')}
            onOpenProfile={() => setActiveTab('profile')}
            onCreatingChange={setCreatingPatient}
          />
        ) : null}
        {activeTab === 'nosologias' ? (
          <NosologiesView
            onOpenMessages={() => setActiveTab('chat')}
            onOpenProfile={() => setActiveTab('profile')}
          />
        ) : null}
        {activeTab === 'agenda' ? (
          <PlaceholderTabView
            title="Agenda"
            description="Aquí verás citas y disponibilidad (mock). Se conectará al servicio de agenda."
          />
        ) : null}
        {activeTab === 'search' ? (
          <PlaceholderTabView
            title="Buscar"
            description="Búsqueda de enfermedades y contenido (mock)."
          />
        ) : null}
        {activeTab === 'chat' ? (
          <MessagesView onThreadOpenChange={setChatThreadOpen} />
        ) : null}
        {activeTab === 'profile' ? <ProfileView /> : null}
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
            const color = isCenter
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
                    ? setActiveTab(tab.key)
                    : onPatientTabPress(tab.key)
                }
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <View
                  style={
                    isCenter
                      ? [
                          styles.centerIconWrap,
                          { backgroundColor: branding.colors.primary },
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
                    { color: isCenter ? activeColor : color },
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
