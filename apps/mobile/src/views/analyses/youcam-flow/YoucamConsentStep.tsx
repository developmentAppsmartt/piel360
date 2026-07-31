import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { createYoucamFlowStyles } from './styles/youcamFlow.styles';

type YoucamConsentStepProps = {
  onNext: () => void;
  onCancel: () => void;
};

export function YoucamConsentStep({ onNext, onCancel }: YoucamConsentStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={styles.card}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Consentimiento</Text>
        <Text style={styles.subtitle}>Respetamos tu privacidad</Text>
        <Text style={styles.body}>
          Al continuar, autorizas el escaneo facial y el procesamiento de imágenes
          según el aviso de información de Piel 360, incluyendo la retención y
          eliminación de tus datos conforme a la política aplicable.
        </Text>
        <Text style={styles.bullet}>
          • Has revisado y aceptas los términos de uso del análisis de estado de
          la piel asistido por IA.
        </Text>
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
