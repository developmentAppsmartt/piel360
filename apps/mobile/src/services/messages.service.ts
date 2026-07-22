import type { Conversation, MessageTab } from '../types/messages';
import {
  filterConversations,
  MOCK_CONVERSATIONS,
} from '../views/messages/data/mockConversations';

/**
 * Hoy: datos mock del diseño.
 * Después: GET /messages, GET /messages/:id, POST /messages/:id, etc.
 */
export const messagesService = {
  async listConversations(tab: MessageTab = 'recientes'): Promise<Conversation[]> {
    await Promise.resolve();
    return filterConversations(MOCK_CONVERSATIONS, tab);
  },

  async getConversation(id: string): Promise<Conversation | null> {
    await Promise.resolve();
    return MOCK_CONVERSATIONS.find((c) => c.id === id) ?? null;
  },

  async sendText(conversationId: string, text: string): Promise<Conversation | null> {
    await Promise.resolve();
    const convo = MOCK_CONVERSATIONS.find((c) => c.id === conversationId);
    if (!convo || !text.trim()) return convo ?? null;

    convo.messages.push({
      id: `local-${Date.now()}`,
      text: text.trim(),
      from: 'me',
      sentAt: 'Ahora',
      status: 'sent',
    });
    convo.preview = text.trim();
    convo.timeLabel = 'Ahora';
    return { ...convo, messages: [...convo.messages] };
  },
};
