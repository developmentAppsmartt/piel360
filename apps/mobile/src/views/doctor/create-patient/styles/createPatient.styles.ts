import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

function soft(hex: string, a = '22'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${a}` : hex;
}

export function createCreatePatientStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F5F3FF',
    },
    scroll: { flex: 1 },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 14,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    field: { gap: 6 },
    label: {
      fontSize: 12,
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
      fontSize: 15,
      color: colors.text,
    },
    row: { flexDirection: 'row', gap: 10 },
    half: { flex: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTextActive: { color: colors.textOnDark },
    iconChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFF',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    iconChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    fitzRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
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
    hint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
    error: { color: colors.error, fontSize: 14 },
    nextBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 4,
    },
    nextBtnDisabled: { opacity: 0.6 },
    nextBtnText: {
      color: colors.textOnDark,
      fontWeight: '700',
      fontSize: 16,
    },
    successWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 12,
    },
    successIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 3,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      backgroundColor: soft(colors.primary),
    },
    successIconText: { fontSize: 36, color: colors.primary },
    successTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.primaryDark,
      textAlign: 'center',
    },
    successId: { fontSize: 14, color: colors.muted },
    successLink: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
    },
    successDone: {
      marginTop: 20,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 28,
      paddingVertical: 14,
    },
    consentTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    consentSubtitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginTop: 4,
    },
    consentBody: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.muted,
      marginTop: 12,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 16,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxOn: { backgroundColor: colors.primary },
    checkMark: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    checkLabel: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  });
}

export type CreatePatientStyles = ReturnType<typeof createCreatePatientStyles>;
