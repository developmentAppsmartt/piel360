import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../context/BrandingContext';
import { messagesService } from '../../services/messages.service';
import type { Conversation, MessageTab } from '../../types/messages';
import { ConversationCard } from './components/ConversationCard';
import { MessagesHeader } from './components/MessagesHeader';
import { MessagesTabs } from './components/MessagesTabs';
import { NewMessageFab } from './components/NewMessageFab';
import { ChatThreadView } from './components/ChatThreadView';
import { createMessagesStyles } from './styles/messages.styles';

type MessagesViewProps = {
  /** Avisa al navigator para ocultar el tab bar en el hilo. */
  onThreadOpenChange?: (open: boolean) => void;
};

export function MessagesView({ onThreadOpenChange }: MessagesViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createMessagesStyles(branding.colors),
    [branding.colors],
  );
  const [tab, setTab] = useState<MessageTab>('recientes');
  const [items, setItems] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await messagesService.listConversations(tab);
    setItems(list);
  }, [tab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    onThreadOpenChange?.(Boolean(activeId));
    return () => onThreadOpenChange?.(false);
  }, [activeId, onThreadOpenChange]);

  if (activeId) {
    return (
      <ChatThreadView
        conversationId={activeId}
        onBack={() => {
          setActiveId(null);
          void reload();
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <MessagesHeader
        styles={styles}
        onSearch={() =>
          Alert.alert('Buscar', 'La búsqueda de conversaciones llegará con el API.')
        }
      />
      <MessagesTabs styles={styles} active={tab} onChange={setTab} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ConversationCard
            styles={styles}
            conversation={item}
            onPress={() => setActiveId(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay conversaciones en esta carpeta.</Text>
          </View>
        }
      />
      <NewMessageFab
        styles={styles}
        onPress={() =>
          Alert.alert(
            'Nuevo mensaje',
            'Podrás iniciar un chat con tu doctor cuando el módulo esté conectado al API.',
          )
        }
      />
    </View>
  );
}
