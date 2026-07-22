import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { createCreatePatientStyles } from '../styles/createPatient.styles';

type ConsentStepProps = {
  onBack: () => void;
  onAccept: () => void;
  submitting?: boolean;
};

export function ConsentStep({ onBack, onAccept, submitting }: ConsentStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createCreatePatientStyles(branding.colors),
    [branding.colors],
  );
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={[styles.scrollContent, { flex: 1 }]}>
      <View style={styles.card}>
        <Text style={styles.consentTitle}>Consentimiento</Text>
        <Text style={styles.consentSubtitle}>Respetamos tu privacidad.</Text>
        <Text style={styles.consentBody}>
          Al registrar este paciente confirmas que cuentas con su autorización para
          almacenar datos clínicos e imágenes asociadas a diagnósticos asistidos
          por IA en Piel360, conforme a la normativa aplicable de protección de
          datos.
        </Text>

        <Pressable style={styles.checkRow} onPress={() => setAccepted((v) => !v)}>
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted ? (
              <AppIcon icon={Icons.check} size={14} color="#FFF" />
            ) : null}
          </View>
          <Text style={styles.checkLabel}>
            He leído y acepto los términos y condiciones y las políticas de privacidad.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.nextBtn, (!accepted || submitting) && styles.nextBtnDisabled]}
          disabled={!accepted || submitting}
          onPress={onAccept}
        >
          <Text style={styles.nextBtnText}>
            {submitting ? 'Guardando...' : 'Siguiente'}
          </Text>
        </Pressable>
        <Pressable onPress={onBack} style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: branding.colors.muted, fontWeight: '600' }}>Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}
