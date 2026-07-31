import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
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
};

export function YoucamInstructionsStep({
  onCancel,
}: YoucamInstructionsStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Instrucciones</Text>
      <Text style={styles.subtitle}>Prepárate para el análisis</Text>

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
        style={styles.primaryBtn}
        onPress={() =>
          Alert.alert(
            'Captura pendiente',
            'La captura Perfect Corp se conectará próximamente. Mientras tanto puedes revisar análisis YouCam ya existentes en el histórico.',
          )
        }
      >
        <Text style={styles.primaryBtnText}>Iniciar Análisis</Text>
      </Pressable>

      <Pressable style={styles.cancel} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </Pressable>

      <View style={styles.footerLogo}>
        <Text style={styles.footerLogoText}>PIEL 360</Text>
      </View>
    </View>
  );
}
