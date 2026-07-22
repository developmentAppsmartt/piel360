import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createNosologiesStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    body: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: {
      color: '#FFF',
      fontSize: 9,
      fontWeight: '700',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 6,
    },
    backCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: soft(colors.primary, '28'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    hint: {
      paddingHorizontal: 16,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
      marginBottom: 12,
    },
    searchWrap: {
      marginHorizontal: 16,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
      gap: 10,
    },
    row: {
      backgroundColor: '#F3F4F6',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowAction: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: '#FFFFFF',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#E5E7EB',
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: colors.textOnDark,
      fontWeight: '800',
      fontSize: 15,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    empty: {
      paddingTop: 40,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
  });
}

export type NosologiesStyles = ReturnType<typeof createNosologiesStyles>;
