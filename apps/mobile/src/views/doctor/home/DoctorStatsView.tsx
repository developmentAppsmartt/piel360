import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { AnalysisPieChart } from './components/AnalysisPieChart';
import { createDoctorHomeStyles } from './styles/home.styles';

type DoctorStatsViewProps = {
  dermatologicoCount: number;
  esteticoCount: number;
  fototipoCount: number;
  pendingCount: number;
  patientsCount: number;
  onBack: () => void;
};

export function DoctorStatsView({
  dermatologicoCount,
  esteticoCount,
  fototipoCount,
  pendingCount,
  patientsCount,
  onBack,
}: DoctorStatsViewProps) {
  const branding = useBranding();
  const styles = createDoctorHomeStyles(branding.colors);
  const primary = branding.colors.primary;

  const slices = [
    {
      label: 'Dermatológico',
      value: dermatologicoCount,
      color: primary,
    },
    {
      label: 'Estético',
      value: esteticoCount,
      color: branding.colors.secondary || '#38BDF8',
    },
    {
      label: 'Fototipo',
      value: fototipoCount,
      color: '#14B8A6',
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.statsHeader}>
        <Pressable
          onPress={onBack}
          accessibilityLabel="Volver"
          hitSlop={12}
          style={styles.statsBackBtn}
        >
          <AppIcon icon={Icons.back} size={22} color={primary} />
        </Pressable>
        <Text style={styles.statsTitle}>Estadísticas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.statsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsPieCard}>
          <Text style={styles.statsPieHeading}>Distribución de análisis</Text>
          <Text style={styles.statsPieSub}>
            Por tipo de análisis realizados en tu consulta
          </Text>
          <AnalysisPieChart slices={slices} primaryColor={primary} />
        </View>

        <View style={styles.statsMetaRow}>
          <View style={styles.statsMetaCard}>
            <Text style={[styles.statsMetaValue, { color: primary }]}>
              {patientsCount}
            </Text>
            <Text style={styles.statsMetaLabel}>Pacientes</Text>
          </View>
          <View style={styles.statsMetaCard}>
            <Text style={[styles.statsMetaValue, { color: '#F59E0B' }]}>
              {pendingCount}
            </Text>
            <Text style={styles.statsMetaLabel}>Pendientes</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
