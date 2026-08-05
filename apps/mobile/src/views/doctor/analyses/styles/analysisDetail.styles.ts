import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createAnalysisDetailStyles(colors: AppBranding['colors']) {
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
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 36,
      gap: 14,
    },
    patientName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginTop: 4,
    },
    stamp: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 4,
    },
    heroRow: {
      flexDirection: 'row',
      gap: 10,
    },
    heroCard: {
      flex: 1,
      backgroundColor: soft(colors.primary, '14'),
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 4,
      ...appShadow({ opacity: 0.05, radius: 6, offsetY: 2, elevation: 1 }),
    },
    heroValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primary,
    },
    heroLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.muted,
      marginTop: 6,
    },
    metricRow: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF0F3',
      padding: 12,
      gap: 8,
      ...appShadow({ opacity: 0.03, radius: 4, offsetY: 1, elevation: 1 }),
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    metricLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    metricScore: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.primary,
    },
    metricSub: {
      fontSize: 12,
      color: colors.muted,
    },
    barTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
    },
    barFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    note: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      padding: 12,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 14,
    },
    errorBox: {
      margin: 16,
      padding: 14,
      borderRadius: 12,
      backgroundColor: soft(colors.error, '14'),
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    shareBtn: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    shareBtnDisabled: {
      backgroundColor: soft(colors.primary, '55'),
    },
    shareBtnShared: {
      backgroundColor: soft(colors.success, '22'),
      borderWidth: 1,
      borderColor: colors.success,
    },
    shareBtnText: {
      color: colors.textOnDark,
      fontWeight: '700',
      fontSize: 15,
    },
    shareBtnTextShared: {
      color: colors.success,
    },
    skiniverBlock: {
      gap: 14,
    },
    gaugeWrap: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    gaugeLabels: {
      width: '100%',
      maxWidth: 280,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    gaugeLabel: {
      fontSize: 11,
      fontWeight: '700',
    },
    gaugeRisk: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 2,
    },
    gaugeRiskStrong: {
      fontWeight: '800',
      color: colors.text,
    },
    topDiagnosisCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#EEF0F3',
      padding: 14,
      ...appShadow({ opacity: 0.04, radius: 6, offsetY: 2, elevation: 1 }),
    },
    diagnosisCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF0F3',
      padding: 12,
    },
    diagnosisRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    diagnosisProb: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
    },
    diagnosisBody: {
      flex: 1,
      gap: 2,
    },
    diagnosisTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    diagnosisSub: {
      fontSize: 12,
      color: colors.muted,
    },
    carousel: {
      gap: 10,
    },
    carouselFrame: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#0F172A',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    carouselImage: {
      width: '100%',
      height: '100%',
    },
    carouselOverlay: {
      ...StyleSheet.absoluteFill,
    },
    carouselLabel: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },
    carouselDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    carouselDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#D1D5DB',
    },
    carouselDotActive: {
      backgroundColor: colors.primary,
      width: 18,
    },
    carouselNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    carouselNavBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: soft(colors.primary, '14'),
    },
    carouselNavBtnDisabled: {
      opacity: 0.4,
    },
    carouselNavText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    riskBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    riskBannerText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
    },
    conclusionBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: soft(colors.primary, '10'),
      borderRadius: 14,
      padding: 12,
    },
    conclusionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaText: {
      flex: 1,
      fontSize: 13,
      color: colors.muted,
      fontWeight: '600',
    },
    disclaimer: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 4,
    },
    storyModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    storyModalCard: {
      maxHeight: '85%',
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 24,
    },
    storyModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    storyModalTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    storyMeta: {
      paddingHorizontal: 16,
      fontSize: 13,
      color: colors.muted,
      marginBottom: 8,
    },
    storyScroll: {
      maxHeight: 420,
    },
    storyScrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      gap: 10,
    },
    storyBody: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.text,
    },
  });
}

export type AnalysisDetailStyles = ReturnType<typeof createAnalysisDetailStyles>;
