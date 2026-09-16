import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  fitzpatrickRulesService,
  type FitzpatrickRecommended,
  type FitzpatrickRule,
} from '../../../services/fitzpatrick-rules.service';
import { FITZPATRICK_SCALES } from '../../../data/fitzpatrickLabels';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import {
  RULE_COLOR_HEX,
  createClinicalRulesStyles,
  priorityLabel,
} from './styles/clinicalRules.styles';

type FitzpatrickRulesViewProps = {
  onBack: () => void;
  onOpenMessages?: () => void;
};

function recoLines(
  title: string,
  items: { name: string }[],
  styles: ReturnType<typeof createClinicalRulesStyles>,
) {
  if (!items.length) return null;
  return (
    <View style={styles.recoBlock}>
      <Text style={styles.recoTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item.name} style={styles.recoItem}>
          · {item.name}
        </Text>
      ))}
    </View>
  );
}

export function FitzpatrickRulesView({
  onBack,
  onOpenMessages,
}: FitzpatrickRulesViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createClinicalRulesStyles(branding.colors),
    [branding.colors],
  );
  const primary = branding.colors.primary;

  const [rules, setRules] = useState<FitzpatrickRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<string>('III');
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<FitzpatrickRecommended | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fitzpatrickRulesService.list();
      setRules(list);
    } catch (err) {
      setRules([]);
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las reglas de fototipo.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(
    () => rules.filter((r) => r.isActive).length,
    [rules],
  );

  async function handleSimulate() {
    setSimulating(true);
    try {
      const result = await fitzpatrickRulesService.simulate(scale);
      setSimulation(result);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError
          ? err.message
          : 'No se pudo simular la regla.',
      );
    } finally {
      setSimulating(false);
    }
  }

  async function toggleActive(rule: FitzpatrickRule) {
    try {
      const updated = await fitzpatrickRulesService.setActive(
        rule.id,
        !rule.isActive,
      );
      setRules((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r)),
      );
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError
          ? err.message
          : 'No se pudo actualizar la regla.',
      );
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack
        onBack={onBack}
        onOpenMenu={onBack}
        onOpenMessages={onOpenMessages}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.title}>Fototipo</Text>
            <Text style={styles.subtitle}>
              Reglas que recomiendan rutinas, tratamientos, productos y
              suplementos según el fototipo (Fitzpatrick I–VI).
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{rules.length}</Text>
              <Text style={styles.statLabel}>Reglas</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{activeCount}</Text>
              <Text style={styles.statLabel}>Activas</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Simulador</Text>
            <Text style={styles.cardBody}>
              Elige un fototipo y prueba qué regla y recomendaciones aplica.
            </Text>
            <View style={styles.chipRow}>
              {FITZPATRICK_SCALES.map((s) => {
                const active = scale === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setScale(s)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => void handleSimulate()}
              style={styles.primaryBtn}
              disabled={simulating}
            >
              {simulating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Simular</Text>
              )}
            </Pressable>
            {simulation ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.cardBody}>
                  {simulation.snapshot.message ??
                    (simulation.matchedRule
                      ? `Regla: ${simulation.matchedRule.label}`
                      : 'Sin regla coincidente')}
                </Text>
                {recoLines(
                  'Rutinas',
                  simulation.recommendations.routines,
                  styles,
                )}
                {recoLines(
                  'Tratamientos',
                  simulation.recommendations.treatments,
                  styles,
                )}
                {recoLines(
                  'Productos',
                  simulation.recommendations.products,
                  styles,
                )}
                {recoLines(
                  'Suplementos',
                  simulation.recommendations.supplements,
                  styles,
                )}
              </View>
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {rules.length === 0 ? (
            <Text style={styles.emptyText}>
              Aún no hay reglas. Créalas en el CRM (Reglas por fototipo).
            </Text>
          ) : (
            rules.map((rule) => (
              <View
                key={rule.id}
                style={[
                  styles.ruleCard,
                  {
                    borderLeftColor:
                      RULE_COLOR_HEX[rule.colorKey] ?? primary,
                  },
                ]}
              >
                <View style={styles.ruleHeader}>
                  <Text style={styles.ruleLabel}>{rule.label}</Text>
                  <Switch
                    value={rule.isActive}
                    onValueChange={() => void toggleActive(rule)}
                    trackColor={{ false: '#D1D5DB', true: `${primary}88` }}
                    thumbColor={rule.isActive ? primary : '#F9FAFB'}
                  />
                </View>
                <Text style={styles.ruleMeta}>
                  Fototipo {rule.fitzpatrickScale} · Prioridad{' '}
                  {priorityLabel(rule.priority)}
                  {rule.isActive ? '' : ' · Inactiva'}
                </Text>
                {rule.description ? (
                  <Text style={styles.cardBody}>{rule.description}</Text>
                ) : null}
                <Text style={styles.ruleMeta}>
                  {rule.routineIds.length} rutinas ·{' '}
                  {rule.treatmentIds.length} tratamientos ·{' '}
                  {rule.productGroupIds.length} productos ·{' '}
                  {rule.supplementGroupIds.length} suplementos
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
