import { useMemo, useState, type ReactNode } from 'react';
import { Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaymentsBillingView } from '../doctor/payments/PaymentsBillingView';
import { PaymentsView } from '../doctor/payments/PaymentsView';
import { DoctorReportsView } from '../doctor/reports/DoctorReportsView';
import { FitzpatrickRulesView } from '../doctor/clinical-rules/FitzpatrickRulesView';
import { SkinAgeRulesView } from '../doctor/clinical-rules/SkinAgeRulesView';
import { SupportChatView } from '../support/SupportChatView';
import { DiagnosisLanguageView } from '../doctor/settings/DiagnosisLanguageView';
import { LegalDocumentModal } from '../../components/legal/LegalDocumentModal';
import { AboutPiel360Modal } from '../../components/about/AboutPiel360';
import { InviteColleagueModal } from '../doctor/home/InviteColleagueModal';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import type { LegalDocId } from '../../data/legal/documents';
import { isClinicalPanelUser } from '../../types/auth';
import { ChangePasswordFlow } from '../auth/forgot-password/ForgotPasswordView';
import {
  AccountDrawer,
  type AccountMenuId,
} from '../doctor/patients/components/AccountDrawer';
import { DoctorHeader } from '../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../doctor/patients/styles/patients.styles';

type AccountPanel =
  | 'idioma'
  | 'pagos'
  | 'soporte'
  | 'reportes'
  | 'fototipo'
  | 'edad_piel'
  | 'suscripcion'
  | null;

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
  messageCount = 0,
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [accountPanel, setAccountPanel] = useState<AccountPanel>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  const variant = isClinicalPanelUser(user) ? 'doctor' : 'patient';

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
    if (id === 'reportes') {
      setAccountPanel('reportes');
      return;
    }
    if (id === 'fototipo') {
      setAccountPanel('fototipo');
      return;
    }
    if (id === 'edad_piel') {
      setAccountPanel('edad_piel');
      return;
    }
    if (id === 'password') {
      setPasswordOpen(true);
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
      setAccountPanel('suscripcion');
      return;
    }
    if (id === 'acuerdo') {
      setLegalDoc(variant === 'doctor' ? 'terms-professional' : 'terms');
      return;
    }
    if (id === 'seguridad' || id === 'premios') {
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
      return;
    }
    if (id === 'compartir') {
      setInviteOpen(true);
      return;
    }
    if (id === 'acerca') {
      setAboutOpen(true);
    }
  }

  if (passwordOpen) {
    return (
      <ChangePasswordFlow
        title="Cambiar contraseña"
        initialEmail={user?.email ?? ''}
        onBack={() => setPasswordOpen(false)}
        onSuccess={() => setPasswordOpen(false)}
      />
    );
  }

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
        <AboutPiel360Modal
          visible={aboutOpen}
          onClose={() => setAboutOpen(false)}
        />
      </>
    );
  }

  if (accountPanel === 'soporte') {
    return (
      <>
        <SupportChatView onClose={() => setAccountPanel(null)} />
        <AboutPiel360Modal
          visible={aboutOpen}
          onClose={() => setAboutOpen(false)}
        />
      </>
    );
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
        <AboutPiel360Modal
          visible={aboutOpen}
          onClose={() => setAboutOpen(false)}
        />
      </>
    );
  }

  if (accountPanel === 'suscripcion') {
    return (
      <>
        <PaymentsView
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
        <AboutPiel360Modal
          visible={aboutOpen}
          onClose={() => setAboutOpen(false)}
        />
      </>
    );
  }

  if (accountPanel === 'reportes') {
    return (
      <DoctorReportsView
        onBack={() => setAccountPanel(null)}
        onOpenMessages={onOpenMessages}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  if (accountPanel === 'fototipo') {
    return (
      <FitzpatrickRulesView
        onBack={() => setAccountPanel(null)}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  if (accountPanel === 'edad_piel') {
    return (
      <SkinAgeRulesView
        onBack={() => setAccountPanel(null)}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack={showBack}
        onBack={onBack}
        messageCount={messageCount}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenMessages={onOpenMessages}
        onOpenGift={() =>
          Alert.alert(
            'Premios',
            'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
          )
        }
      />
      {children}
      <AccountDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleMenuSelect}
        variant={variant}
      />
      <AboutPiel360Modal
        visible={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />
      <InviteColleagueModal
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={() => setLegalDoc(null)}
      />
    </View>
  );
}
