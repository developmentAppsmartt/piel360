import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../../components/AppIcon';
import { BrandLogo } from '../../../../components/BrandLogo';
import { Icons } from '../../../../components/icons';
import type { DoctorPatientsStyles } from '../styles/patients.styles';

type DoctorHeaderProps = {
  styles: DoctorPatientsStyles;
  /** Reservado por compatibilidad; el header muestra el logo, no el título. */
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  messageCount?: number;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
  onOpenGift?: () => void;
};

function defaultOpenGift() {
  Alert.alert(
    'Premios',
    'Aquí verás recompensas y beneficios de Piel 360. Este módulo se activará en una próxima versión.',
  );
}

export function DoctorHeader({
  styles,
  showBack,
  onBack,
  messageCount = 0,
  onOpenMenu,
  onOpenMessages,
  onOpenGift = defaultOpenGift,
}: DoctorHeaderProps) {
  const insets = useSafeAreaInsets();
  const onDark = styles.headerIcon.color as string;

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.headerLeft}>
        {showBack ? (
          <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Volver">
            <AppIcon icon={Icons.back} size={24} color={onDark} />
          </Pressable>
        ) : null}
        <BrandLogo height={48} style={styles.headerLogo} />
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={styles.headerIconBtn}
          onPress={onOpenGift}
          accessibilityLabel="Premios"
        >
          <AppIcon icon={Icons.gift} size={20} color={onDark} />
        </Pressable>
        <Pressable
          style={styles.headerIconBtn}
          onPress={onOpenMessages}
          accessibilityLabel="Mensajes"
        >
          <AppIcon icon={Icons.chat} size={20} color={onDark} />
          {messageCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{messageCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          style={styles.headerIconBtn}
          onPress={onOpenMenu}
          accessibilityLabel="Menú"
        >
          <AppIcon icon={Icons.menu} size={22} color={onDark} />
        </Pressable>
      </View>
    </View>
  );
}
