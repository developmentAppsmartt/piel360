import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ChatStyles } from '../styles/chat.styles';

type ChatHeaderProps = {
  styles: ChatStyles;
  name: string;
  initials: string;
  onMore?: () => void;
};

export function ChatHeader({
  styles,
  name,
  initials,
  onMore,
}: ChatHeaderProps) {
  return (
    <View style={styles.peerBar}>
      <View style={styles.peerAvatar}>
        <Text style={styles.peerAvatarText}>{initials}</Text>
      </View>
      <Text style={styles.peerName} numberOfLines={1}>
        {name}
      </Text>
      <Pressable
        style={styles.headerBtn}
        onPress={onMore}
        accessibilityLabel="Más opciones"
      >
        <AppIcon
          icon={Icons.moreVertical}
          size={20}
          color={styles.peerName.color as string}
        />
      </Pressable>
    </View>
  );
}
