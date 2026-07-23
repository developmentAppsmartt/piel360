import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import { messagesService } from '../../services/messages.service';
import type { Conversation, MessageTab } from '../../types/messages';
import { ConversationCard } from './components/ConversationCard';
import { MessagesHeader } from './components/MessagesHeader';
import { MessagesTabs } from './components/MessagesTabs';
import { NewMessageContactsView } from './components/NewMessageContactsView';
import { NewMessageFab } from './components/NewMessageFab';
import { ChatThreadView } from './components/ChatThreadView';
import { createMessagesStyles } from './styles/messages.styles';

type MessagesViewProps = {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickingContact, setPickingContact] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const list = await messagesService.listConversations(tab);
      setItems(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las conversaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  useEffect(() => {
    const open = Boolean(activeId) || pickingContact;
    onThreadOpenChange?.(open);
    return () => onThreadOpenChange?.(false);
  }, [activeId, pickingContact, onThreadOpenChange]);

  if (pickingContact) {
    return (
      <NewMessageContactsView
        onBack={() => setPickingContact(false)}
        onStarted={(id) => {
          setPickingContact(false);
          setActiveId(id);
        }}
      />
    );
  }

  if (activeId) {
    return (
      <ChatThreadView
        conversationId={activeId}
        onBack={() => {
          setActiveId(null);
          void reload();
        }}
        onDeleted={() => {
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
          Alert.alert('Buscar', 'La búsqueda de conversaciones llegará pronto.')
        }
      />
      <MessagesTabs styles={styles} active={tab} onChange={setTab} />
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={branding.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            error ? (
              <Text style={{ color: branding.colors.error, marginBottom: 8 }}>
                {error}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ConversationCard
              styles={styles}
              conversation={item}
              onPress={() => setActiveId(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No hay conversaciones en esta carpeta. Pulsa + para iniciar un
                chat.
              </Text>
            </View>
          }
        />
      )}
      <NewMessageFab styles={styles} onPress={() => setPickingContact(true)} />
    </View>
  );
}
