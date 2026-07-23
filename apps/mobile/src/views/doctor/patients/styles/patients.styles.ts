import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createDoctorPatientsStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F5F3FF',
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerBack: {
      color: colors.textOnDark,
      fontSize: 26,
      fontWeight: '300',
      width: 28,
    },
    headerTitle: {
      color: colors.textOnDark,
      fontSize: 17,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIcon: {
      color: colors.textOnDark,
      fontSize: 18,
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
    content: {
      flex: 1,
    },
    contentPad: {
      padding: 16,
      paddingBottom: 28,
      gap: 16,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    metric: {
      flex: 1,
      gap: 6,
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryDark,
    },
    metricCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: soft(colors.primary, '55'),
      paddingVertical: 14,
      paddingHorizontal: 12,
      minHeight: 56,
      justifyContent: 'center',
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
    },
    newButton: {
      alignSelf: 'center',
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 28,
      paddingVertical: 14,
      marginTop: 4,
    },
    newButtonText: {
      color: colors.textOnDark,
      fontWeight: '700',
      fontSize: 15,
    },
    listTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryDark,
      marginTop: 4,
    },
    row: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
      ...appShadow({ opacity: 0.04, radius: 6, offsetY: 2, elevation: 1 }),
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: soft(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 14,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    rowMeta: {
      marginTop: 2,
      fontSize: 12,
      color: colors.muted,
    },
    rowAge: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginRight: 6,
    },
    rowGo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowGoText: {
      color: colors.textOnDark,
      fontSize: 16,
      fontWeight: '700',
    },
    empty: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 20,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

export type DoctorPatientsStyles = ReturnType<typeof createDoctorPatientsStyles>;
