import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import type { DoctorPatientsStyles } from '../styles/patients.styles';

type DoctorHeaderProps = {
  styles: DoctorPatientsStyles;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  messageCount?: number;
  onOpenMenu: () => void;
  onOpenMessages?: () => void;
};

export function DoctorHeader({
  styles,
  title,
  showBack,
  onBack,
  messageCount = 0,
  onOpenMenu,
  onOpenMessages,
}: DoctorHeaderProps) {
  const insets = useSafeAreaInsets();
  const onDark = styles.headerIcon.color as string;

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
      <View style={styles.headerLeft}>
        {showBack ? (
          <Pressable onPress={onBack} hitSlop={8}>
            <AppIcon icon={Icons.back} size={28} color={onDark} />
          </Pressable>
        ) : null}
        {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
      </View>
      <View style={styles.headerActions}>
        <Pressable style={styles.headerIconBtn} accessibilityLabel="Premios">
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
