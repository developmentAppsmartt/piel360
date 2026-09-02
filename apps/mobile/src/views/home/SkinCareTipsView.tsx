import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import {
  skinAgeRulesService,
  type SkinAgeRecoItem,
  type SkinAgeRecommended,
} from '../../services/skin-age-rules.service';
import { createHomeStyles } from '../home/styles/home.styles';

type SkinCareTipsViewProps = {
  onBack: () => void;
};

function formatSigned(diff: number | null | undefined): string {
  if (diff == null) return '—';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function RecoBlock({
  title,
  items,
  empty,
  styles,
  primary,
}: {
  title: string;
  items: SkinAgeRecoItem[];
  empty: string;
  styles: ReturnType<typeof createHomeStyles>;
  primary: string;
}) {
  return (
    <View style={styles.tipsSection}>
      <Text style={[styles.tipsSectionTitle, { color: primary }]}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.tipsEmpty}>{empty}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.tipsItemCard}>
            <Text style={styles.tipsItemTitle}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.tipsItemSub}>{item.description}</Text>
            ) : null}
            {item.stepsCount != null ? (
              <Text style={styles.tipsItemSub}>
                {item.stepsCount} paso{item.stepsCount === 1 ? '' : 's'}
              </Text>
            ) : null}
            {item.items && item.items.length > 0 ? (
              <Text style={styles.tipsItemSub}>
                {item.items.map((p) => p.productName).join(' · ')}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

export function SkinCareTipsView({ onBack }: SkinCareTipsViewProps) {
  const branding = useBranding();
  const styles = createHomeStyles(branding.colors);
  const primary = branding.colors.primary;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SkinAgeRecommended | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tips = await skinAgeRulesService.getMySkinCareTips();
      setData(tips);
    } catch {
      setError('No se pudieron cargar los consejos. Intenta de nuevo.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const snap = data?.snapshot;
  const rule = data?.matchedRule;
  const rec = data?.recommendations;

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
        <Text style={styles.tipsHeaderTitle}>Consejos de cuidado</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.tipsError}>{error}</Text> : null}

          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Según tu análisis</Text>
            <Text style={styles.welcomeSubtitle}>
              Comparamos la edad de tu piel con tu edad cronológica y aplicamos
              las reglas definidas por tu profesional.
            </Text>
            <View style={styles.tipsStatsRow}>
              <View style={styles.tipsStat}>
                <Text style={styles.tipsStatLabel}>Edad piel</Text>
                <Text style={styles.tipsStatValue}>
                  {snap?.skinAgeYears != null
                    ? `${Math.round(snap.skinAgeYears)} años`
                    : '—'}
                </Text>
              </View>
              <View style={styles.tipsStat}>
                <Text style={styles.tipsStatLabel}>Edad cronológica</Text>
                <Text style={styles.tipsStatValue}>
                  {snap?.chronologicalAgeYears != null
                    ? `${snap.chronologicalAgeYears} años`
                    : '—'}
                </Text>
              </View>
              <View style={styles.tipsStat}>
                <Text style={styles.tipsStatLabel}>Diferencia</Text>
                <Text style={styles.tipsStatValue}>
                  {formatSigned(snap?.skinAgeDifference)}
                </Text>
              </View>
            </View>
          </View>

          {rule ? (
            <View style={styles.tipsRuleCard}>
              <Text style={styles.tipsRuleEyebrow}>Regla aplicada</Text>
              <Text style={styles.tipsRuleTitle}>{rule.label}</Text>
              {rule.description ? (
                <Text style={styles.tipsRuleDesc}>{rule.description}</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.tipsRuleCard}>
              <Text style={styles.tipsRuleTitle}>Sin regla coincidente</Text>
              <Text style={styles.tipsRuleDesc}>
                {snap?.message ??
                  'Cuando tengas un análisis YouCam con edad de piel, verás aquí las recomendaciones.'}
              </Text>
            </View>
          )}

          <RecoBlock
            title="Productos"
            items={rec?.products ?? []}
            empty="Sin productos vinculados a esta regla."
            styles={styles}
            primary={primary}
          />
          <RecoBlock
            title="Rutinas"
            items={rec?.routines ?? []}
            empty="Sin rutinas vinculadas a esta regla."
            styles={styles}
            primary={primary}
          />
          <RecoBlock
            title="Tratamientos"
            items={rec?.treatments ?? []}
            empty="Sin tratamientos vinculados a esta regla."
            styles={styles}
            primary={primary}
          />
          <RecoBlock
            title="Suplementos"
            items={rec?.supplements ?? []}
            empty="Sin suplementos vinculados a esta regla."
            styles={styles}
            primary={primary}
          />
        </ScrollView>
      )}
    </View>
  );
}
