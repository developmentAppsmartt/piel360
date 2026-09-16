import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

export function createClinicalRulesStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F5F6FA',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    scrollContent: {
      padding: 16,
      gap: 14,
      paddingBottom: 40,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
      marginTop: 4,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      gap: 10,
      ...appShadow({ opacity: 0.06, radius: 10, offsetY: 2, elevation: 2 }),
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    cardBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.muted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statPill: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      ...appShadow({ opacity: 0.05, radius: 8, offsetY: 1, elevation: 1 }),
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginTop: 2,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#F9FAFB',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    ruleCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      gap: 8,
      borderLeftWidth: 4,
      ...appShadow({ opacity: 0.05, radius: 8, offsetY: 1, elevation: 1 }),
    },
    ruleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    ruleLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    ruleMeta: {
      fontSize: 12,
      color: colors.muted,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: `${colors.primary}14`,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    badgeMuted: {
      backgroundColor: '#F3F4F6',
    },
    badgeMutedText: {
      color: '#6B7280',
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    secondaryBtn: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${colors.primary}55`,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    input: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: '#F9FAFB',
      color: colors.text,
      fontSize: 15,
    },
    errorText: {
      color: '#DC2626',
      fontSize: 13,
      textAlign: 'center',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 12,
    },
    recoBlock: {
      gap: 4,
    },
    recoTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    recoItem: {
      fontSize: 13,
      color: colors.muted,
    },
    previewBox: {
      height: 280,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
  });
}

export type ClinicalRulesStyles = ReturnType<typeof createClinicalRulesStyles>;

export const RULE_COLOR_HEX: Record<string, string> = {
  green: '#10B981',
  blue: '#0EA5E9',
  orange: '#FB923C',
  amber: '#F59E0B',
  red: '#F43F5E',
};

export function priorityLabel(priority: string): string {
  switch (priority) {
    case 'low':
      return 'Baja';
    case 'medium':
      return 'Media';
    case 'high':
      return 'Alta';
    case 'very_high':
      return 'Muy alta';
    default:
      return priority;
  }
}

export function formatSkinAgeDifferenceRange(
  minDifference: number,
  maxDifference: number,
): string {
  if (minDifference <= -100 && maxDifference <= -5) {
    return `≤ ${maxDifference} años`;
  }
  if (minDifference >= 8 && maxDifference >= 100) {
    return `≥ +${minDifference} años`;
  }
  if (minDifference < 0 && maxDifference < 0) {
    return `${minDifference} a ${maxDifference} años`;
  }
  if (minDifference >= 0 && maxDifference >= 0) {
    return `+${minDifference} a +${maxDifference} años`;
  }
  return `${minDifference} a ${maxDifference} años`;
}
