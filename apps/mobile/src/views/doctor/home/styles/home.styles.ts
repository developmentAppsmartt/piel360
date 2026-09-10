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
      paddingTop: 18,
      paddingBottom: 28,
      gap: 18,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    welcomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    welcomeTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: soft(colors.primary, '33'),
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    avatarText: {
      fontSize: 18,
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
    },
    welcomeName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: -0.3,
    },
    pendingHint: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '600',
      color: '#B45309',
    },
    statsGrid: {
      gap: 10,
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
      gap: 4,
      ...appShadow({ opacity: 0.08, radius: 10, offsetY: 3, elevation: 2 }),
    },
    statIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: soft(colors.primary, '22'),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
      lineHeight: 14,
      textAlign: 'center',
    },
    statHint: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.primary,
      lineHeight: 12,
      textAlign: 'center',
      marginTop: 1,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignSelf: 'center',
      width: '100%',
      maxWidth: 420,
      gap: 12,
    },
    actionBtn: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
      minHeight: 52,
    },
    actionBtnInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    actionBtnText: {
      color: colors.textOnDark,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
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
    badgeInvalid: {
      backgroundColor: '#FEE2E2',
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
    badgeTextInvalid: {
      color: '#B91C1C',
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
    statsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 10,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    statsBackBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#111827',
    },
    statsScroll: {
      padding: 16,
      gap: 14,
      paddingBottom: 32,
    },
    statsPieCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      gap: 8,
      ...appShadow,
    },
    statsPieHeading: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
    },
    statsPieSub: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 8,
    },
    statsMetaRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statsMetaCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 4,
      ...appShadow,
    },
    statsMetaValue: {
      fontSize: 24,
      fontWeight: '800',
    },
    statsMetaLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
    },
  });
}

export type DoctorHomeStyles = ReturnType<typeof createDoctorHomeStyles>;
