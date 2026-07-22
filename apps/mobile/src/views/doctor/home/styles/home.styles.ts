import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

function soft(hex: string, a = '18'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createDoctorHomeStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F5F6FA',
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 28,
      gap: 18,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: soft(colors.primary, '33'),
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primary,
    },
    bellBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: soft(colors.primary, '22'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeLabel: {
      fontSize: 15,
      color: colors.muted,
      marginTop: 4,
    },
    welcomeName: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 6,
      ...appShadow({ opacity: 0.08, radius: 10, offsetY: 3, elevation: 2 }),
    },
    statIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: soft(colors.primary, '22'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 14,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
      minHeight: 48,
    },
    actionBtnInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 6,
    },
    actionBtnText: {
      color: colors.textOnDark,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    activityCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 4,
      ...appShadow({ opacity: 0.06, radius: 8, offsetY: 2, elevation: 1 }),
    },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#F3F4F6',
    },
    activityAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: soft(colors.secondary, '28'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityAvatarText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.secondary,
    },
    activityBody: {
      flex: 1,
      gap: 2,
    },
    activityName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    activityMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgePending: {
      backgroundColor: '#FEF3C7',
    },
    badgeDone: {
      backgroundColor: '#DCFCE7',
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    badgeTextPending: {
      color: '#B45309',
    },
    badgeTextDone: {
      color: '#15803D',
    },
    empty: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
    loading: {
      paddingVertical: 40,
      alignItems: 'center',
    },
  });
}

export type DoctorHomeStyles = ReturnType<typeof createDoctorHomeStyles>;
