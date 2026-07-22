import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { createAccountDrawerStyles } from '../styles/accountDrawer.styles';

const MENU: {
  id:
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
    | 'salir';
  label: string;
  icon: AppIconName;
}[] = [
  { id: 'perfil', label: 'Mi Perfil', icon: Icons.account },
  { id: 'config', label: 'Configuración del perfil', icon: Icons.settings },
  { id: 'idioma', label: 'Idioma diagnóstico', icon: Icons.translate },
  { id: 'suscripcion', label: 'Mis pagos', icon: Icons.creditCard },
  { id: 'compartir', label: 'Compartir con colega', icon: Icons.share },
  { id: 'seguridad', label: 'Seguridad', icon: Icons.lock },
  { id: 'password', label: 'Change Password', icon: Icons.password },
  { id: 'premios', label: 'Premios', icon: Icons.gift },
  { id: 'acuerdo', label: 'Acuerdo de usuario', icon: Icons.file },
  { id: 'soporte', label: 'Soporte', icon: Icons.support },
  { id: 'salir', label: 'Salir', icon: Icons.logout },
];

type AccountDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: (typeof MENU)[number]['id']) => void;
};

export function AccountDrawer({ visible, onClose, onSelect }: AccountDrawerProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const styles = useMemo(
    () => createAccountDrawerStyles(branding.colors),
    [branding.colors],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.panel, { paddingTop: Math.max(insets.top, 12) }]}>
          <Text style={styles.title}>Mi Cuenta</Text>
          <ScrollView>
            {MENU.map((item) => (
              <Pressable
                key={item.id}
                style={styles.item}
                onPress={() => onSelect(item.id)}
              >
                <AppIcon icon={item.icon} size={20} color={branding.colors.muted} />
                <Text style={styles.itemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <Text style={styles.footerLabel}>ACERCA DE PIEL 360 ▾</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
