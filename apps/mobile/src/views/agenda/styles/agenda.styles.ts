import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../styles/shadow';

export function createAgendaStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#E8F4FC',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      padding: 16,
      gap: 14,
      paddingBottom: 40,
    },
    sectionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      gap: 10,
      ...appShadow({ opacity: 0.06, radius: 10, offsetY: 2, elevation: 2 }),
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
      marginBottom: 4,
    },
    dayPanel: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#F3F4F6',
      gap: 8,
    },
    dayPanelBlocked: {
      backgroundColor: '#FEF2F2',
    },
    dayPanelTitle: {
      fontWeight: '700',
      color: colors.text,
      fontSize: 14,
    },
    weeklySlotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      justifyContent: 'space-between',
    },
    weeklySlotItem: {
      width: '48%',
    },
    weeklySlotText: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    input: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 4,
      color: colors.text,
      backgroundColor: '#F9FAFB',
      fontSize: 15,
    },
    primaryBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
    },
    dangerBtn: {
      marginTop: 8,
      backgroundColor: '#DC2626',
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
    },
    btnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
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
      backgroundColor: '#FFF',
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
    mutedText: {
      fontSize: 13,
      color: colors.muted,
    },
    errorText: {
      fontSize: 13,
      color: '#B91C1C',
    },
    appointmentCard: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      padding: 12,
      backgroundColor: '#FAFBFC',
      gap: 6,
    },
    appointmentTitle: {
      fontWeight: '700',
      fontSize: 14,
      color: colors.text,
    },
    statusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    statusBtn: {
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    statusBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    statusBtnText: {
      fontWeight: '700',
      fontSize: 12,
      color: colors.text,
    },
    statusBtnTextActive: {
      color: '#FFFFFF',
    },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 8,
    },
    // Asignar cita — búsqueda de paciente
    stepBlock: {
      gap: 8,
      marginTop: 4,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    stepLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    stepLabelMuted: {
      color: colors.muted,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      backgroundColor: '#F9FAFB',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    searchResults: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
      maxHeight: 220,
    },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    searchResultRowActive: {
      backgroundColor: `${colors.primary}14`,
    },
    searchAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.primary}22`,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    searchAvatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    searchResultBody: {
      flex: 1,
      gap: 2,
    },
    searchResultName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    searchResultDoc: {
      fontSize: 12,
      color: colors.muted,
    },
    searchEmpty: {
      padding: 14,
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    selectedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${colors.primary}44`,
      backgroundColor: `${colors.primary}12`,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    selectedChipBody: {
      flex: 1,
      gap: 1,
    },
    selectedChipName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    selectedChipDoc: {
      fontSize: 11,
      color: colors.muted,
    },
    selectField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      backgroundColor: '#F9FAFB',
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    selectFieldText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    selectFieldPlaceholder: {
      color: '#9CA3AF',
      fontWeight: '500',
    },
    hoursPanel: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      padding: 10,
      gap: 8,
    },
    // Calendario mensual
    calNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    calNavBtn: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    calNavBtnText: {
      fontWeight: '700',
    },
    calMonthLabel: {
      fontSize: 14,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    calWeekHeader: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    calWeekCell: {
      flex: 1,
      alignItems: 'center',
    },
    calWeekText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#9CA3AF',
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calDayCell: {
      width: '14.28%',
      aspectRatio: 1,
      padding: 2,
    },
    calDayBtn: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    calDayCount: {
      fontSize: 8,
      fontWeight: '700',
    },
  });
}

export type AgendaStyles = ReturnType<typeof createAgendaStyles>;
