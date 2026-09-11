import { StyleSheet } from 'react-native';
import type { AppBranding } from '../../../config/branding.defaults';

export function createNotificationsStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    markAll: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
      flexGrow: 1,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E5E7EB',
    },
    cardUnread: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}0F`,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.primary}18`,
    },
    cardBody: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    cardBodyText: {
      fontSize: 13,
      color: '#6B7280',
      lineHeight: 18,
    },
    cardWhen: {
      marginTop: 4,
      fontSize: 11,
      color: '#9CA3AF',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 6,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      minHeight: 200,
    },
    emptyText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
    },
    error: {
      color: colors.error,
      marginBottom: 8,
      fontSize: 13,
    },
  });
}
