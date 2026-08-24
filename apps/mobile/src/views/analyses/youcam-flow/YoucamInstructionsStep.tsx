import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { requireGuidedFaceCapture } from '../../../native/guidedCapture';
import { createYoucamFlowStyles } from './styles/youcamFlow.styles';

const TIPS: { icon: (typeof Icons)[keyof typeof Icons]; text: string }[] = [
  {
    icon: Icons.eye,
    text: 'Quítate las gafas y asegúrate de que el cabello no cubra tu frente',
  },
  {
    icon: Icons.alertCircle,
    text: 'Asegúrate de estar en un ambiente bien iluminado',
  },
  {
    icon: Icons.smile,
    text: 'Retira el maquillaje para obtener resultados más precisos',
  },
  {
    icon: Icons.camera,
    text: 'Mira directamente a la cámara y mantén tu cara en el círculo',
  },
];

type YoucamInstructionsStepProps = {
  onCancel: () => void;
  /** URI local de la foto capturada con Camera Kit. */
  onCaptured: (imageUri: string) => void;
};

export function YoucamInstructionsStep({
  onCancel,
  onCaptured,
}: YoucamInstructionsStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    if (busy) return;
    setBusy(true);
    try {
      const capture = await requireGuidedFaceCapture();
      onCaptured(capture.uri);
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'E_CANCELLED') return;

      Alert.alert(
        'Análisis estético',
        err instanceof Error
          ? err.message
          : 'No se pudo completar la captura.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Instrucciones</Text>
      <Text style={styles.subtitle}>
        Usa la captura guiada de Piel 360. Verás indicadores de iluminación, mirada y
        posición de la cara.
      </Text>

      <ScrollView style={styles.tipList} showsVerticalScrollIndicator={false}>
        {TIPS.map((tip) => (
          <View key={tip.text} style={styles.tipRow}>
            <View style={styles.tipIcon}>
              <AppIcon
                icon={tip.icon}
                size={22}
                color={branding.colors.primary}
              />
            </View>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
        disabled={busy}
        onPress={() => void handleStart()}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Iniciar con Camera Kit</Text>
        )}
      </Pressable>

      <Pressable style={styles.cancel} onPress={onCancel} disabled={busy}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>

      <View style={styles.footerLogo}>
        <Text style={styles.footerLogoText}>PIEL 360</Text>
      </View>
    </View>
  );
}
