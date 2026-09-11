import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../components/AppIcon';
import { Icons } from '../../components/icons';
import { useBranding } from '../../context/BrandingContext';
import { useNotifications } from '../../context/NotificationsContext';
import { ApiError } from '../../services/api.client';
import { notificationsService } from '../../services/notifications.service';
import type { AppNotification } from '../../types/notifications';
import { DoctorHeader } from '../doctor/patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../doctor/patients/styles/patients.styles';
import { createNotificationsStyles } from './styles/notifications.styles';

export type NotificationAction =
  | { kind: 'message'; conversationId: string }
  | { kind: 'analysis_request' };

type NotificationsViewProps = {
  onBack: () => void;
  onOpenMenu?: () => void;
  onSelect: (action: NotificationAction) => void;
};

function conversationIdFrom(data: AppNotification['data']): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = data.conversationId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsView({
  onBack,
  onOpenMenu,
  onSelect,
}: NotificationsViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createNotificationsStyles(branding.colors),
    [branding.colors],
  );
  const { consumeNotification, refreshUnread } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const list = await notificationsService.list(50);
      setItems(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar las notificaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function markAll() {
    try {
      await notificationsService.markAllRead();
      setItems((prev) =>
        prev.map((n) =>
          n.readAt ? n : { ...n, readAt: new Date().toISOString() },
        ),
      );
      await refreshUnread();
    } catch {
      /* ignore */
    }
  }

  async function onPressItem(item: AppNotification) {
    if (!item.readAt) {
      await consumeNotification(item.id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        ),
      );
    }

    if (item.type === 'message') {
      const conversationId = conversationIdFrom(item.data);
      if (conversationId) {
        onSelect({ kind: 'message', conversationId });
        return;
      }
    }
    if (item.type === 'analysis_request') {
      onSelect({ kind: 'analysis_request' });
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        showBack
        onBack={onBack}
        onOpenMenu={onOpenMenu ?? onBack}
        suppressNotifications
      />
      <View style={styles.toolbar}>
        <Text style={styles.title}>Notificaciones</Text>
        <Pressable onPress={() => void markAll()} hitSlop={8}>
          <Text style={styles.markAll}>Marcar todas leídas</Text>
        </Pressable>
      </View>
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
            error ? <Text style={styles.error}>{error}</Text> : null
          }
          renderItem={({ item }) => {
            const unread = !item.readAt;
                  const icon =
              item.type === 'analysis_request'
                ? Icons.dermAnalysis
                : Icons.chat;
            return (
              <Pressable
                style={[styles.card, unread && styles.cardUnread]}
                onPress={() => void onPressItem(item)}
              >
                <View style={styles.iconWrap}>
                  <AppIcon
                    icon={icon}
                    size={22}
                    color={branding.colors.primary}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardBodyText} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.cardWhen}>
                    {formatWhen(item.createdAt)}
                  </Text>
                </View>
                {unread ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No tienes notificaciones por ahora.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
