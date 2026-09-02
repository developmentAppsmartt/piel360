import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import type { PatientAnalysisSummary } from '../../types/analysis';
import { createHomeStyles } from './styles/home.styles';

type SkinDiseasesViewProps = {
  analyses: PatientAnalysisSummary[];
  onBack: () => void;
  onOpenAnalysis: (id: string) => void;
};

function diagnosisOf(item: PatientAnalysisSummary): string {
  return (
    item.finalDiagnosis?.trim() ||
    item.aiDiagnosis?.trim() ||
    'Diagnóstico pendiente'
  );
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Análisis dermatológicos (Skiniver), no YouCam ni Fitzpatrick. */
export function isDermatologyDiseaseAnalysis(
  item: PatientAnalysisSummary,
): boolean {
  return !item.youcamTaskId && !item.fitzpatrickTaskId;
}

export function SkinDiseasesView({
  analyses,
  onBack,
  onOpenAnalysis,
}: SkinDiseasesViewProps) {
  const branding = useBranding();
  const styles = createHomeStyles(branding.colors);
  const primary = branding.colors.primary;

  return (
    <View style={styles.screen}>
      <View style={styles.tipsHeader}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.tipsBackBtn}
        >
          <AppIcon icon={Icons.back} size={22} color={branding.colors.textOnDark} />
        </Pressable>
        <Text style={styles.tipsHeaderTitle}>Enfermedades de la piel</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Análisis compartidos</Text>
          <Text style={styles.welcomeSubtitle}>
            Aquí verás los análisis dermatológicos que tu profesional te ha
            compartido.
          </Text>
        </View>

        <View style={styles.historyList}>
          {analyses.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.historyRow,
                index === analyses.length - 1 && styles.historyRowLast,
              ]}
              onPress={() => onOpenAnalysis(item.id)}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.thumb,
                  { backgroundColor: `${primary}22` },
                ]}
              >
                <AppIcon
                  icon={Icons.prescription}
                  size={22}
                  color={primary}
                />
              </View>
              <View style={styles.historyBody}>
                <Text style={styles.historyItemTitle} numberOfLines={2}>
                  {diagnosisOf(item)}
                </Text>
                <Text style={styles.historyItemMeta}>
                  {[item.bodyRegion, formatStamp(item.createdAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
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
    </View>
  );
}
