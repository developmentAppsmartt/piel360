import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { createAccountDrawerStyles } from '../styles/accountDrawer.styles';

export type AccountMenuId =
  | 'perfil'
  | 'config'
  | 'idioma'
  | 'suscripcion'
  | 'compartir'
  | 'seguridad'
  | 'password'
  | 'premios'
  | 'acuerdo'
  | 'soporte'
  | 'salir'
  | 'acerca';

type MenuItem = {
  id: AccountMenuId;
  label: string;
  icon: AppIconName;
  /** Indentación visual (subítem, p. ej. Change Password). */
  nested?: boolean;
};

const DOCTOR_MENU: MenuItem[] = [
  { id: 'perfil', label: 'Mi Perfil', icon: Icons.account },
  { id: 'config', label: 'Configuración del perfil', icon: Icons.settings },
  { id: 'idioma', label: 'Idioma diagnóstico', icon: Icons.translate },
  { id: 'suscripcion', label: 'Mis pagos', icon: Icons.creditCard },
  { id: 'compartir', label: 'Compartir con colega', icon: Icons.share },
  { id: 'seguridad', label: 'Seguridad', icon: Icons.lock },
  { id: 'password', label: 'Cambiar contraseña', icon: Icons.password, nested: true },
  { id: 'premios', label: 'Premios', icon: Icons.gift },
  { id: 'acuerdo', label: 'Acuerdo de usuario', icon: Icons.file },
  { id: 'soporte', label: 'Soporte', icon: Icons.support },
  { id: 'salir', label: 'Salir', icon: Icons.logout },
];

/** Menú del mockup paciente — Mi Cuenta. */
const PATIENT_MENU: MenuItem[] = [
  { id: 'perfil', label: 'Mi Perfil', icon: Icons.account },
  { id: 'config', label: 'Configuración del perfil', icon: Icons.settings },
  { id: 'seguridad', label: 'Seguridad', icon: Icons.lock },
  { id: 'password', label: 'Cambiar contraseña', icon: Icons.password, nested: true },
  { id: 'premios', label: 'Premios', icon: Icons.gift },
  { id: 'acuerdo', label: 'Acuerdo de usuario', icon: Icons.file },
  { id: 'soporte', label: 'Soporte', icon: Icons.support },
  { id: 'salir', label: 'Salir', icon: Icons.logout },
];

type AccountDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: AccountMenuId) => void;
  variant?: 'doctor' | 'patient';
};

export function AccountDrawer({
  visible,
  onClose,
  onSelect,
  variant = 'doctor',
}: AccountDrawerProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const styles = useMemo(
    () => createAccountDrawerStyles(branding.colors),
    [branding.colors],
  );
  const [securityOpen, setSecurityOpen] = useState(true);
  const menu = variant === 'patient' ? PATIENT_MENU : DOCTOR_MENU;

  const visibleItems = menu.filter((item) => {
    if (item.id === 'password') return securityOpen;
    return true;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.panel, { paddingTop: Math.max(insets.top, 12) }]}>
          <Text style={styles.title}>Mi Cuenta</Text>
          <ScrollView>
            {visibleItems.map((item) => {
              if (item.id === 'seguridad') {
                return (
                  <Pressable
                    key={item.id}
                    style={styles.item}
                    onPress={() => setSecurityOpen((v) => !v)}
                  >
                    <AppIcon icon={item.icon} size={20} color={branding.colors.muted} />
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.chevron}>{securityOpen ? '▾' : '▸'}</Text>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={item.id}
                  style={[styles.item, item.nested && styles.itemNested]}
                  onPress={() => onSelect(item.id)}
                >
                  <AppIcon icon={item.icon} size={20} color={branding.colors.muted} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}
            onPress={() => onSelect('acerca')}
          >
            <Text style={styles.footerLabel}>ACERCA DE PIEL 360 ▾</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
