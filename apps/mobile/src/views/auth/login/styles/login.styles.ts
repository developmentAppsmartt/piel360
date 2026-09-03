import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { AUTH_THEME } from '../../authTheme';

const ACCENT = AUTH_THEME.accent;
const ACCENT_VIOLET = AUTH_THEME.accentViolet;

export function createLoginStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scroll: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: 8,
      width: '100%',
    },
    logo: {
      marginBottom: 0,
    },
    tagline: {
      marginTop: 8,
      textAlign: 'center',
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.72)',
    },
    intro: {
      marginTop: 14,
      marginBottom: 20,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 21,
      color: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 8,
    },
    introAccent: {
      fontWeight: '700',
      color: ACCENT,
    },
    introViolet: {
      fontWeight: '700',
      color: ACCENT_VIOLET,
    },
    methodStack: {
      gap: 12,
      marginBottom: 4,
    },
    methodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 16,
      paddingVertical: 15,
      paddingHorizontal: 16,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    methodBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1A2B5E',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dividerText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
    },
    iconField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      backgroundColor: 'rgba(232,237,245,0.95)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 12,
    },
    iconFieldBody: {
      flex: 1,
      minWidth: 0,
    },
    iconFieldLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: '#64748B',
      marginBottom: 2,
    },
    iconFieldInput: {
      padding: 0,
      margin: 0,
      fontSize: 14,
      fontWeight: '500',
      color: '#1E293B',
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginBottom: 12,
      marginTop: -4,
    },
    consentBlock: {
      gap: 10,
      marginBottom: 12,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkLabel: {
      flex: 1,
      color: 'rgba(255,255,255,0.82)',
      fontSize: 13,
      lineHeight: 18,
    },
    checkLink: {
      color: ACCENT,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    featureRow: {
      flexDirection: 'row',
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
      backgroundColor: 'rgba(255,255,255,0.1)',
      overflow: 'hidden',
      marginBottom: 16,
    },
    featureCard: {
      flex: 1,
      padding: 12,
    },
    featureCardBorder: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: 'rgba(255,255,255,0.15)',
    },
    featureTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 6,
      marginBottom: 4,
    },
    featureText: {
      fontSize: 10,
      lineHeight: 14,
      color: 'rgba(255,255,255,0.72)',
    },
    error: {
      color: '#FECACA',
      fontSize: 14,
      marginBottom: 12,
    },
    buttonWrap: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 10,
    },
    button: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    buttonText: {
      color: colors.textOnDark,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    footer: {
      marginTop: 16,
      textAlign: 'center',
      color: 'rgba(255,255,255,0.78)',
      fontSize: 14,
    },
    link: {
      color: ACCENT,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    complianceRow: {
      marginTop: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    compliance: {
      textAlign: 'center',
      color: 'rgba(255,255,255,0.55)',
      fontSize: 10,
      letterSpacing: 0.2,
    },
    backLink: {
      marginBottom: 14,
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      fontWeight: '600',
    },
    // Compatibilidad con RegisterForm
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
    methodBtnPrimary: {
      backgroundColor: colors.primary,
    },
    methodBtnSelected: {
      borderWidth: 2,
      borderColor: colors.textOnDark,
    },
    methodBtnTextOnDark: {
      color: colors.textOnDark,
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
    content: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingHorizontal: 24,
      paddingBottom: 28,
    },
  });
}

export type LoginStyles = ReturnType<typeof createLoginStyles>;
