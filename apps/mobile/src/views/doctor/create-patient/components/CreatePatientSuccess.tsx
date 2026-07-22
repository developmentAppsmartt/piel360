import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { createCreatePatientStyles } from '../styles/createPatient.styles';

type CreatePatientSuccessProps = {
  patientId: string;
  onDone: () => void;
  onNewDermatology?: () => void;
  onNewSkinState?: () => void;
};

export function CreatePatientSuccess({
  patientId,
  onDone,
  onNewDermatology,
  onNewSkinState,
}: CreatePatientSuccessProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createCreatePatientStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.successWrap}>
      <View style={styles.successIcon}>
        <AppIcon
          icon={Icons.smile}
          size={40}
          color={branding.colors.primary}
        />
      </View>
      <Text style={styles.successTitle}>Nuevo Paciente Creado</Text>
      <Text style={styles.successId}>ID {patientId}</Text>

      <Pressable onPress={onNewDermatology}>
        <Text style={styles.successLink}>ℹ Nuevo Análisis Dermatológico</Text>
      </Pressable>
      <Pressable onPress={onNewSkinState}>
        <Text style={styles.successLink}>ℹ Nuevo Análisis Estado de la Piel</Text>
      </Pressable>

      <Pressable style={styles.successDone} onPress={onDone}>
        <Text style={styles.nextBtnText}>Ir al listado</Text>
      </Pressable>
    </View>
  );
}
