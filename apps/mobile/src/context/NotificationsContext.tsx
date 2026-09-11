import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { notificationsService } from '../services/notifications.service';

type NotificationsContextValue = {
  unreadCount: number;
  inboxOpen: boolean;
  openInbox: () => void;
  closeInbox: () => void;
  refreshUnread: () => Promise<void>;
  /** Tras abrir un aviso: baja el contador local y marca leído en API. */
  consumeNotification: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

const POLL_MS = 30_000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const { count } = await notificationsService.unreadCount();
      setUnreadCount(count);
    } catch {
      /* silencioso: badge no crítico */
    }
  }, [user]);

  useEffect(() => {
    void refreshUnread();
    if (!user) return;

    const interval = setInterval(() => {
      void refreshUnread();
    }, POLL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshUnread();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [user, refreshUnread]);

  const consumeNotification = useCallback(async (id: string) => {
    setUnreadCount((n) => Math.max(0, n - 1));
    try {
      await notificationsService.markRead(id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadCount,
      inboxOpen,
      openInbox: () => setInboxOpen(true),
      closeInbox: () => {
        setInboxOpen(false);
        void refreshUnread();
      },
      refreshUnread,
      consumeNotification,
    }),
    [unreadCount, inboxOpen, refreshUnread, consumeNotification],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications debe usarse dentro de NotificationsProvider');
  }
  return ctx;
}

/** Badge opcional cuando el provider aún no envuelve (p. ej. auth). */
export function useNotificationsOptional(): NotificationsContextValue | null {
  return useContext(NotificationsContext);
}
