import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

export function createDoctorReportsStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#E8F4FC',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 14,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
      marginTop: 4,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      ...appShadow({ opacity: 0.05, radius: 8, offsetY: 2, elevation: 2 }),
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    cardHint: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 17,
    },
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    presetChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    presetChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    presetChipTextActive: {
      color: colors.textOnDark,
    },
    tabsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tabsScroll: {
      paddingVertical: 2,
    },
    tabsSegment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      padding: 4,
    },
    tabsSegmentWrap: {
      flexWrap: 'wrap',
      width: '100%',
    },
    tab: {
      borderRadius: 999,
      borderWidth: 0,
      backgroundColor: 'transparent',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tabActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
    },
    tabTextActive: {
      color: colors.textOnDark,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    kpiCard: {
      width: '47.5%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      gap: 4,
      minHeight: 96,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
      lineHeight: 15,
    },
    kpiValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    kpiDelta: {
      fontSize: 11,
      fontWeight: '600',
    },
    kpiHint: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 2,
    },
    highlightBad: {
      color: '#DC2626',
    },
    highlightGood: {
      color: '#16A34A',
    },
    distRow: {
      gap: 8,
    },
    distItem: {
      gap: 4,
    },
    distMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    distLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    distPct: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
    },
    distTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
    },
    distFill: {
      height: '100%',
      borderRadius: 999,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
      height: 120,
      paddingTop: 8,
    },
    trendCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      height: '100%',
    },
    trendBarWrap: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    trendBar: {
      width: '100%',
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      minHeight: 4,
    },
    trendLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
    },
    trendScore: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text,
    },
    categoryRow: {
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingTop: 10,
      gap: 4,
    },
    categoryTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    categoryMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    scoreBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 2,
    },
    scoreBadgeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    emptyBody: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: 12,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    errorText: {
      color: '#DC2626',
      fontSize: 14,
      textAlign: 'center',
    },
    footerNote: {
      fontSize: 11,
      color: colors.muted,
      lineHeight: 16,
    },
  });
}

export type DoctorReportsStyles = ReturnType<typeof createDoctorReportsStyles>;
