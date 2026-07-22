import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

export function createHomeStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F7F5FF',
      padding: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.muted,
      marginBottom: 28,
      lineHeight: 22,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.textOnDark,
      fontWeight: '700',
      fontSize: 16,
    },
  });
}
