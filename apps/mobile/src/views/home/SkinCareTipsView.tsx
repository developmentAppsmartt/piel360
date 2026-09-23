import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

type DisplayStep = {
  key: string;
  title: string;
  detail?: string | null;
};

function formatSigned(diff: number | null | undefined): string {
  if (diff == null) return '—';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/** Separa intro vs líneas de protocolo en descripciones libres. */
function splitProtocolDescription(description: string | null | undefined): {
  intro: string | null;
  protocolLines: string[];
} {
  const raw = description?.trim() ?? '';
  if (!raw) return { intro: null, protocolLines: [] };

  const lines = raw
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s•\-–—*]+/, '').trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const protocolMarker = /\bprotocolo\b/i.exec(raw);
    if (protocolMarker && protocolMarker.index != null) {
      const after = raw.slice(protocolMarker.index).trim();
      const intro = raw.slice(0, protocolMarker.index).trim() || null;
      const chunks = after
        .replace(/^protocolo\s*sugerido\s*[:.]?\s*/i, '')
        .split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])/)
        .map((c) => c.trim())
        .filter((c) => c.length > 3);
      if (chunks.length >= 2) {
        return { intro, protocolLines: chunks };
      }
    }
    return { intro: raw, protocolLines: [] };
  }

  const protocolIdx = lines.findIndex((line) => /protocolo/i.test(line));
  if (protocolIdx >= 0) {
    const introParts = lines.slice(0, protocolIdx);
    const markerLine = lines[protocolIdx];
    const rest = lines.slice(protocolIdx + 1);
    const markerExtra = markerLine
      .replace(/^.*?protocolo\s*(sugerido)?\s*[:.]?\s*/i, '')
      .trim();
    const protocolLines = [
      ...(markerExtra ? [markerExtra] : []),
      ...rest,
    ].filter(Boolean);
    return {
      intro: introParts.join(' ').trim() || null,
      protocolLines,
    };
  }

  if (lines.length >= 3) {
    return { intro: lines[0], protocolLines: lines.slice(1) };
  }

  return { intro: raw, protocolLines: [] };
}

function stepsForItem(item: SkinAgeRecoItem): DisplayStep[] {
  if (item.steps && item.steps.length > 0) {
    return [...item.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        key: step.id,
        title: step.title,
        detail: step.description,
      }));
  }

  const fromItems =
    item.items
      ?.map((entry) => {
        const title = entry.note?.trim() || entry.productName;
        const detail =
          entry.note?.trim() && entry.note.trim() !== entry.productName
            ? entry.productName
            : null;
        return {
          key: entry.id,
          title,
          detail,
        };
      })
      .filter((s) => s.title.trim().length > 0) ?? [];

  if (fromItems.length >= 2) return fromItems;

  const { protocolLines } = splitProtocolDescription(item.description);
  if (protocolLines.length > 0) {
    return protocolLines.map((line, index) => ({
      key: `${item.id}-protocol-${index}`,
      title: line,
      detail: null,
    }));
  }

  return fromItems;
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
        items.map((item) => {
          const steps = stepsForItem(item);
          const { intro } = splitProtocolDescription(item.description);
          const descriptionText =
            item.steps && item.steps.length > 0
              ? item.description
              : steps.length > 0
                ? intro
                : item.description;
          const stepsCount =
            steps.length > 0 ? steps.length : (item.stepsCount ?? 0);
          const productNames =
            item.items
              ?.map((p) => p.productName)
              .filter(Boolean)
              .filter(
                (name) =>
                  !steps.some((s) => s.title === name || s.detail === name),
              ) ?? [];

          return (
            <View key={item.id} style={styles.tipsItemCard}>
              <Text style={styles.tipsItemTitle}>{item.name}</Text>
              {descriptionText ? (
                <Text style={styles.tipsItemSub}>{descriptionText}</Text>
              ) : null}
              {stepsCount > 0 ? (
                <Text style={[styles.tipsStepsCount, { color: primary }]}>
                  {stepsCount} paso{stepsCount === 1 ? '' : 's'}
                </Text>
              ) : null}
              {steps.length > 0 ? (
                <View style={styles.tipsStepsList}>
                  {steps.map((step, index) => (
                    <View key={step.key} style={styles.tipsStepRow}>
                      <View
                        style={[
                          styles.tipsStepBadge,
                          { backgroundColor: `${primary}18` },
                        ]}
                      >
                        <Text
                          style={[styles.tipsStepBadgeText, { color: primary }]}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.tipsStepBody}>
                        <Text style={styles.tipsStepTitle}>{step.title}</Text>
                        {step.detail ? (
                          <Text style={styles.tipsStepDetail}>
                            {step.detail}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {productNames.length > 0 ? (
                <Text style={styles.tipsItemSub}>
                  {productNames.join(' · ')}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}

export function SkinCareTipsView({ onBack }: SkinCareTipsViewProps) {
  const branding = useBranding();
  const insets = useSafeAreaInsets();
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
      <View
        style={[
          styles.tipsHeader,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.tipsBackBtn}
        >
          <AppIcon
            icon={Icons.back}
            size={22}
            color={branding.colors.textOnDark}
          />
        </Pressable>
        <Text style={styles.tipsHeaderTitle}>Consejos de cuidado</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.tipsError}>{error}</Text> : null}

          <View style={styles.tipsSummaryCard}>
            <Text style={styles.welcomeTitle}>
              Según tu último análisis compartido
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Usamos el análisis que tu profesional compartió contigo,
              comparamos la edad de tu piel con tu edad cronológica y aplicamos
              sus reglas.
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
                  'Cuando tengas un análisis estético con edad de piel, verás aquí las recomendaciones.'}
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
