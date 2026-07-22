import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { useAuth } from '../../../context/AuthContext';
import { ApiError } from '../../../services/api.client';
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
  onDeleted?: () => void;
};

export function ChatThreadView({
  conversationId,
  onBack,
  onDeleted,
}: ChatThreadViewProps) {
  const branding = useBranding();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  const styles = useMemo(
    () => createChatStyles(branding.colors),
    [branding.colors],
  );
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const next = await messagesService.getConversation(conversationId);
    setConversation(next);
    if (next) {
      void messagesService.markRead(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Polling liviano mientras el hilo está abierto.
  useEffect(() => {
    const id = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(id);
  }, [load]);

  function openOptions() {
    if (!conversation) return;

    const deleteForMe = {
      text: 'Ocultar de mi lista',
      style: 'destructive' as const,
      onPress: () => {
        Alert.alert(
          'Ocultar chat',
          'El chat desaparecerá de tu lista. La otra persona lo conservará.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ocultar',
              style: 'destructive',
              onPress: () => {
                void messagesService
                  .deleteConversation(conversation.id)
                  .then(() => onDeleted?.() ?? onBack())
                  .catch((err) =>
                    Alert.alert(
                      'Error',
                      err instanceof ApiError
                        ? err.message
                        : 'No se pudo ocultar el chat.',
                    ),
                  );
              },
            },
          ],
        );
      },
    };

    const deletePermanent = {
      text: 'Eliminar chat completamente',
      style: 'destructive' as const,
      onPress: () => {
        Alert.alert(
          'Eliminar chat completamente',
          'Se borrará el chat y todos los mensajes para ti y para el paciente. Esta acción no se puede deshacer.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar definitivamente',
              style: 'destructive',
              onPress: () => {
                void messagesService
                  .deleteConversationPermanent(conversation.id)
                  .then(() => onDeleted?.() ?? onBack())
                  .catch((err) =>
                    Alert.alert(
                      'Error',
                      err instanceof ApiError
                        ? err.message
                        : 'No se pudo eliminar el chat.',
                    ),
                  );
              },
            },
          ],
        );
      },
    };

    Alert.alert(conversation.peerName, undefined, [
      ...(isDoctor ? [deletePermanent] : [deleteForMe]),
      {
        text: conversation.archived ? 'Desarchivar' : 'Archivar',
        onPress: () => {
          void messagesService
            .setArchived(conversation.id, !conversation.archived)
            .then(() => onBack())
            .catch((err) =>
              Alert.alert(
                'Error',
                err instanceof ApiError ? err.message : 'No se pudo archivar.',
              ),
            );
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

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
        onMore={openOptions}
      />
      <FlatList
        ref={listRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        data={conversation.messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <ChatBubble styles={styles} message={item} />
        )}
      />
      <ChatQuickActions styles={styles} />
      <ChatComposer
        styles={styles}
        sending={sending}
        onSend={(text) => {
          setSending(true);
          void messagesService
            .sendText(conversation.id, text)
            .then((msg) => {
              setConversation((prev) =>
                prev
                  ? {
                      ...prev,
                      messages: [...prev.messages, msg],
                      preview: msg.text ?? prev.preview,
                      timeLabel: msg.sentAt,
                    }
                  : prev,
              );
            })
            .catch((err) =>
              Alert.alert(
                'Mensaje',
                err instanceof ApiError
                  ? err.message
                  : 'No se pudo enviar el mensaje.',
              ),
            )
            .finally(() => setSending(false));
        }}
        onSendAttachment={async (file) => {
          setSending(true);
          try {
            const msg = await messagesService.sendAttachment(
              conversation.id,
              file,
            );
            setConversation((prev) =>
              prev
                ? {
                    ...prev,
                    messages: [...prev.messages, msg],
                    preview: msg.attachment?.name ?? prev.preview,
                    timeLabel: msg.sentAt,
                  }
                : prev,
            );
          } catch (err) {
            Alert.alert(
              'Adjunto',
              err instanceof ApiError
                ? err.message
                : 'No se pudo enviar el archivo.',
            );
          } finally {
            setSending(false);
          }
        }}
      />
    </View>
  );
}
