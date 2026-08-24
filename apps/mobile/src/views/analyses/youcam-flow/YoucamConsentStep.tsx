import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { createYoucamFlowStyles } from './styles/youcamFlow.styles';

type YoucamConsentStepProps = {
  onNext: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  body?: string;
  bullet?: string;
};

const DEFAULT_BODY =
  'Al continuar, autorizas el escaneo facial y el procesamiento de imágenes según el aviso de información de Piel 360, incluyendo la retención y eliminación de tus datos conforme a la política aplicable.';

const DEFAULT_BULLET =
  '• Has revisado y aceptas los términos de uso del análisis de estado de la piel asistido por IA.';

export function YoucamConsentStep({
  onNext,
  onCancel,
  title = 'Consentimiento',
  subtitle = 'Respetamos tu privacidad',
  body = DEFAULT_BODY,
  bullet = DEFAULT_BULLET,
}: YoucamConsentStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={styles.card}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.bullet}>{bullet}</Text>
        <Pressable
          onPress={() =>
            Alert.alert(
              'Políticas de privacidad',
              'El texto legal completo se publicará en esta sección. Mientras tanto aplica el acuerdo de usuario de Piel 360.',
            )
          }
        >
          <Text style={styles.link}>Ver Políticas de Privacidad</Text>
        </Pressable>

        <Pressable
          style={styles.checkRow}
          onPress={() => setAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted ? (
              <AppIcon icon={Icons.check} size={14} color="#FFF" />
            ) : null}
          </View>
          <Text style={styles.checkLabel}>
            Al marcar esta casilla, confirmo que he leído y acepto los Términos y
            condiciones y la política de privacidad
          </Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, !accepted && styles.primaryBtnDisabled]}
          disabled={!accepted}
          onPress={onNext}
        >
          <Text style={styles.primaryBtnText}>Siguiente</Text>
        </Pressable>

        <Pressable style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footerLogo}>
        <Text style={styles.footerLogoText}>PIEL 360</Text>
      </View>
    </View>
  );
}
