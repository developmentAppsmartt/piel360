import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { Icons, type AppIconName } from '../icons';
import { useBranding } from '../../context/BrandingContext';
import type { AppNotification } from '../../types/notifications';
import {
  appointmentDataField,
  isAppointmentNotification,
} from '../../types/notifications';

export type HomeReminderRole = 'doctor' | 'patient';

type HomeReminderCardProps = {
  item: AppNotification;
  role: HomeReminderRole;
  onDismiss: () => void;
  onPress: () => void;
  embedded?: boolean;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iconFor(type: string): AppIconName {
  if (isAppointmentNotification(type)) return Icons.calendarCheck;
  if (type === 'analysis_request') return Icons.dermAnalysis;
  if (type === 'analysis_shared') return Icons.aesthetic;
  if (type === 'message') return Icons.chat;
  return Icons.bell;
}

function ctaLabel(item: AppNotification, role: HomeReminderRole): string {
  if (item.type === 'message') return 'Ver chat';
  if (isAppointmentNotification(item.type)) {
    return role === 'patient' ? 'Ver cita' : 'Ver detalles';
  }
  if (item.type === 'analysis_request') return 'Ver detalle';
  if (item.type === 'analysis_shared') return 'Ver resultado';
  return 'Ver';
}

/** Tarjeta de recordatorio en el panel de inicio (última(s) notificación(es)). */
export function HomeReminderCard({
  item,
  role,
  onDismiss,
  onPress,
  embedded = false,
}: HomeReminderCardProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createStyles(branding.colors.primary, branding.colors.primaryDark),
    [branding.colors.primary, branding.colors.primaryDark],
  );

  const dateLabel = appointmentDataField(item.data, 'dateLabel');
  const timeLabel = appointmentDataField(item.data, 'timeLabel');
  const isAppointment = isAppointmentNotification(item.type);
  const isMessage = item.type === 'message';
  const showMeta = isAppointment && (!!dateLabel || !!timeLabel);
  const showAgendaLink = role === 'patient' && isAppointment;
  const showChatLink = isMessage;

  return (
    <View
      style={[styles.wrap, embedded && styles.wrapEmbedded]}
      accessibilityRole="alert"
    >
      <View style={styles.iconWrap}>
        <AppIcon
          icon={iconFor(item.type)}
          size={20}
          color={branding.colors.primaryDark}
        />
        {!item.readAt ? <View style={styles.badge} /> : null}
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={3}>
          {item.body}
        </Text>

        {showMeta ? (
          <View style={styles.metaBlock}>
            {dateLabel ? (
              <View style={styles.metaRow}>
                <AppIcon
                  icon={Icons.calendarDay}
                  size={14}
                  color={branding.colors.primaryDark}
                />
                <Text style={styles.metaText}>
                  Fecha: <Text style={styles.metaStrong}>{dateLabel}</Text>
                </Text>
              </View>
            ) : null}
            {timeLabel ? (
              <View style={styles.metaRow}>
                <AppIcon
                  icon={Icons.calendarClock}
                  size={14}
                  color={branding.colors.primaryDark}
                />
                <Text style={styles.metaText}>
                  Hora: <Text style={styles.metaStrong}>{timeLabel}</Text>
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {showAgendaLink ? (
          <Pressable
            onPress={onPress}
            hitSlop={6}
            style={styles.agendaLink}
            accessibilityRole="link"
          >
            <AppIcon
              icon={Icons.calendarDay}
              size={14}
              color={branding.colors.primary}
            />
            <Text style={styles.agendaLinkText}>
              Consulta tu cita en Agenda ›
            </Text>
          </Pressable>
        ) : showChatLink ? (
          <Pressable
            onPress={onPress}
            hitSlop={6}
            style={styles.agendaLink}
            accessibilityRole="link"
          >
            <AppIcon
              icon={Icons.chat}
              size={14}
              color={branding.colors.primary}
            />
            <Text style={styles.agendaLinkText}>Abrir conversación ›</Text>
          </Pressable>
        ) : (
          <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
        )}
      </View>

      <Pressable
        onPress={onPress}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel(item, role)}
      >
        <Text style={styles.ctaText}>{ctaLabel(item, role)}</Text>
        <AppIcon icon={Icons.chevronRight} size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="Cerrar notificación"
      >
        <AppIcon
          icon={Icons.close}
          size={16}
          color={branding.colors.muted}
        />
      </Pressable>
    </View>
  );
}

type HomeRemindersStackProps = {
  items: AppNotification[];
  role: HomeReminderRole;
  onDismiss: (item: AppNotification) => void;
  onPress: (item: AppNotification) => void;
  embedded?: boolean;
};

export function HomeRemindersStack({
  items,
  role,
  onDismiss,
  onPress,
  embedded = false,
}: HomeRemindersStackProps) {
  if (items.length === 0) return null;
  return (
    <View style={[stylesStack.stack, embedded && stylesStack.stackEmbedded]}>
      {items.map((item) => (
        <HomeReminderCard
          key={item.id}
          item={item}
          role={role}
          embedded={embedded}
          onDismiss={() => onDismiss(item)}
          onPress={() => onPress(item)}
        />
      ))}
    </View>
  );
}

const stylesStack = StyleSheet.create({
  stack: {
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  stackEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
});

function createStyles(primary: string, primaryDark: string) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#D7E4F2',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 12,
      paddingRight: 36,
      shadowColor: '#0f172a',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    wrapEmbedded: {},
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: '#E8F1FA',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    copy: {
      flex: 1,
      gap: 4,
      minWidth: 0,
      paddingRight: 4,
    },
    title: {
      fontSize: 14,
      fontWeight: '800',
      color: primaryDark,
    },
    body: {
      fontSize: 12,
      lineHeight: 17,
      color: '#4B5C6E',
    },
    when: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 2,
    },
    metaBlock: {
      gap: 3,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: '#3A5570',
    },
    metaStrong: {
      fontWeight: '700',
      color: primaryDark,
    },
    agendaLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      alignSelf: 'flex-start',
    },
    agendaLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: primary,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'center',
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    close: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 2,
    },
  });
}
