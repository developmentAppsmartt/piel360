import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createYoucamFlowStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: soft(colors.primary, '18'),
    },
    card: {
      flex: 1,
      marginTop: 8,
      marginHorizontal: 12,
      marginBottom: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: soft(colors.primary, '55'),
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 18,
      ...appShadow({ opacity: 0.06, radius: 10, offsetY: 3, elevation: 2 }),
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 6,
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 16,
    },
    body: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
      marginBottom: 12,
    },
    bullet: {
      fontSize: 13,
      lineHeight: 20,
      color: colors.muted,
      marginBottom: 14,
    },
    link: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.muted,
      textAlign: 'center',
      textDecorationLine: 'underline',
      marginBottom: 18,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 20,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#C4C9D4',
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxOn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkLabel: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
      fontWeight: '600',
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryBtnDisabled: {
      opacity: 0.45,
    },
    primaryBtnText: {
      color: colors.textOnDark,
      fontSize: 16,
      fontWeight: '800',
    },
    tipList: {
      gap: 12,
      marginBottom: 24,
      flex: 1,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: '#FAFAFA',
    },
    tipIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: soft(colors.primary, '18'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: colors.text,
    },
    footerLogo: {
      marginTop: 'auto',
      alignItems: 'center',
      paddingTop: 16,
    },
    footerLogoText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 1,
    },
    cancel: {
      alignItems: 'center',
      marginTop: 12,
    },
    cancelText: {
      color: colors.muted,
      fontWeight: '600',
      fontSize: 14,
    },
  });
}
