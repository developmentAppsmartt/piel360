import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import {
  ANALYSIS_PROVIDER_STATIC_LABELS,
  isAnalysisProviderSlug,
} from '../../data/analysisProviderLabel';
import type { AnalysisRequest } from '../../services/patients.service';
import { DoctorHeader } from '../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../doctor/patients/styles/patients.styles';
import { createYoucamFlowStyles } from './youcam-flow/styles/youcamFlow.styles';

type PendingAnalysesPickerProps = {
  requests: AnalysisRequest[];
  onSelect: (request: AnalysisRequest) => void;
  onClose: () => void;
  onOpenMenu?: () => void;
  onOpenMessages?: () => void;
};

function labelFor(slug: string): string {
  if (isAnalysisProviderSlug(slug)) {
    return ANALYSIS_PROVIDER_STATIC_LABELS[slug];
  }
  return 'Análisis solicitado';
}

export function PendingAnalysesPicker({
  requests,
  onSelect,
  onClose,
  onOpenMenu,
  onOpenMessages,
}: PendingAnalysesPickerProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        title="Análisis solicitados"
        showBack
        onBack={onClose}
        onOpenMenu={onOpenMenu ?? (() => undefined)}
        onOpenMessages={onOpenMessages}
      />
      <View style={styles.card}>
        <Text style={styles.title}>Elige un análisis</Text>
        <Text style={styles.subtitle}>
          Tu médico te pidió completar {requests.length === 1 ? 'este análisis' : 'estos análisis'}
        </Text>
        <Text style={styles.body}>
          Selecciona uno para continuar con el consentimiento y la captura.
        </Text>

        {requests.map((req) => (
          <Pressable
            key={req.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 10,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: `${branding.colors.primary}55`,
              backgroundColor: `${branding.colors.primary}12`,
            }}
            onPress={() => onSelect(req)}
            accessibilityRole="button"
            accessibilityLabel={labelFor(req.providerSlug)}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: branding.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon
                icon={Icons.skin}
                size={22}
                color={branding.colors.textOnDark}
              />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                fontWeight: '700',
                color: branding.colors.text,
              }}
            >
              {labelFor(req.providerSlug)}
            </Text>
            <AppIcon
              icon={Icons.chevronRight}
              size={20}
              color={branding.colors.muted}
            />
          </Pressable>
        ))}

        <Pressable style={styles.cancel} onPress={onClose}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}
