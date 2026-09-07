import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { BrandLogo } from '../../../components/BrandLogo';
import { Icons } from '../../../components/icons';
import { LegalDocumentModal } from '../../../components/legal/LegalDocumentModal';
import { useBranding } from '../../../context/BrandingContext';
import type { LegalDocId } from '../../../data/legal/documents';
import { createYoucamFlowStyles } from './styles/youcamFlow.styles';

type YoucamConsentStepProps = {
  onNext: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  body?: string;
  /** Texto corto de privacidad (opcional). */
  privacyShort?: string;
  checkboxLabel?: string;
  ctaLabel?: string;
  privacyDocId?: LegalDocId;
  privacyLinkLabel?: string;
};

const DEFAULT_BODY =
  'Al continuar, autorizas el escaneo facial y el procesamiento de imágenes según el aviso de información de Piel 360, incluyendo la retención y eliminación de tus datos conforme a la política aplicable.';

export function YoucamConsentStep({
  onNext,
  onCancel,
  title = 'Consentimiento',
  subtitle = 'Respetamos tu privacidad',
  body = DEFAULT_BODY,
  privacyShort,
  checkboxLabel = 'Al marcar esta casilla, confirmo que he leído y acepto los Términos y condiciones y la política de privacidad',
  ctaLabel = 'Siguiente',
  privacyDocId = 'privacy',
  privacyLinkLabel = 'Ver Políticas de Privacidad',
}: YoucamConsentStepProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createYoucamFlowStyles(branding.colors),
    [branding.colors],
  );
  const [accepted, setAccepted] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <View style={styles.card}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.body}>{body}</Text>
        {privacyShort ? (
          <Text style={[styles.body, { marginTop: 8 }]}>{privacyShort}</Text>
        ) : null}
        <Pressable onPress={() => setLegalOpen(true)}>
          <Text style={styles.link}>{privacyLinkLabel}</Text>
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
          <Text style={styles.checkLabel}>{checkboxLabel}</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryBtn, !accepted && styles.primaryBtnDisabled]}
          disabled={!accepted}
          onPress={onNext}
        >
          <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
        </Pressable>

        <Pressable style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footerLogo}>
        <BrandLogo height={28} />
      </View>

      <LegalDocumentModal
        docId={privacyDocId}
        visible={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </View>
  );
}
