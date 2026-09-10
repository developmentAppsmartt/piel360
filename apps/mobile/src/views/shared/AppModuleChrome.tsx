import { useMemo, useState, type ReactNode } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaymentsBillingView } from '../doctor/payments/PaymentsBillingView';
import { SupportChatView } from '../support/SupportChatView';
import { DiagnosisLanguageView } from '../doctor/settings/DiagnosisLanguageView';
import { LegalDocumentModal } from '../../components/legal/LegalDocumentModal';
import { AboutPiel360Content } from '../../components/about/AboutPiel360';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import type { LegalDocId } from '../../data/legal/documents';
import { isClinicalPanelUser } from '../../types/auth';
import {
  AccountDrawer,
  type AccountMenuId,
} from '../doctor/patients/components/AccountDrawer';
import { DoctorHeader } from '../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../doctor/patients/styles/patients.styles';

const INFO_COPY: Partial<Record<AccountMenuId, { title: string; body: string }>> =
  {
    password: {
      title: 'Cambiar contraseña',
      body: 'Pronto podrás cambiar tu contraseña desde aquí. Mientras tanto usa “Olvidé mi contraseña” en el inicio de sesión si necesitas restablecerla.',
    },
    premios: {
      title: 'Premios',
      body: 'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
    },
  };

type AppModuleChromeProps = {
  children?: ReactNode;
  onOpenMessages?: () => void;
  onOpenProfile?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  messageCount?: number;
  onConfig?: () => void;
  onSubscription?: () => void;
};

export function AppModuleChrome({
  children,
  onOpenMessages,
  onOpenProfile,
  showBack,
  onBack,
  messageCount = 1,
  onConfig,
  onSubscription,
}: AppModuleChromeProps) {
  const { logout, user } = useAuth();
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlay, setOverlay] = useState<AccountMenuId | null>(null);
  const [accountPanel, setAccountPanel] = useState<
    'idioma' | 'pagos' | 'soporte' | null
  >(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const variant = isClinicalPanelUser(user) ? 'doctor' : 'patient';
  const info = overlay ? INFO_COPY[overlay] : null;

  if (accountPanel === 'idioma') {
    return (
      <>
        <DiagnosisLanguageView
          onBack={() => setAccountPanel(null)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant={variant}
        />
      </>
    );
  }

  if (accountPanel === 'soporte') {
    return <SupportChatView onClose={() => setAccountPanel(null)} />;
  }

  if (accountPanel === 'pagos') {
    return (
      <>
        <PaymentsBillingView
          onBack={() => setAccountPanel(null)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenMessages={onOpenMessages}
        />
        <AccountDrawer
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onSelect={handleMenuSelect}
          variant={variant}
        />
      </>
    );
  }

  function handleMenuSelect(id: AccountMenuId) {
    setMenuOpen(false);
    if (id === 'idioma') {
      setAccountPanel('idioma');
      return;
    }
    if (id === 'pagos') {
      setAccountPanel('pagos');
      return;
    }
    if (id === 'soporte') {
      setAccountPanel('soporte');
      return;
    }
    setAccountPanel(null);
    if (id === 'salir') {
      void logout();
      return;
    }
    if (id === 'perfil') {
      onOpenProfile?.();
      return;
    }
    if (id === 'config') {
      (onConfig ?? onOpenProfile)?.();
      return;
    }
    if (id === 'suscripcion') {
      if (onSubscription) {
        onSubscription();
        return;
      }
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
      return;
    }
    if (id === 'acuerdo') {
      setLegalDoc(variant === 'doctor' ? 'terms-professional' : 'terms');
      return;
    }
    if (id === 'seguridad' || id === 'compartir') {
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
      return;
    }
    if (id === 'acerca') {
      setOverlay('acerca');
      return;
    }
    if (INFO_COPY[id]) {
      setOverlay(id);
    }
  }

  const showingAbout = overlay === 'acerca';
  const showingInfo = Boolean(info);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack={showingAbout || showingInfo || showBack}
        onBack={
          showingAbout || showingInfo ? () => setOverlay(null) : onBack
        }
        messageCount={messageCount}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenMessages={onOpenMessages}
        onOpenGift={() => setOverlay('premios')}
      />
      {showingAbout ? (
        <AboutPiel360Content />
      ) : showingInfo && info ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: branding.colors.text,
              marginBottom: 12,
            }}
          >
            {info.title}
          </Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 22,
              color: branding.colors.muted,
            }}
          >
            {info.body}
          </Text>
        </ScrollView>
      ) : (
        children
      )}
      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
        variant={variant}
      />
      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={() => setLegalDoc(null)}
      />
    </View>
  );
}
