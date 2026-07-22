import type {
  ChatMessage,
  Conversation,
  MessageContact,
  MessageTab,
} from '../types/messages';
import { apiRequest } from './api.client';

export const messagesService = {
  async listContacts(): Promise<MessageContact[]> {
    return apiRequest<MessageContact[]>('/messages/contacts', { auth: true });
  },

  async listConversations(tab: MessageTab = 'recientes'): Promise<Conversation[]> {
    const list = await apiRequest<Omit<Conversation, 'messages'>[]>(
      `/messages/conversations?tab=${encodeURIComponent(tab)}`,
      { auth: true },
    );
    return list.map((c) => ({ ...c, messages: [] }));
  },

  async getOrCreate(peer: {
    patientId?: string;
    doctorId?: string;
  }): Promise<Conversation> {
    return apiRequest<Conversation>('/messages/conversations', {
      method: 'POST',
      auth: true,
      body: peer,
    });
  },

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      return await apiRequest<Conversation>(`/messages/conversations/${id}`, {
        auth: true,
      });
    } catch {
      return null;
    }
  },

  async sendText(conversationId: string, text: string): Promise<ChatMessage> {
    return apiRequest<ChatMessage>(
      `/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        auth: true,
        body: { type: 'text', body: text },
      },
    );
  },

  async sendAttachment(
    conversationId: string,
    file: {
      uri: string;
      name: string;
      mimeType: string;
    },
  ): Promise<ChatMessage> {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    return apiRequest<ChatMessage>(
      `/messages/conversations/${conversationId}/attachments`,
      {
        method: 'POST',
        auth: true,
        body: form,
        formData: true,
      },
    );
  },

  async markRead(conversationId: string): Promise<void> {
    await apiRequest(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
      auth: true,
    });
  },

  async setArchived(conversationId: string, archived: boolean): Promise<void> {
    await apiRequest(`/messages/conversations/${conversationId}`, {
      method: 'PATCH',
      auth: true,
      body: { archived },
    });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiRequest(`/messages/conversations/${conversationId}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  /** Solo doctor: elimina el hilo para ambas partes. */
  async deleteConversationPermanent(conversationId: string): Promise<void> {
    await apiRequest(`/messages/conversations/${conversationId}/permanent`, {
      method: 'DELETE',
      auth: true,
    });
  },
};
