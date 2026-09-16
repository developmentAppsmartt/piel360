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
import { WebView } from 'react-native-webview';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  emailTemplatesService,
  type EmailTemplateMeta,
  type EmailTemplateOrDefault,
} from '../../../services/email-templates.service';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { createClinicalRulesStyles } from './styles/clinicalRules.styles';

const EVENT_KINDS = [
  'appointment_scheduled',
  'report_ready',
  'patient_invitation',
] as const;

type EmailTemplatesViewProps = {
  onBack: () => void;
  onOpenMessages?: () => void;
};

function previewHtml(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
    body{margin:0;padding:16px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1a2b3c;font-size:15px;line-height:1.5;}
    a{color:#1E5A9E;}
    img{max-width:100%;height:auto;display:block;border:0;}
  </style></head><body>${bodyHtml}</body></html>`;
}

export function EmailTemplatesView({
  onBack,
  onOpenMessages,
}: EmailTemplatesViewProps) {
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

  const [meta, setMeta] = useState<EmailTemplateMeta | null>(null);
  const [kind, setKind] = useState<string>(EVENT_KINDS[0]);
  const [template, setTemplate] = useState<EmailTemplateOrDefault | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kinds = useMemo(() => {
    const fromMeta = meta?.kinds ?? [];
    if (fromMeta.length > 0) return fromMeta;
    return EVENT_KINDS.map((id) => ({
      id,
      label:
        id === 'appointment_scheduled'
          ? 'Cita agendada'
          : id === 'report_ready'
            ? 'Obtener informe'
            : 'Invitación de paciente',
    }));
  }, [meta]);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await emailTemplatesService.meta();
      setMeta(data);
      const first =
        data.kinds.find((k) =>
          (EVENT_KINDS as readonly string[]).includes(k.id),
        )?.id ?? data.kinds[0]?.id;
      if (first) setKind(first);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las plantillas.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplate = useCallback(async (selectedKind: string) => {
    setLoadingTpl(true);
    try {
      const tpl = await emailTemplatesService.getByKind(selectedKind);
      setTemplate(tpl);
    } catch (err) {
      setTemplate(null);
      Alert.alert(
        'Error',
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar la plantilla.',
      );
    } finally {
      setLoadingTpl(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!kind) return;
    void loadTemplate(kind);
  }, [kind, loadTemplate]);

  async function toggleActive() {
    if (!template?.id) {
      Alert.alert(
        'Plantilla por defecto',
        'Guarda o personaliza esta plantilla en el CRM para activarla o desactivarla.',
      );
      return;
    }
    try {
      const updated = await emailTemplatesService.setActive(
        template.id,
        !template.isActive,
      );
      setTemplate({
        ...template,
        ...updated,
        isDefault: false,
      });
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError
          ? err.message
          : 'No se pudo actualizar la plantilla.',
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
            <Text style={styles.title}>Plantillas reportes</Text>
            <Text style={styles.subtitle}>
              Correos automáticos de cita, informe e invitación. La edición
              avanzada sigue en el CRM; aquí puedes revisar y activar.
            </Text>
          </View>

          {meta ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Integración de correo</Text>
              <Text style={styles.cardBody}>
                {meta.integrations.mailProvider.message ||
                  (meta.integrations.mailProvider.connected
                    ? `Conectado (${meta.integrations.mailProvider.provider ?? 'ok'})`
                    : 'Sin proveedor de correo conectado')}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Evento</Text>
            <View style={styles.chipRow}>
              {kinds.map((k) => {
                const active = kind === k.id;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => setKind(k.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loadingTpl ? (
            <View style={styles.centered}>
              <ActivityIndicator color={primary} />
            </View>
          ) : template ? (
            <View style={styles.card}>
              <View style={styles.ruleHeader}>
                <Text style={styles.cardTitle}>{template.name}</Text>
                <View
                  style={[
                    styles.badge,
                    template.isDefault && styles.badgeMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      template.isDefault && styles.badgeMutedText,
                    ]}
                  >
                    {template.isDefault
                      ? 'Por defecto'
                      : template.isActive
                        ? 'Activa'
                        : 'Inactiva'}
                  </Text>
                </View>
              </View>
              <Text style={styles.ruleMeta}>{template.kindLabel}</Text>
              <Text style={styles.recoTitle}>Asunto</Text>
              <Text style={styles.cardBody}>{template.subject}</Text>
              {template.preheader ? (
                <>
                  <Text style={styles.recoTitle}>Preheader</Text>
                  <Text style={styles.cardBody}>{template.preheader}</Text>
                </>
              ) : null}

              {!template.isDefault && template.id ? (
                <View style={styles.ruleHeader}>
                  <Text style={styles.cardBody}>Usar esta plantilla</Text>
                  <Switch
                    value={template.isActive}
                    onValueChange={() => void toggleActive()}
                    trackColor={{ false: '#D1D5DB', true: `${primary}88` }}
                    thumbColor={template.isActive ? primary : '#F9FAFB'}
                  />
                </View>
              ) : null}

              <Text style={styles.recoTitle}>Vista previa</Text>
              <View style={styles.previewBox}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: previewHtml(template.bodyHtml) }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  scrollEnabled
                />
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Sin plantilla para este evento.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
