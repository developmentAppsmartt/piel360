import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../styles/shadow';

function softPrimary(hex: string, alphaHex = '22'): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return `${hex}${alphaHex}`;
  return hex;
}

export function createMessagesStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      color: colors.textOnDark,
      fontSize: 22,
      fontWeight: '700',
    },
    headerIcon: {
      color: colors.textOnDark,
      fontSize: 20,
      fontWeight: '600',
      padding: 8,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#9CA3AF',
    },
    tabLabelActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    listContent: {
      padding: 16,
      paddingBottom: 96,
      gap: 12,
    },
    empty: {
      paddingTop: 48,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 15,
      textAlign: 'center',
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...appShadow({ opacity: 0.06, radius: 8, offsetY: 2, elevation: 2 }),
      overflow: 'hidden',
    },
    cardUnreadBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.error,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: softPrimary(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    cardBody: {
      flex: 1,
      minWidth: 0,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 4,
    },
    cardName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    cardTime: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '500',
    },
    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardPreview: {
      flex: 1,
      fontSize: 13,
      color: colors.muted,
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      color: colors.textOnDark,
      fontSize: 11,
      fontWeight: '700',
    },
    readMark: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '700',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...appShadow({ opacity: 0.18, radius: 10, offsetY: 4, elevation: 5 }),
    },
    fabIcon: {
      color: colors.textOnDark,
      fontSize: 28,
      fontWeight: '400',
      marginTop: -2,
    },
  });
}

export type MessagesStyles = ReturnType<typeof createMessagesStyles>;
