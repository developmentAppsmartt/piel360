export type MessageTab = 'recientes' | 'sin_leer' | 'archivados';

export type ChatAttachment = {
  id: string;
  name: string;
  kind: 'pdf' | 'image';
};

export type ChatMessage = {
  id: string;
  text?: string;
  attachment?: ChatAttachment;
  /** `me` = paciente (derecha); `peer` = doctor (izquierda). */
  from: 'me' | 'peer';
  sentAt: string;
  status?: 'sent' | 'delivered' | 'read';
};

export type Conversation = {
  id: string;
  peerName: string;
  peerRole: 'doctor' | 'patient';
  /** Iniciales o emoji placeholder hasta tener avatar URL. */
  peerInitials: string;
  preview: string;
  timeLabel: string;
  unreadCount: number;
  archived: boolean;
  messages: ChatMessage[];
};
