import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LegalCheckbox } from '../../components/LegalCheckbox';
import { LegalDocumentModal } from '../../components/legal/LegalDocumentModal';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { LEGAL_TERMS, type LegalDocId } from '../../data/legal/documents';
import { legalService } from '../../services/legal.service';

/**
 * Pantalla obligatoria para quien no aceptó la versión vigente de los
 * términos y la política de datos (pacientes creados por su profesional,
 * cuentas anteriores al cambio). La muestra RootNavigator.
 */
export function TermsAcceptanceView() {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const { refreshAccountStatus, logout } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<LegalDocId | null>(null);

  async function accept() {
    setSaving(true);
    setError(null);
    try {
      await legalService.accept();
      await refreshAccountStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar tu aceptación. Inténtalo de nuevo.');
      setSaving(false);
    }
  }

  const ready = terms && privacy && !saving;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }]}>
      <Text style={[styles.heading, { color: branding.colors.primaryDark }]}>Antes de continuar</Text>
      <Text style={styles.lead}>
        Lee y acepta los Términos y Condiciones y la Política de Tratamiento de Datos Personales de PIEL360.
      </Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.docTitle}>{LEGAL_TERMS.title}</Text>
        <Text style={styles.updated}>Última actualización: {LEGAL_TERMS.updatedAt}</Text>
        {LEGAL_TERMS.intro ? <Text style={styles.paragraph}>{LEGAL_TERMS.intro}</Text> : null}
        {LEGAL_TERMS.sections.map((section, i) => (
          <View key={section.heading ?? i} style={styles.section}>
            {section.heading ? <Text style={styles.sectionTitle}>{section.heading}</Text> : null}
            {section.paragraphs.map((p) => (
              <Text key={p} style={styles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={styles.checks}>
        <LegalCheckbox
          checked={terms}
          onChange={setTerms}
          disabled={saving}
          label="He leído y acepto los Términos y Condiciones de PIEL360."
          linkText="Leer"
          onPressLink={() => setOpenDoc('terms')}
        />
        <LegalCheckbox
          checked={privacy}
          onChange={setPrivacy}
          disabled={saving}
          label="He leído y acepto la Política de Tratamiento de Datos Personales."
          linkText="Leer"
          onPressLink={() => setOpenDoc('privacy')}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, { backgroundColor: branding.colors.primary }, !ready && styles.disabled]}
        disabled={!ready}
        onPress={() => void accept()}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color={branding.colors.buttonText} />
        ) : (
          <Text style={[styles.buttonText, { color: branding.colors.buttonText }]}>Aceptar y continuar</Text>
        )}
      </Pressable>
      <Pressable onPress={() => void logout()} style={styles.logout} accessibilityRole="button">
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
      <LegalDocumentModal docId={openDoc} visible={openDoc != null} onClose={() => setOpenDoc(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, gap: 10 },
  heading: { fontSize: 22, fontWeight: '800' },
  lead: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  scroll: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14 },
  scrollContent: { padding: 14, gap: 8 },
  docTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  updated: { fontSize: 12, color: '#6B7280' },
  section: { gap: 4, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  paragraph: { fontSize: 13, lineHeight: 19, color: '#4B5563' },
  checks: { gap: 4 },
  error: { color: '#DC2626', fontSize: 13 },
  button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  logout: { alignItems: 'center', paddingVertical: 6 },
  logoutText: { color: '#6B7280', fontSize: 14 },
});
