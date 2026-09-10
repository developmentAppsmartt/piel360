import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { LegalDocumentModal } from '../../../../components/legal/LegalDocumentModal';
import { useBranding } from '../../../../context/BrandingContext';
import type { LegalDocId } from '../../../../data/legal/documents';
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
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

  return (
    <View style={[styles.scrollContent, { flex: 1 }]}>
      <View style={styles.card}>
        <Text style={styles.consentTitle}>Consentimiento</Text>
        <Text style={styles.consentSubtitle}>Respetamos tu privacidad.</Text>
        <Text style={styles.consentBody}>
          Al registrar este paciente confirmas que cuentas con su autorización para
          almacenar datos clínicos e imágenes asociadas a diagnósticos asistidos
          por IA en PIEL360, conforme a los Términos y Condiciones y la Política
          de Tratamiento de Datos Personales.
        </Text>

        <Pressable onPress={() => setLegalDoc('terms')}>
          <Text style={{ color: branding.colors.primary, fontWeight: '700', marginBottom: 6 }}>
            Ver Términos y Condiciones
          </Text>
        </Pressable>
        <Pressable onPress={() => setLegalDoc('privacy')}>
          <Text style={{ color: branding.colors.primary, fontWeight: '700', marginBottom: 12 }}>
            Ver Política de Privacidad
          </Text>
        </Pressable>

        <Pressable style={styles.checkRow} onPress={() => setAccepted((v) => !v)}>
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted ? (
              <AppIcon icon={Icons.check} size={14} color="#FFF" />
            ) : null}
          </View>
          <Text style={styles.checkLabel}>
            He leído y acepto los Términos y Condiciones y la Política de
            Tratamiento de Datos Personales.
          </Text>
        </Pressable>

        <Pressable
          style={[styles.nextBtn, (!accepted || submitting) && styles.nextBtnDisabled]}
          disabled={!accepted || submitting}
          onPress={onAccept}
        >
          <Text style={styles.nextBtnText}>
            {submitting ? 'Guardando...' : 'Aceptar y continuar'}
          </Text>
        </Pressable>
        <Pressable onPress={onBack} style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: branding.colors.muted, fontWeight: '600' }}>Volver</Text>
        </Pressable>
      </View>

      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={() => setLegalDoc(null)}
      />
    </View>
  );
}
