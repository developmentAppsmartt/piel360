import type { Conversation, MessageTab } from '../../../types/messages';

/**
 * Conversaciones de demostración (UI del módulo Mensajes).
 * Cuando exista el API de chat, `messages.service` las reemplazará.
 */
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    peerName: 'Dra. María López',
    peerRole: 'doctor',
    peerInitials: 'ML',
    preview: 'Hola, ¿cuándo tienes los resultados?',
    timeLabel: '10:30 AM',
    unreadCount: 2,
    archived: false,
    messages: [
      {
        id: 'm1',
        text: 'Doctor, tengo dudas sobre el tratamiento',
        from: 'me',
        sentAt: '10:25 AM',
        status: 'read',
      },
      {
        id: 'm2',
        text: 'Hola, con gusto te ayudo. ¿Qué te preocupa del tratamiento?',
        from: 'peer',
        sentAt: '10:27 AM',
        status: 'read',
      },
      {
        id: 'm3',
        from: 'peer',
        sentAt: '10:28 AM',
        status: 'read',
        attachment: {
          id: 'a1',
          name: 'Resultado_Biopsia.pdf',
          kind: 'pdf',
        },
      },
      {
        id: 'm4',
        text: 'Gracias doctora, ¿cuándo tengo resultados finales?',
        from: 'me',
        sentAt: '10:30 AM',
        status: 'delivered',
      },
    ],
  },
  {
    id: 'c2',
    peerName: 'Dr. Carlos Ruiz',
    peerRole: 'doctor',
    peerInitials: 'CR',
    preview: '¿Puedo reprogramar mi cita del viernes?',
    timeLabel: '2 horas',
    unreadCount: 0,
    archived: false,
    messages: [
      {
        id: 'm1',
        text: '¿Puedo reprogramar mi cita del viernes?',
        from: 'me',
        sentAt: 'Hace 2 h',
        status: 'read',
      },
      {
        id: 'm2',
        text: 'Claro. ¿Te sirve el martes a las 3:00 pm?',
        from: 'peer',
        sentAt: 'Hace 1 h',
        status: 'read',
      },
    ],
  },
  {
    id: 'c3',
    peerName: 'Dra. Ana Torres',
    peerRole: 'doctor',
    peerInitials: 'AT',
    preview: 'Los síntomas han mejorado...',
    timeLabel: 'Ayer',
    unreadCount: 0,
    archived: false,
    messages: [
      {
        id: 'm1',
        text: 'Los síntomas han mejorado bastante esta semana.',
        from: 'me',
        sentAt: 'Ayer',
        status: 'read',
      },
      {
        id: 'm2',
        text: 'Excelente noticia. Seguimos con el mismo plan.',
        from: 'peer',
        sentAt: 'Ayer',
        status: 'read',
      },
    ],
  },
  {
    id: 'c4',
    peerName: 'Dr. Luis Vega',
    peerRole: 'doctor',
    peerInitials: 'LV',
    preview: 'Te envío la receta actualizada.',
    timeLabel: 'Lun',
    unreadCount: 0,
    archived: true,
    messages: [
      {
        id: 'm1',
        text: 'Te envío la receta actualizada.',
        from: 'peer',
        sentAt: 'Lun',
        status: 'read',
        attachment: {
          id: 'a2',
          name: 'Receta_Abril.pdf',
          kind: 'pdf',
        },
      },
    ],
  },
];

export function filterConversations(
  all: Conversation[],
  tab: MessageTab,
): Conversation[] {
  if (tab === 'archivados') return all.filter((c) => c.archived);
  if (tab === 'sin_leer') return all.filter((c) => !c.archived && c.unreadCount > 0);
  return all.filter((c) => !c.archived);
}
