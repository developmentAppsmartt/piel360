import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../styles/shadow';

/** Tinta suave del primary para fondos de acento (avatar, etc.). */
function softPrimary(hex: string, alphaHex = '26'): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return `${hex}${alphaHex}`;
  }
  return hex;
}

/**
 * Estilos de Mi Perfil ligados al branding del backoffice.
 * Header, acentos y tabs activos usan `colors.primary`.
 */
export function createProfileStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    headerBar: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSide: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.textOnDark,
      fontSize: 18,
      fontWeight: '700',
    },
    headerIcon: {
      color: colors.textOnDark,
      fontSize: 22,
      fontWeight: '600',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 28,
    },
    identity: {
      alignItems: 'center',
      paddingTop: 28,
      paddingBottom: 20,
      paddingHorizontal: 24,
      backgroundColor: '#FFFFFF',
    },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: softPrimary(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      ...appShadow({ opacity: 0.08, radius: 8, offsetY: 2, elevation: 2 }),
    },
    avatarText: {
      fontSize: 34,
      fontWeight: '700',
      color: colors.primary,
    },
    displayName: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 4,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    },
    secondarySubtitle: {
      marginTop: 2,
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
    sectionTitle: {
      backgroundColor: '#E9ECEF',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sectionTitleText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: '#4B5563',
    },
    sectionCard: {
      backgroundColor: '#FFFFFF',
    },
    row: {
      minHeight: 52,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    rowIcon: {
      width: 22,
      alignItems: 'center',
    },
    rowIconText: {
      fontSize: 15,
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    rowValue: {
      maxWidth: '48%',
      fontSize: 14,
      color: colors.muted,
      textAlign: 'right',
    },
    chevron: {
      fontSize: 22,
      color: '#9CA3AF',
      marginLeft: 4,
      fontWeight: '300',
    },
    logoutWrap: {
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    logoutButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#FECACA',
      backgroundColor: '#FEF2F2',
      paddingVertical: 14,
      alignItems: 'center',
    },
    logoutText: {
      color: colors.error,
      fontWeight: '700',
      fontSize: 15,
    },
  });
}

export type ProfileStyles = ReturnType<typeof createProfileStyles>;
