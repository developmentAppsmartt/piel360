import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

export function createAccountInfoStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
      gap: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    headerSide: {
      width: 28,
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.muted,
    },
  });
}
