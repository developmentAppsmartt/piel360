import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createYoucamResultsStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    block: {
      gap: 12,
    },
    summaryRow: {
      gap: 6,
      paddingHorizontal: 2,
    },
    summaryLine: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    summaryMuted: {
      color: colors.muted,
      fontWeight: '600',
    },
    scoreBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E5E7EB',
      overflow: 'hidden',
      marginTop: 4,
    },
    scoreBarFill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    viewer: {
      width: '100%',
      aspectRatio: 0.85,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#0F172A',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    viewerImage: {
      width: '100%',
      height: '100%',
    },
    viewerOverlay: {
      ...StyleSheet.absoluteFill,
    },
    viewerBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    viewerBadgeText: {
      color: colors.textOnDark,
      fontSize: 12,
      fontWeight: '800',
    },
    viewerEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    viewerEmptyText: {
      color: '#E5E7EB',
      textAlign: 'center',
      fontSize: 13,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    actionBtnText: {
      color: colors.textOnDark,
      fontWeight: '800',
      fontSize: 14,
    },
    metricScroll: {
      marginHorizontal: -4,
    },
    metricChip: {
      width: 78,
      alignItems: 'center',
      gap: 6,
      marginHorizontal: 6,
    },
    metricRing: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 3,
      borderColor: '#D1D5DB',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    metricRingActive: {
      borderColor: colors.primary,
      backgroundColor: soft(colors.primary, '14'),
    },
    metricRingScore: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    metricChipLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
      textAlign: 'center',
    },
    metricChipLabelActive: {
      color: colors.primary,
    },
    copyCard: {
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: '#EEF0F3',
    },
    copyText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    // Progress
    progressScreen: {
      flex: 1,
      backgroundColor: soft(colors.primary, '18'),
    },
    progressCard: {
      flex: 1,
      marginTop: 8,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 24,
    },
    progressTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    toggleRow: {
      flexDirection: 'row',
      alignSelf: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 999,
      padding: 3,
      marginBottom: 12,
    },
    toggleBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
    },
    toggleBtnOn: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.muted,
    },
    toggleTextOn: {
      color: colors.textOnDark,
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 14,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
    },
    barRow: {
      marginBottom: 12,
    },
    barLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    barPair: {
      gap: 4,
    },
    barTrack: {
      height: 12,
      borderRadius: 6,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
    },
    barFill: {
      height: 12,
      borderRadius: 6,
    },
    barMeta: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    toggleHint: {
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 12,
      paddingHorizontal: 8,
    },
    colChartScroll: {
      paddingBottom: 16,
    },
    colChartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 4,
      minHeight: 220,
    },
    colItem: {
      width: 64,
      alignItems: 'center',
      gap: 6,
    },
    colBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 4,
      height: 140,
    },
    colBarTrack: {
      width: 18,
      height: 140,
      borderRadius: 6,
      backgroundColor: '#F3F4F6',
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    colBarFill: {
      width: 18,
      borderRadius: 6,
    },
    colValue: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.muted,
    },
    colLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      minHeight: 32,
    },
    note: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    // Report
    reportActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginBottom: 8,
    },
    reportActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    reportHeader: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 14,
    },
    reportAvatar: {
      width: 72,
      height: 72,
      borderRadius: 12,
      backgroundColor: soft(colors.primary, '22'),
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportAvatarImg: {
      width: '100%',
      height: '100%',
    },
    reportMeta: {
      flex: 1,
      gap: 3,
      justifyContent: 'center',
    },
    reportMetaText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    reportMetaMuted: {
      fontSize: 12,
      color: colors.muted,
    },
    reportStats: {
      gap: 4,
      marginBottom: 12,
    },
    bandLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 4,
    },
    rangeTrack: {
      height: 14,
      borderRadius: 7,
      flexDirection: 'row',
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 4,
    },
    rangeSeg: {
      height: 14,
    },
    rangeMarkerWrap: {
      height: 20,
      marginBottom: 12,
      position: 'relative',
    },
    rangeMarker: {
      position: 'absolute',
      top: 0,
      width: 22,
      height: 22,
      marginLeft: -11,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    rangeMarkerText: {
      color: '#FFF',
      fontSize: 9,
      fontWeight: '800',
    },
    rangeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    rangeLabel: {
      fontSize: 11,
      fontWeight: '700',
    },
    summaryBox: {
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    summaryTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.muted,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    summaryBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.text,
    },
    radarWrap: {
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 8,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF0F3',
      padding: 10,
      gap: 6,
      ...appShadow({ opacity: 0.03, radius: 4, offsetY: 1, elevation: 1 }),
    },
    metricCardTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    metricCardBand: {
      fontSize: 11,
      fontWeight: '700',
    },
    metricCardTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
    },
    metricCardFill: {
      height: 8,
      borderRadius: 4,
    },
    metricCardScore: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
  });
}
