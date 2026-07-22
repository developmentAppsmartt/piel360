import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

type ChatHeaderProps = {
  styles: ChatStyles;
  name: string;
  initials: string;
  onBack: () => void;
  onMore?: () => void;
};

export function ChatHeader({
  styles,
  name,
  initials,
  onBack,
  onMore,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const onDark = styles.headerBtnText.color as string;
  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
      <Pressable
        style={styles.headerBtn}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <AppIcon icon={Icons.back} size={28} color={onDark} />
      </Pressable>
      <View style={styles.headerAvatar}>
        <Text style={styles.headerAvatarText}>{initials}</Text>
      </View>
      <Text style={styles.headerName} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.headerActions}>
        <Pressable style={styles.headerBtn} accessibilityLabel="Videollamada">
          <AppIcon icon={Icons.video} size={20} color={onDark} />
        </Pressable>
        <Pressable
          style={styles.headerBtn}
          onPress={onMore}
          accessibilityLabel="Más opciones"
        >
          <AppIcon icon={Icons.moreVertical} size={20} color={onDark} />
        </Pressable>
      </View>
    </View>
  );
}
