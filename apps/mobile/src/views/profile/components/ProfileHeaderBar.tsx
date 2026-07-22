import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ProfileStyles } from '../styles/profile.styles';

type ProfileHeaderBarProps = {
  styles: ProfileStyles;
  title?: string;
  onBack?: () => void;
  onEdit?: () => void;
};

export function ProfileHeaderBar({
  styles,
  title = 'Mi Perfil',
  onBack,
  onEdit,
}: ProfileHeaderBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12) }]}>
      <Pressable
        style={styles.headerSide}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        {onBack ? (
          <AppIcon icon={Icons.back} size={28} color={styles.headerIcon.color as string} />
        ) : null}
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <Pressable
        style={styles.headerSide}
        onPress={onEdit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Editar perfil"
      >
        {onEdit ? (
          <AppIcon icon={Icons.edit} size={22} color={styles.headerIcon.color as string} />
        ) : null}
      </Pressable>
    </View>
  );
}
