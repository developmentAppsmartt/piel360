import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import { messagesService } from '../../services/messages.service';
import type { Conversation, MessageTab } from '../../types/messages';
import { AppModuleChrome } from '../shared/AppModuleChrome';
import { ConversationCard } from './components/ConversationCard';
import { MessagesTabs } from './components/MessagesTabs';
import { NewMessageContactsView } from './components/NewMessageContactsView';
import { NewMessageFab } from './components/NewMessageFab';
import { ChatThreadView } from './components/ChatThreadView';
import { createMessagesStyles } from './styles/messages.styles';

type MessagesViewProps = {
  onThreadOpenChange?: (open: boolean) => void;
  onOpenProfile?: () => void;
};

export function MessagesView({
  onThreadOpenChange,
  onOpenProfile,
}: MessagesViewProps) {
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
        onOpenProfile={onOpenProfile}
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
        onOpenProfile={onOpenProfile}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <AppModuleChrome onOpenProfile={onOpenProfile}>
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
      </AppModuleChrome>
    </View>
  );
}
