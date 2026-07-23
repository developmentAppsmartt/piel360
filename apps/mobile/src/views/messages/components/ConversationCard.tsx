import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { Conversation } from '../../../types/messages';
import type { MessagesStyles } from '../styles/messages.styles';

type ConversationCardProps = {
  styles: MessagesStyles;
  conversation: Conversation;
  onPress: () => void;
};

export function ConversationCard({
  styles,
  conversation,
  onPress,
}: ConversationCardProps) {
  const unread = conversation.unreadCount > 0;
  const primary = styles.readMark.color as string;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Conversación con ${conversation.peerName}`}
    >
      {unread ? <View style={styles.cardUnreadBar} /> : null}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{conversation.peerInitials}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {conversation.peerName}
          </Text>
          <Text style={styles.cardTime}>{conversation.timeLabel}</Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardPreview} numberOfLines={1}>
            {conversation.preview}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
            </View>
          ) : conversation.messages.at(-1)?.from === 'me' ? (
            <AppIcon icon={Icons.checkAll} size={16} color={primary} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
