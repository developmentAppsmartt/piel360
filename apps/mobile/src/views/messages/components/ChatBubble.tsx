import { Text, View } from 'react-native';
import type { ChatMessage } from '../../../types/messages';
import type { ChatStyles } from '../styles/chat.styles';
import { ChatAttachmentCard } from './ChatAttachmentCard';

type ChatBubbleProps = {
  styles: ChatStyles;
  message: ChatMessage;
};

export function ChatBubble({ styles, message }: ChatBubbleProps) {
  const mine = message.from === 'me';

  if (message.attachment) {
    return (
      <View style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowPeer]}>
        <ChatAttachmentCard styles={styles} name={message.attachment.name} />
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowPeer]}>
      <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubblePeer]}>
        <Text style={[styles.bubbleText, mine ? styles.bubbleTextMe : styles.bubbleTextPeer]}>
          {message.text}
        </Text>
        <Text style={[styles.bubbleMeta, mine ? styles.bubbleMetaMe : styles.bubbleMetaPeer]}>
          {message.sentAt}
        </Text>
      </View>
    </View>
  );
}
