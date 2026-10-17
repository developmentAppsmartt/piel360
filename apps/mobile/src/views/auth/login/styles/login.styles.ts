import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

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
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.72)',
    },
    intro: {
      marginTop: 14,
      marginBottom: 20,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 21,
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.9)',
      paddingHorizontal: 8,
    },
    introAccent: {
      fontWeight: '700',
      color: colors.loginAccent,
    },
    introViolet: {
      fontWeight: '700',
      color: colors.loginAccent,
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
      ...appShadow({ opacity: 0.08, radius: 6, offsetY: 2, elevation: 2 }),
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
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.7)',
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
      color: colors.secondaryTextOverride ?? '#64748B',
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
      marginBottom: 14,
      marginTop: -2,
    },
    consentBlock: {
      gap: 12,
      marginBottom: 14,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 2,
    },
    checkLabel: {
      flex: 1,
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.88)',
      fontSize: 12.5,
      lineHeight: 18,
      paddingTop: 2,
    },
    checkLink: {
      color: colors.links,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    featureRow: {
      flexDirection: 'row',
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.14)',
      backgroundColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
      marginTop: 14,
      marginBottom: 4,
    },
    featureCard: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    featureCardBorder: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: 'rgba(255,255,255,0.14)',
    },
    featureTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 4,
      marginBottom: 2,
    },
    featureText: {
      fontSize: 10,
      lineHeight: 13,
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.72)',
    },
    error: {
      color: '#991B1B',
      backgroundColor: 'rgba(254, 226, 226, 0.95)',
      borderRadius: 10,
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
      marginBottom: 12,
      textAlign: 'center',
    },
    buttonWrap: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 2,
    },
    button: {
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      overflow: 'hidden',
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    buttonText: {
      color: colors.buttonGradientText,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    footer: {
      marginTop: 12,
      textAlign: 'center',
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.78)',
      fontSize: 14,
    },
    link: {
      color: colors.links,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    poweredBy: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    poweredByLabel: {
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.7)',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1.4,
    },
    poweredByLogo: {
      width: 132,
      height: 48,
    },
    complianceBlock: {
      marginTop: 20,
      gap: 10,
      alignItems: 'center',
    },
    complianceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    compliance: {
      textAlign: 'center',
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.55)',
      fontSize: 10,
      letterSpacing: 0.2,
      fontWeight: '600',
    },
    backLink: {
      marginBottom: 14,
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.8)',
      fontSize: 14,
      fontWeight: '600',
    },
    // Compatibilidad con RegisterForm
    field: {
      marginBottom: 12,
    },
    label: {
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.78)',
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
      backgroundColor: colors.button,
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
      color: colors.loginTextOverride ?? 'rgba(255,255,255,0.82)',
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
