import type { AppBranding } from '../../../../config/branding.defaults';
import { StyleSheet } from 'react-native';
import { appShadow } from '../../../../styles/shadow';

export function createAccountDrawerStyles(colors: AppBranding['colors']) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(15, 23, 42, 0.35)',
    },
    panel: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '82%',
      maxWidth: 340,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
      paddingBottom: 24,
      ...appShadow({
        opacity: 0.15,
        radius: 16,
        offsetX: -4,
        offsetY: 0,
        elevation: 8,
      }),
    },
    title: {
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      paddingVertical: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#E5E7EB',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    itemIcon: {
      width: 22,
      textAlign: 'center',
      fontSize: 16,
      color: colors.muted,
    },
    itemLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    footer: {
      marginTop: 'auto',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#E5E7EB',
      paddingHorizontal: 18,
      paddingTop: 14,
    },
    footerLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: colors.muted,
    },
  });
}

export type AccountDrawerStyles = ReturnType<typeof createAccountDrawerStyles>;
