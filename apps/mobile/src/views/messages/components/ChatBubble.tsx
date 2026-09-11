import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import type { ChatMessage } from '../../../types/messages';
import type { ChatStyles } from '../styles/chat.styles';
import { downloadChatImage } from '../utils/downloadChatImage';
import { ChatAttachmentCard } from './ChatAttachmentCard';

type ChatBubbleProps = {
  styles: ChatStyles;
  message: ChatMessage;
  /** Profesional: puede descargar imágenes del paciente para análisis. */
  canDownloadImages?: boolean;
  accentColor?: string;
};

export function ChatBubble({
  styles,
  message,
  canDownloadImages = false,
  accentColor = '#1E5A9E',
}: ChatBubbleProps) {
  const mine = message.from === 'me';
  const attachment = message.attachment;
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadImage() {
    if (!attachment?.url || downloading) return;
    setDownloading(true);
    try {
      await downloadChatImage({
        url: attachment.url,
        name: attachment.name,
        mimeType: attachment.mimeType,
      });
    } catch (err) {
      Alert.alert(
        'Descarga',
        err instanceof Error
          ? err.message
          : 'No se pudo descargar la imagen.',
      );
    } finally {
      setDownloading(false);
    }
  }

  if (attachment?.kind === 'image' && attachment.url) {
    return (
      <View
        style={[styles.bubbleRow, mine ? styles.bubbleRowMe : styles.bubbleRowPeer]}
      >
        <View style={{ maxWidth: '78%', gap: 4 }}>
          <View style={styles.chatImageWrap}>
            <Image
              source={{ uri: attachment.url }}
              style={styles.chatImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            {canDownloadImages ? (
              <Pressable
                style={[styles.chatImageDownload, { backgroundColor: accentColor }]}
                onPress={() => void handleDownloadImage()}
                accessibilityRole="button"
                accessibilityLabel="Descargar imagen para análisis"
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <AppIcon icon={Icons.download} size={16} color="#FFF" />
                )}
              </Pressable>
            ) : null}
          </View>
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
