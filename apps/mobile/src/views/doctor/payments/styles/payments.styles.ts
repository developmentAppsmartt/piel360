import { StyleSheet } from 'react-native';
import type { AppBranding } from '../../../../config/branding.defaults';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createPaymentsStyles(colors: AppBranding['colors']) {
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
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    roundBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: soft(colors.secondary, '55'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
    },
    colFecha: { width: '22%' },
    colDesc: { width: '32%' },
    colPrecio: { width: '26%' },
    colEstado: { width: '20%', alignItems: 'flex-end' },
    headerCell: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    cell: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '500',
    },
    statusDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    empty: {
      paddingHorizontal: 24,
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    listContent: {
      paddingBottom: 24,
      flexGrow: 1,
    },
  });
}

export type PaymentsStyles = ReturnType<typeof createPaymentsStyles>;
