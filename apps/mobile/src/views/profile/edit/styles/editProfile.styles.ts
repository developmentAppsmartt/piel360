import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

export function createEditProfileStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 16,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: '#4B5563',
      marginBottom: 4,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },
    input: {
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    half: {
      flex: 1,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    chipTextActive: {
      color: colors.textOnDark,
    },
    iconChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    iconChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    fitzRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    fitzDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    fitzDotActive: {
      borderColor: colors.primary,
    },
    hint: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 17,
    },
    error: {
      color: colors.error,
      fontSize: 14,
      marginTop: 4,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    saveButtonDisabled: {
      opacity: 0.65,
    },
    saveButtonText: {
      color: colors.textOnDark,
      fontSize: 16,
      fontWeight: '700',
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
    },
  });
}

export type EditProfileStyles = ReturnType<typeof createEditProfileStyles>;
