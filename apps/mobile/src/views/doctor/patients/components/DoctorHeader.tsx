import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../../components/AppIcon';
import { BrandLogo } from '../../../../components/BrandLogo';
import { Icons } from '../../../../components/icons';
import { useNotificationsOptional } from '../../../../context/NotificationsContext';
import type { DoctorPatientsStyles } from '../styles/patients.styles';

type DoctorHeaderProps = {
  styles: DoctorPatientsStyles;
  /** Reservado por compatibilidad; el header muestra el logo, no el título. */
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** @deprecated usar notificationCount; se mantiene por compatibilidad. */
  messageCount?: number;
  notificationCount?: number;
  onOpenMenu: () => void;
  /** Abre inbox de notificaciones (mensajes + solicitudes). */
  onOpenNotifications?: () => void;
  /** @deprecated alias de onOpenNotifications. */
  onOpenMessages?: () => void;
  onOpenGift?: () => void;
  /** Oculta la campana (p. ej. ya estás en el inbox). */
  suppressNotifications?: boolean;
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
  messageCount,
  notificationCount,
  onOpenMenu,
  onOpenNotifications,
  onOpenMessages,
  onOpenGift = defaultOpenGift,
  suppressNotifications = false,
}: DoctorHeaderProps) {
  const insets = useSafeAreaInsets();
  const onDark = styles.headerIcon.color as string;
  const notifications = useNotificationsOptional();
  const badgeCount =
    notificationCount ??
    messageCount ??
    notifications?.unreadCount ??
    0;
  const openNotifications =
    onOpenNotifications ??
    onOpenMessages ??
    notifications?.openInbox;

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.headerLeft}>
        {showBack ? (
          <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Volver">
            <AppIcon icon={Icons.back} size={24} color={onDark} />
          </Pressable>
        ) : null}
        <BrandLogo variant="header" height={44} style={styles.headerLogo} />
      </View>
      <View style={styles.headerActions}>
        <Pressable
          style={styles.headerIconBtn}
          onPress={onOpenGift}
          accessibilityLabel="Premios"
        >
          <AppIcon icon={Icons.gift} size={20} color={onDark} />
        </Pressable>
        {!suppressNotifications ? (
          <Pressable
            style={styles.headerIconBtn}
            onPress={openNotifications}
            accessibilityLabel="Notificaciones"
          >
            <AppIcon icon={Icons.bell} size={20} color={onDark} />
            {badgeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
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
