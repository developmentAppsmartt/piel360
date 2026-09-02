import { useMemo, useState, type ReactNode } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
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
    acuerdo: {
      title: 'Acuerdo de usuario',
      body: 'Al usar Piel 360 aceptas el tratamiento de tus datos de salud con fines de apoyo diagnóstico. El texto legal completo se publicará en esta sección.',
    },
    soporte: {
      title: 'Soporte',
      body: '¿Necesitas ayuda? Escribe a soporte@piel360.com o usa el chat con tu médico desde la pestaña Chat.',
    },
    acerca: {
      title: 'Acerca de Piel 360',
      body: 'Piel 360 AI — versión 1.0.0\n\nApoyo diagnóstico dermatológico con inteligencia artificial. Esta app no sustituye una consulta médica presencial.',
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
  const variant = isClinicalPanelUser(user) ? 'doctor' : 'patient';
  const info = overlay ? INFO_COPY[overlay] : null;

  function handleMenuSelect(id: AccountMenuId) {
    setMenuOpen(false);
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
    if (id === 'seguridad' || id === 'idioma' || id === 'compartir') {
      Alert.alert(
        'Próximamente',
        'Esta opción del menú se conectará en una siguiente iteración.',
      );
      return;
    }
    if (INFO_COPY[id]) {
      setOverlay(id);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack={Boolean(info) || showBack}
        onBack={info ? () => setOverlay(null) : onBack}
        messageCount={messageCount}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenMessages={onOpenMessages}
        onOpenGift={() => setOverlay('premios')}
      />
      {info ? (
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
    </View>
  );
}
