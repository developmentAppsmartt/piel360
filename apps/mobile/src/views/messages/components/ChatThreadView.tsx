import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { messagesService } from '../../../services/messages.service';
import type { Conversation } from '../../../types/messages';
import { ChatBubble } from './ChatBubble';
import { ChatComposer } from './ChatComposer';
import { ChatHeader } from './ChatHeader';
import { ChatQuickActions } from './ChatQuickActions';
import { createChatStyles } from '../styles/chat.styles';

type ChatThreadViewProps = {
  conversationId: string;
  onBack: () => void;
};

export function ChatThreadView({ conversationId, onBack }: ChatThreadViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createChatStyles(branding.colors),
    [branding.colors],
  );
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    void messagesService.getConversation(conversationId).then(setConversation);
  }, [conversationId]);

  if (!conversation) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ChatHeader
        styles={styles}
        name={conversation.peerName}
        initials={conversation.peerInitials}
        onBack={onBack}
        onMore={() =>
          Alert.alert('Opciones', 'Archivar, silenciar y reportar llegarán con el API de chat.')
        }
      />
      <FlatList
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        data={conversation.messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble styles={styles} message={item} />}
      />
      <ChatQuickActions styles={styles} />
      <ChatComposer
        styles={styles}
        onSend={(text) => {
          void messagesService.sendText(conversation.id, text).then((next) => {
            if (next) setConversation(next);
          });
        }}
      />
    </View>
  );
}
