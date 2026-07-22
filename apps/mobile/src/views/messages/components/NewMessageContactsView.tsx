import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import { messagesService } from '../../../services/messages.service';
import type { MessageContact } from '../../../types/messages';
import { createMessagesStyles } from '../styles/messages.styles';

type NewMessageContactsViewProps = {
  onBack: () => void;
  onStarted: (conversationId: string) => void;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function NewMessageContactsView({
  onBack,
  onStarted,
}: NewMessageContactsViewProps) {
  const insets = useSafeAreaInsets();
  const branding = useBranding();
  const styles = useMemo(
    () => createMessagesStyles(branding.colors),
    [branding.colors],
  );
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await messagesService.listContacts();
      setContacts(list);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudieron cargar los contactos.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startChat(contact: MessageContact) {
    setStartingId(contact.id);
    setError(null);
    try {
      const convo = await messagesService.getOrCreate(
        contact.kind === 'patient'
          ? { patientId: contact.id }
          : { doctorId: contact.id },
      );
      onStarted(convo.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo iniciar la conversación.',
      );
    } finally {
      setStartingId(null);
    }
  }

  const onDark = branding.colors.textOnDark;
  const primary = branding.colors.primary;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}
      >
        <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Volver">
          <AppIcon icon={Icons.back} size={26} color={onDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Nuevo mensaje</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            error ? (
              <Text style={{ color: branding.colors.error, marginBottom: 8 }}>
                {error}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No hay contactos disponibles. El chat solo es entre doctor y
                sus pacientes asignados.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => void startChat(item)}
              disabled={startingId != null}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardPreview}>
                  {item.kind === 'doctor' ? 'Doctor' : 'Paciente'}
                  {item.email ? ` · ${item.email}` : ''}
                </Text>
              </View>
              {startingId === item.id ? (
                <ActivityIndicator color={primary} />
              ) : (
                <AppIcon
                  icon={Icons.chevronRight}
                  size={20}
                  color={branding.colors.muted}
                />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
