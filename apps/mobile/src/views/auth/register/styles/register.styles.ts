import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

export function createRegisterStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingBottom: 28,
      paddingTop: 16,
    },
    brand: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.textOnDark,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    welcomeBanner: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 18,
    },
    welcomeTitle: {
      color: colors.textOnDark,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    welcomeSubtitle: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 14,
      lineHeight: 20,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 21,
      color: 'rgba(255,255,255,0.82)',
      marginBottom: 22,
      maxWidth: 320,
    },
    stepHint: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 12,
      letterSpacing: 0.4,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    half: {
      flex: 1,
    },
    areaCode: {
      width: 96,
    },
    phoneFlex: {
      flex: 1,
    },
    field: {
      marginBottom: 12,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 13,
      marginBottom: 6,
      fontWeight: '500',
    },
    labelInline: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 13,
      fontWeight: '500',
    },
    allowLink: {
      color: colors.textOnDark,
      fontSize: 13,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    whyLink: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 13,
      fontWeight: '600',
      textDecorationLine: 'underline',
      marginTop: 4,
      marginBottom: 8,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 4,
    },
    chip: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      fontWeight: '600',
    },
    chipTextActive: {
      color: colors.textOnDark,
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
      flex: 1,
    },
    buttonSecondary: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      flex: 1,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    buttonText: {
      color: colors.textOnDark,
      fontSize: 16,
      fontWeight: '700',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    footer: {
      marginTop: 18,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.75)',
      fontSize: 14,
    },
    footerRow: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    link: {
      color: colors.textOnDark,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    footerLink: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 14,
      fontWeight: '600',
      textDecorationLine: 'underline',
      flexShrink: 1,
    },
  });
}

export type RegisterStyles = ReturnType<typeof createRegisterStyles>;
