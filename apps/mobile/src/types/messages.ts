export type MessageTab = 'recientes' | 'sin_leer' | 'archivados';

export type ChatAttachmentKind = 'pdf' | 'image' | 'video';

export type ChatAttachment = {
  id: string;
  name: string;
  kind: ChatAttachmentKind;
  key?: string;
  mimeType?: string | null;
  url?: string | null;
};

export type ChatMessage = {
  id: string;
  type?: 'text' | 'image' | 'video' | 'pdf';
  text?: string;
  attachment?: ChatAttachment;
  /** `me` = usuario actual; `peer` = contraparte. */
  from: 'me' | 'peer';
  sentAt: string;
  createdAt?: string;
  status?: 'sent' | 'delivered' | 'read';
};

export type Conversation = {
  id: string;
  peerId?: string;
  peerName: string;
  peerRole: 'doctor' | 'patient';
  peerInitials: string;
  preview: string;
  timeLabel: string;
  lastMessageAt?: string;
  unreadCount: number;
  archived: boolean;
  messages: ChatMessage[];
};

export type MessageContact = {
  id: string;
  kind: 'doctor' | 'patient';
  firstName: string;
  lastName: string;
  name: string;
  email: string | null;
};
