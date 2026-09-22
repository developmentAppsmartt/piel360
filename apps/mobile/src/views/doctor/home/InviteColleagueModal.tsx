import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { Icons, type AppIconName } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import { useDeviceLayout } from '../../../styles/deviceLayout';

export const COLLEAGUE_INVITE_URL = 'https://piel360.com';
export const COLLEAGUE_INVITE_DISPLAY = 'piel360.com';
export const COLLEAGUE_INVITE_PHRASE =
  'Invita a un colega a conocer PIEL360 y potenciar su análisis de piel con IA';

const INVITE_HERO = require('../../../../assets/Invitarcolegas.png');

const SHARE_MESSAGE = `${COLLEAGUE_INVITE_PHRASE}\n\n${COLLEAGUE_INVITE_URL}`;

type InviteColleagueModalProps = {
  visible: boolean;
  onClose: () => void;
};

type ShareChannel = {
  id: string;
  label: string;
  icon: AppIconName;
  color: string;
  onPress: () => void;
};

async function copyInviteLink(): Promise<void> {
  try {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.writeText
    ) {
      await navigator.clipboard.writeText(COLLEAGUE_INVITE_URL);
      Alert.alert('Copiado', 'Enlace copiado al portapapeles.');
      return;
    }
  } catch {
    // fallback abajo
  }
  await Share.share({
    message: SHARE_MESSAGE,
    url: COLLEAGUE_INVITE_URL,
    title: 'Invitar a un colega — PIEL360',
  });
}

async function openExternal(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir', 'Inténtalo de nuevo en unos segundos.');
  }
}

export function InviteColleagueModal({
  visible,
  onClose,
}: InviteColleagueModalProps) {
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const { width, isTablet } = useDeviceLayout();
  const primary = branding.colors.primary;
  const styles = useMemo(() => createStyles(primary), [primary]);
  const [copying, setCopying] = useState(false);

  // Ancho del contenido del sheet (= ancho del modal menos paddings).
  const sheetHorizontalPad = 16 * 2;
  const contentPad = 16 * 2;
  const heroWidth = Math.max(
    200,
    Math.min(width - sheetHorizontalPad - contentPad, isTablet ? 480 : width),
  );
  // Altura exacta de la pieza (916×1717) para llenar el ancho del modal sin bandas.
  const heroDisplayHeight = Math.round(heroWidth * (1717 / 916));

  const channels: ShareChannel[] = useMemo(
    () => [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: Icons.chat,
        color: '#25D366',
        onPress: () =>
          void openExternal(
            `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`,
          ),
      },
      {
        id: 'email',
        label: 'Correo electrónico',
        icon: Icons.mail,
        color: primary,
        onPress: () =>
          void openExternal(
            `mailto:?subject=${encodeURIComponent('Te invito a conocer PIEL360')}&body=${encodeURIComponent(SHARE_MESSAGE)}`,
          ),
      },
      {
        id: 'linkedin',
        label: 'LinkedIn',
        icon: Icons.account,
        color: '#0A66C2',
        onPress: () =>
          void openExternal(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(COLLEAGUE_INVITE_URL)}`,
          ),
      },
      {
        id: 'sms',
        label: 'SMS',
        icon: Icons.phone,
        color: '#7C3AED',
        onPress: () =>
          void openExternal(
            `sms:?body=${encodeURIComponent(SHARE_MESSAGE)}`,
          ),
      },
      {
        id: 'more',
        label: 'Más opciones',
        icon: Icons.moreVertical,
        color: '#64748B',
        onPress: () =>
          void Share.share({
            message: SHARE_MESSAGE,
            url: COLLEAGUE_INVITE_URL,
            title: 'Invitar a un colega — PIEL360',
          }),
      },
    ],
    [primary],
  );

  async function handleCopy() {
    if (copying) return;
    setCopying(true);
    try {
      await copyInviteLink();
    } finally {
      setCopying(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <AppIcon icon={Icons.accountGroup} size={22} color={primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Invitar a un colega</Text>
              <Text style={styles.subtitle}>
                Comparte PIEL360 con otros profesionales de la salud
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Cerrar"
              style={styles.closeBtn}
            >
              <AppIcon icon={Icons.close} size={18} color={primary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={INVITE_HERO}
              style={[
                styles.heroImage,
                { width: heroWidth, height: heroDisplayHeight },
              ]}
              resizeMode="contain"
              accessibilityLabel={COLLEAGUE_INVITE_PHRASE}
              accessibilityIgnoresInvertColors
            />

            <View style={styles.linkRow}>
              <AppIcon icon={Icons.paperclip} size={20} color={primary} />
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkLabel}>Comparte este enlace:</Text>
                <Text style={styles.linkUrl}>{COLLEAGUE_INVITE_DISPLAY}</Text>
              </View>
              <Pressable
                style={styles.copyBtn}
                onPress={() => void handleCopy()}
                disabled={copying}
                accessibilityLabel="Copiar enlace"
              >
                <AppIcon
                  icon={Icons.clipboard}
                  size={16}
                  color={branding.colors.textOnDark}
                />
                <Text style={styles.copyBtnText}>Copiar enlace</Text>
              </Pressable>
            </View>

            <Text style={styles.shareTitle}>O comparte por:</Text>
            <View style={styles.channelsRow}>
              {channels.map((channel) => (
                <Pressable
                  key={channel.id}
                  style={styles.channel}
                  onPress={channel.onPress}
                  accessibilityLabel={channel.label}
                >
                  <View
                    style={[
                      styles.channelIcon,
                      { backgroundColor: `${channel.color}22` },
                    ]}
                  >
                    <AppIcon
                      icon={channel.icon}
                      size={22}
                      color={channel.color}
                    />
                  </View>
                  <Text style={styles.channelLabel} numberOfLines={2}>
                    {channel.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.infoBox}>
              <AppIcon icon={Icons.information} size={20} color={primary} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoTitle}>¿Por qué invitar a un colega?</Text>
                <Text style={styles.infoBody}>
                  PIEL360 es una plataforma de IA para análisis estético y
                  dermatológico de la piel. Amplía tu red profesional y mejora el
                  seguimiento de tus pacientes.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(primary: string) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    sheet: {
      maxHeight: '92%',
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        },
        android: { elevation: 10 },
        default: {},
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: '#64748B',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${primary}12`,
    },
    scroll: { flexGrow: 0 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    heroImage: {
      width: '100%',
      borderRadius: 14,
      backgroundColor: '#EEF6FB',
      overflow: 'hidden',
      alignSelf: 'stretch',
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: `${primary}12`,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    linkTextWrap: { flex: 1, minWidth: 0, gap: 2 },
    linkLabel: {
      fontSize: 11,
      color: '#64748B',
      fontWeight: '600',
    },
    linkUrl: {
      fontSize: 14,
      fontWeight: '800',
      color: primary,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    copyBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    shareTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#0F172A',
    },
    channelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
    },
    channel: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      maxWidth: 68,
    },
    channelIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    channelLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: '#475569',
      textAlign: 'center',
      lineHeight: 12,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: `${primary}10`,
      borderRadius: 14,
      padding: 12,
    },
    infoTextWrap: { flex: 1, minWidth: 0, gap: 3 },
    infoTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#0F172A',
    },
    infoBody: {
      fontSize: 11,
      lineHeight: 15,
      color: '#475569',
    },
  });
}
