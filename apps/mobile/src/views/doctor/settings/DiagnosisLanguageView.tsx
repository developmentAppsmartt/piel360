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
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  usersService,
  type DiagnosticLanguage,
} from '../../../services/users.service';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createPaymentsStyles } from '../payments/styles/payments.styles';

const OPTIONS: {
  id: DiagnosticLanguage;
  title: string;
  hint: string;
}[] = [
  {
    id: 'es',
    title: 'Español',
    hint: 'Informe y términos del diagnóstico dermatológico en español.',
  },
  {
    id: 'en',
    title: 'English',
    hint: 'Informe y términos del diagnóstico dermatológico en inglés.',
  },
];

type DiagnosisLanguageViewProps = {
  onBack: () => void;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

export function DiagnosisLanguageView({
  onBack,
  onOpenMenu,
  onOpenMessages,
}: DiagnosisLanguageViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createPaymentsStyles(branding.colors),
    [branding.colors],
  );
  const [language, setLanguage] = useState<DiagnosticLanguage>('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLanguage(await usersService.getDiagnosticLanguage());
    } catch {
      setLanguage('es');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function select(next: DiagnosticLanguage) {
    if (saving || next === language) return;
    setSaving(true);
    try {
      await usersService.updateDiagnosticLanguage(next);
      setLanguage(next);
    } catch (err) {
      Alert.alert(
        'No se pudo guardar',
        err instanceof ApiError
          ? err.message
          : 'No se actualizó el idioma del diagnóstico.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack
        onBack={onBack}
        onOpenMenu={onOpenMenu}
        onOpenMessages={onOpenMessages}
      />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Pressable
            style={styles.roundBtn}
            onPress={onBack}
            accessibilityLabel="Volver"
          >
            <AppIcon
              icon={Icons.back}
              size={22}
              color={branding.colors.textOnDark}
            />
          </Pressable>
          <Text style={styles.cardTitle}>Idioma diagnóstico</Text>
          <View style={styles.moreBtn} />
        </View>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={branding.colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            <View style={styles.block}>
              <Text style={styles.sectionTitle}>
                Diagnóstico dermatológico
              </Text>
              <Text style={styles.sectionHint}>
                Este idioma se usa al generar el informe dermatológico (no
                cambia el idioma de la app). Se aplica en el siguiente
                análisis dermatológico.
              </Text>
              {OPTIONS.map((option) => {
                const active = language === option.id;
                return (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.languageOption,
                      active ? styles.languageOptionActive : null,
                    ]}
                    disabled={saving}
                    onPress={() => void select(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <AppIcon
                      icon={active ? Icons.checkboxOn : Icons.checkboxOff}
                      size={22}
                      color={
                        active
                          ? branding.colors.primary
                          : branding.colors.muted
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.languageTitle}>{option.title}</Text>
                      <Text style={styles.languageHint}>{option.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
