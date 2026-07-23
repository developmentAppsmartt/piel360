import type { AppBranding } from '../../../config/branding.defaults';
import { StyleSheet } from 'react-native';

function softPrimary(hex: string, alphaHex = '22'): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return `${hex}${alphaHex}`;
  return hex;
}

export function createChatStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F3F4F6',
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnText: {
      color: colors.textOnDark,
      fontSize: 26,
      fontWeight: '300',
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvatarText: {
      color: colors.textOnDark,
      fontWeight: '700',
      fontSize: 13,
    },
    headerName: {
      flex: 1,
      color: colors.textOnDark,
      fontSize: 17,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    messages: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      paddingBottom: 12,
      gap: 12,
    },
    bubbleRow: {
      flexDirection: 'row',
    },
    bubbleRowMe: {
      justifyContent: 'flex-end',
    },
    bubbleRowPeer: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleMe: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubblePeer: {
      backgroundColor: '#E8E8ED',
      borderBottomLeftRadius: 4,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 21,
    },
    bubbleTextMe: {
      color: colors.textOnDark,
    },
    bubbleTextPeer: {
      color: colors.text,
    },
    bubbleMeta: {
      marginTop: 4,
      fontSize: 11,
      alignSelf: 'flex-end',
    },
    bubbleMetaMe: {
      color: 'rgba(255,255,255,0.75)',
    },
    bubbleMetaPeer: {
      color: colors.muted,
    },
    attachment: {
      maxWidth: '82%',
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      alignSelf: 'flex-end',
    },
    attachmentIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: softPrimary(colors.primary),
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentIconText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
    attachmentName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    attachmentAction: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentActionText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    quickActionsBar: {
      flexGrow: 0,
      flexShrink: 0,
      maxHeight: 52,
      backgroundColor: '#F3F4F6',
    },
    quickActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    quickChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      height: 36,
    },
    quickChipText: {
      color: colors.textOnDark,
      fontSize: 12,
      fontWeight: '700',
    },
    composerWrap: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#E5E7EB',
      paddingHorizontal: 12,
      paddingTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    composerInputWrap: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 22,
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    composerInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
      maxHeight: 100,
    },
    composerTools: {
      flexDirection: 'row',
      gap: 6,
      paddingBottom: 2,
    },
    toolIcon: {
      fontSize: 16,
      color: colors.muted,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnText: {
      color: colors.textOnDark,
      fontSize: 18,
      fontWeight: '700',
    },
  });
}

export type ChatStyles = ReturnType<typeof createChatStyles>;
