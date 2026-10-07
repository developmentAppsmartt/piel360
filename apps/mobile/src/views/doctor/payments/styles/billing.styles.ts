import { StyleSheet } from 'react-native';
import { DEFAULT_BRANDING, type AppBranding } from '../../../../config/branding.defaults';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createBillingStyles(colors: AppBranding['colors']) {
  /** Tarjetas de estado y totales: colores descriptivos que no se personalizan. */
  const sys = DEFAULT_BRANDING.colors;
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 32,
      gap: 14,
    },
    subtitle: {
      fontSize: 14,
      color: colors.secondaryTextOverride ?? colors.muted,
      lineHeight: 20,
    },

    /* Resumen superior */
    summaryRow: {
      flexDirection: 'row',
      gap: 8,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      padding: 10,
      gap: 6,
      minHeight: 118,
    },
    summaryIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryTitle: {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primaryText,
    },
    summaryHint: {
      fontSize: 11,
      color: sys.muted,
      lineHeight: 14,
    },
    totalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: soft(sys.icon, '33'),
      backgroundColor: soft(sys.primary, '0D'),
      padding: 14,
    },
    totalIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: sys.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryText,
    },
    totalValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primaryText,
    },
    totalHint: {
      fontSize: 12,
      color: sys.muted,
    },

    /* Búsqueda y filtros */
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 999,
      paddingHorizontal: 14,
      backgroundColor: '#FFFFFF',
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    filterBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#FFFFFF',
    },
    chipActive: {
      backgroundColor: colors.buttonHover,
      borderColor: colors.buttonHover,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    chipTextActive: {
      color: colors.buttonText,
    },
    chipCount: {
      minWidth: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      paddingVertical: 1,
      backgroundColor: '#EEF2F7',
      alignItems: 'center',
    },
    chipCountActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    chipCountText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryText,
    },

    /* Secciones */
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    sectionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryText,
    },
    sectionHint: {
      fontSize: 13,
      fontWeight: '600',
    },
    sectionCount: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
    },
    sectionCountText: {
      fontSize: 12,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 14,
      color: colors.secondaryTextOverride ?? colors.muted,
      textAlign: 'center',
      lineHeight: 20,
      paddingVertical: 16,
    },

    /* Card de plan */
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
    },
    planAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    planBody: {
      flex: 1,
      gap: 3,
    },
    planTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    planName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryText,
    },
    planSubtitle: {
      fontSize: 12,
      color: sys.muted,
    },
    creditsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    creditsText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryText,
    },
    creditsTotal: {
      fontWeight: '500',
      color: sys.muted,
    },
    barTrack: {
      flex: 1,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#E5E7EB',
      overflow: 'hidden',
    },
    barFill: {
      height: 7,
      borderRadius: 4,
    },
    pctText: {
      fontSize: 12,
      color: sys.muted,
      minWidth: 34,
      textAlign: 'right',
    },
    planDate: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    planDateText: {
      fontSize: 12,
      color: sys.muted,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '700',
    },

    /* Acciones de lista */
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: '#FFFFFF',
    },
    linkRowText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryText,
    },

    /* Detalle */
    panel: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: soft(colors.primary, '0A'),
    },
    panelTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryText,
    },
    panelBody: {
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    heroAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    heroName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primaryText,
      flexShrink: 1,
    },
    creditsBox: {
      marginHorizontal: 14,
      borderRadius: 12,
      padding: 12,
      gap: 6,
    },
    creditsLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    creditsBig: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primaryText,
    },
    heroMeta: {
      flexDirection: 'row',
      padding: 14,
    },
    heroMetaCol: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    heroMetaDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: '#E5E7EB',
      marginHorizontal: 10,
    },
    metaLabel: {
      fontSize: 12,
      color: colors.secondaryTextOverride ?? colors.muted,
    },
    metaValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryText,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: soft(colors.icon, '12'),
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoBody: {
      flex: 1,
      gap: 3,
    },
    billRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    billLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.secondaryTextOverride ?? colors.muted,
    },
    billValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryText,
    },
    invoiceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: soft(colors.icon, '55'),
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    invoiceBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primaryText,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginVertical: 5,
    },
    actionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryText,
    },
    moreCredits: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: soft(colors.icon, '33'),
      backgroundColor: soft(colors.primary, '0D'),
      padding: 14,
      gap: 12,
    },
    moreCreditsTop: {
      flexDirection: 'row',
      gap: 10,
    },
    moreCreditsTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryText,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 999,
      backgroundColor: colors.button,
      paddingVertical: 13,
    },
    primaryBtnText: {
      color: colors.buttonText,
      fontSize: 15,
      fontWeight: '700',
    },

    /* Historial */
    historyItem: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      padding: 12,
      gap: 4,
      backgroundColor: '#FFFFFF',
    },
    historyTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    historyName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryText,
    },
    historyAmount: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primaryText,
    },
    historyMeta: {
      fontSize: 12,
      color: colors.secondaryTextOverride ?? colors.muted,
    },

    /* Formulario de facturación */
    field: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryText,
    },
    input: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.text,
      backgroundColor: '#FAFBFC',
    },
  });
}

export type BillingStyles = ReturnType<typeof createBillingStyles>;
