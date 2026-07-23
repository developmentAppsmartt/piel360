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

type TabKey = 'home' | 'patients' | 'nosologias' | 'agenda' | 'chat' | 'profile';

const DOCTOR_TABS: { key: TabKey; label: string; icon: AppIconName }[] = [
  { key: 'home', label: 'Inicio', icon: Icons.home },
  { key: 'patients', label: 'Pacientes', icon: Icons.accountGroup },
  { key: 'nosologias', label: 'Nosologías', icon: Icons.nosology },
  { key: 'chat', label: 'Chat', icon: Icons.chat },
  { key: 'profile', label: 'Perfil', icon: Icons.account },
];

const PATIENT_TABS: { key: TabKey; label: string; icon: AppIconName }[] = [
  { key: 'home', label: 'Inicio', icon: Icons.home },
  { key: 'agenda', label: 'Agenda', icon: Icons.calendar },
  { key: 'chat', label: 'Chat', icon: Icons.chat },
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
  const activeColor = branding.colors.primary;
  const inactiveColor = '#9CA3AF';
  const hideTabBar =
    (activeTab === 'chat' && chatThreadOpen) ||
    (isDoctor && activeTab === 'patients' && creatingPatient);

  return (
    <View style={styles.shell}>
      <View style={styles.content}>
        {activeTab === 'home' ? (
          isDoctor ? (
            <DoctorHomeView
              onOpenPatients={() => setActiveTab('patients')}
              onOpenMessages={() => setActiveTab('chat')}
              onOpenProfile={() => setActiveTab('profile')}
              onOpenNosologies={() => setActiveTab('nosologias')}
            />
          ) : (
            <HomeView />
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
            description="Aquí verás citas y disponibilidad según tu rol (doctor o paciente)."
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
            const color = active ? activeColor : inactiveColor;
            return (
              <Pressable
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <AppIcon icon={tab.icon} size={22} color={color} />
                <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
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
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
