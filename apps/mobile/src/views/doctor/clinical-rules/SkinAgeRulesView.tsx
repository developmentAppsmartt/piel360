import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  skinAgeRulesService,
  type SkinAgeRecommended,
  type SkinAgeRule,
} from '../../../services/skin-age-rules.service';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import {
  RULE_COLOR_HEX,
  createClinicalRulesStyles,
  formatSkinAgeDifferenceRange,
  priorityLabel,
} from './styles/clinicalRules.styles';

type SkinAgeRulesViewProps = {
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

export function SkinAgeRulesView({
  onBack,
  onOpenMessages,
}: SkinAgeRulesViewProps) {
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

  const [rules, setRules] = useState<SkinAgeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState('1987-03-15');
  const [skinAgeYears, setSkinAgeYears] = useState('46');
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<SkinAgeRecommended | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await skinAgeRulesService.list();
      setRules(list);
    } catch (err) {
      setRules([]);
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las reglas de edad de piel.',
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
    const age = Number(skinAgeYears);
    if (!birthDate.trim() || Number.isNaN(age)) {
      Alert.alert('Datos incompletos', 'Indica fecha de nacimiento y edad de piel.');
      return;
    }
    setSimulating(true);
    try {
      const result = await skinAgeRulesService.simulate({
        birthDate: birthDate.trim(),
        skinAgeYears: age,
      });
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

  async function toggleActive(rule: SkinAgeRule) {
    try {
      const updated = await skinAgeRulesService.setActive(
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
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={styles.title}>Edad de piel</Text>
            <Text style={styles.subtitle}>
              Reglas según la diferencia entre edad cronológica y edad de piel
              estimada por el análisis estético.
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
              Fecha de nacimiento (AAAA-MM-DD) y edad de piel estimada.
            </Text>
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="1987-03-15"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="none"
            />
            <TextInput
              value={skinAgeYears}
              onChangeText={setSkinAgeYears}
              placeholder="Edad de piel (años)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              keyboardType="number-pad"
            />
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
                {simulation.snapshot.skinAgeDifference != null ? (
                  <Text style={styles.ruleMeta}>
                    Diferencia: {simulation.snapshot.skinAgeDifference > 0 ? '+' : ''}
                    {simulation.snapshot.skinAgeDifference} años
                  </Text>
                ) : null}
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
              Aún no hay reglas. Créalas en el CRM (Reglas por edad de piel).
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
                  {formatSkinAgeDifferenceRange(
                    rule.minDifference,
                    rule.maxDifference,
                  )}{' '}
                  · Prioridad {priorityLabel(rule.priority)}
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
