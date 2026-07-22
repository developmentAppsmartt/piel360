import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

export function createLoginStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingBottom: 28,
    },
    brand: {
      fontSize: 40,
      fontWeight: '700',
      color: colors.textOnDark,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      color: 'rgba(255,255,255,0.82)',
      marginBottom: 28,
      maxWidth: 320,
    },
    methodStack: {
      gap: 12,
      marginBottom: 16,
    },
    methodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 14,
      paddingVertical: 15,
      paddingHorizontal: 16,
      backgroundColor: colors.inputBackground,
    },
    methodBtnPrimary: {
      backgroundColor: colors.primary,
    },
    methodBtnSelected: {
      borderWidth: 2,
      borderColor: colors.textOnDark,
    },
    methodBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    methodBtnTextOnDark: {
      color: colors.textOnDark,
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginBottom: 10,
      marginTop: -4,
    },
    consentBlock: {
      gap: 12,
      marginBottom: 8,
      marginTop: 4,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkLabel: {
      flex: 1,
      color: 'rgba(255,255,255,0.88)',
      fontSize: 14,
      lineHeight: 20,
    },
    checkLink: {
      color: colors.textOnDark,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    compliance: {
      marginTop: 16,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.55)',
      fontSize: 11,
      letterSpacing: 0.3,
    },
    field: {
      marginBottom: 12,
    },
    label: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 13,
      marginBottom: 6,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 14,
      paddingRight: 12,
    },
    inputFlex: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    error: {
      color: '#FECACA',
      fontSize: 14,
      marginBottom: 12,
      marginTop: 4,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    buttonText: {
      color: colors.textOnDark,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    footer: {
      marginTop: 18,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.75)',
      fontSize: 14,
    },
    link: {
      color: colors.textOnDark,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    backLink: {
      marginBottom: 14,
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      fontWeight: '600',
    },
  });
}

export type LoginStyles = ReturnType<typeof createLoginStyles>;
