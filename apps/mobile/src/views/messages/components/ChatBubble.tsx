import { Image, Linking, Text, View } from 'react-native';
import type { ChatMessage } from '../../../types/messages';
import type { ChatStyles } from '../styles/chat.styles';
import { ChatAttachmentCard } from './ChatAttachmentCard';

type ChatBubbleProps = {
  styles: ChatStyles;
  message: ChatMessage;
};

export function ChatBubble({ styles, message }: ChatBubbleProps) {
  const mine = message.from === 'me';
  const attachment = message.attachment;

  if (attachment?.kind === 'image' && attachment.url) {
    return (
      <View
        style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowPeer]}
      >
        <View style={{ maxWidth: '78%', gap: 4 }}>
          <Image
            source={{ uri: attachment.url }}
            style={{
              width: 220,
              height: 220,
              borderRadius: 14,
              backgroundColor: '#E5E7EB',
            }}
            resizeMode="cover"
          />
          <Text
            style={[
              styles.bubbleMeta,
              mine ? styles.bubbleMetaMe : styles.bubbleMetaPeer,
            ]}
          >
            {message.sentAt}
          </Text>
        </View>
      </View>
    );
  }

  if (attachment) {
    return (
      <View
        style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowPeer]}
      >
        <View style={{ maxWidth: '78%', gap: 4 }}>
          <ChatAttachmentCard
            styles={styles}
            name={attachment.name}
            onDownload={() => {
              if (attachment.url) void Linking.openURL(attachment.url);
            }}
          />
          <Text
            style={[
              styles.bubbleMeta,
              mine ? styles.bubbleMetaMe : styles.bubbleMetaPeer,
            ]}
          >
            {message.sentAt}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowPeer]}
    >
      <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubblePeer]}>
        <Text
          style={[
            styles.bubbleText,
            mine ? styles.bubbleTextMe : styles.bubbleTextPeer,
          ]}
        >
          {message.text}
        </Text>
        <Text
          style={[
            styles.bubbleMeta,
            mine ? styles.bubbleMetaMe : styles.bubbleMetaPeer,
          ]}
        >
          {message.sentAt}
        </Text>
      </View>
    </View>
  );
}
