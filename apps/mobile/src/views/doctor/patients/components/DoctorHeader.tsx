import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../../components/AppIcon';
import { BrandLogo } from '../../../../components/BrandLogo';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import { useNotificationsOptional } from '../../../../context/NotificationsContext';
import { useDeviceLayout } from '../../../../styles/deviceLayout';
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
  const branding = useBranding();
  const { isTablet, isTablet10 } = useDeviceLayout();
  const logoHeight = isTablet10 ? 76 : isTablet ? 68 : 44;
  const companyLogo = branding.companyLogoImage;
  // Logo personalizado: en 10″+ debe leerse a distancia (en teléfono 72×26).
  const companyLogoSize = isTablet10
    ? { width: 168, height: 60 }
    : isTablet
      ? { width: 120, height: 44 }
      : { width: 72, height: 26 };
  const companyChipPad = isTablet10
    ? { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }
    : isTablet
      ? { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }
      : null;
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
        <BrandLogo
          variant="header"
          height={logoHeight}
          style={[
            styles.headerLogo,
            isTablet && { maxHeight: isTablet10 ? 80 : 72, maxWidth: 240 },
            companyLogo && {
              maxWidth: isTablet10 ? 200 : isTablet ? 160 : 108,
            },
            { tintColor: branding.colors.iconOnHeader },
          ]}
        />
        {companyLogo ? (
          <>
            <View
              style={[
                styles.headerLogoDivider,
                isTablet10 && { height: 44 },
                isTablet && !isTablet10 && { height: 32 },
              ]}
            />
            <View
              style={[styles.headerCompanyLogoChip, companyChipPad]}
            >
              <Image
                source={companyLogo}
                style={[styles.headerCompanyLogo, companyLogoSize]}
                resizeMode="contain"
                accessibilityLabel="Logo de la empresa"
              />
            </View>
          </>
        ) : null}
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
