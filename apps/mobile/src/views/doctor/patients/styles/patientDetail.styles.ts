import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createPatientDetailStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: soft(colors.primary, '18'),
    },
    card: {
      flex: 1,
      marginTop: 8,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    roundBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.muted,
    },
    identity: {
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 4,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: soft(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      ...appShadow({ opacity: 0.08, radius: 8, offsetY: 2, elevation: 2 }),
    },
    avatarText: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.primary,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    meta: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    newAnalysisBtn: {
      marginTop: 12,
      alignSelf: 'stretch',
      marginHorizontal: 24,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    newAnalysisText: {
      color: colors.textOnDark,
      fontWeight: '700',
      fontSize: 15,
    },
    historyHeader: {
      marginTop: 18,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    historyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.muted,
      flex: 1,
      paddingTop: 4,
    },
    historyActions: {
      gap: 8,
      alignItems: 'flex-end',
    },
    historyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    historyActionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      gap: 10,
    },
    analysisRow: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF0F3',
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      ...appShadow({ opacity: 0.04, radius: 6, offsetY: 2, elevation: 1 }),
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
      backgroundColor: soft(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    thumbImage: {
      width: 56,
      height: 56,
    },
    analysisBody: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    diagnosisRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    severity: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    diagnosis: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    stampRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    stamp: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    goBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      paddingVertical: 28,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
    },
    loading: {
      paddingVertical: 40,
      alignItems: 'center',
    },
  });
}

export type PatientDetailStyles = ReturnType<typeof createPatientDetailStyles>;
