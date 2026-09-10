import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useBranding } from '../../context/BrandingContext';
import {
  dismissAppNotice,
  subscribeAppNotice,
  type AppNoticeRequest,
} from './appNotice';

export function AppNoticeHost() {
  const branding = useBranding();
  const [notice, setNotice] = useState<AppNoticeRequest | null>(null);

  useEffect(() => subscribeAppNotice(setNotice), []);

  const styles = useMemo(
    () => ({
      overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center' as const,
        paddingHorizontal: 24,
      },
      card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        overflow: 'hidden' as const,
      },
      accent: {
        height: 6,
        backgroundColor: branding.colors.primary,
      },
      body: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 8,
        gap: 8,
      },
      title: {
        fontSize: 18,
        fontWeight: '800' as const,
        color: branding.colors.primaryDark,
      },
      message: {
        fontSize: 15,
        lineHeight: 22,
        color: branding.colors.muted,
      },
      actions: {
        flexDirection: 'row' as const,
        justifyContent: 'flex-end' as const,
        flexWrap: 'wrap' as const,
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
      },
      btn: {
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minWidth: 96,
        alignItems: 'center' as const,
      },
      btnText: {
        fontSize: 14,
        fontWeight: '700' as const,
      },
    }),
    [branding.colors],
  );

  function close(onPress?: () => void) {
    dismissAppNotice();
    onPress?.();
  }

  function closeFromBackdrop() {
    const cancel = notice?.buttons.find((button) => button.style === 'cancel');
    close(cancel?.onPress);
  }

  return (
    <Modal
      visible={notice != null}
      transparent
      animationType="fade"
      onRequestClose={closeFromBackdrop}
    >
      <Pressable style={styles.overlay} onPress={closeFromBackdrop}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.accent} />
          <View style={styles.body}>
            <Text style={styles.title}>{notice?.title}</Text>
            {notice?.message ? (
              <Text style={styles.message}>{notice.message}</Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            {notice?.buttons.map((button, index) => {
              const cancel = button.style === 'cancel';
              const destructive = button.style === 'destructive';
              const bg = cancel
                ? 'transparent'
                : destructive
                  ? branding.colors.error
                  : branding.colors.primary;
              const color = cancel
                ? branding.colors.primary
                : branding.colors.textOnDark;
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={[
                    styles.btn,
                    {
                      backgroundColor: bg,
                      borderWidth: cancel ? 1.5 : 0,
                      borderColor: branding.colors.primary,
                    },
                  ]}
                  onPress={() => close(button.onPress)}
                >
                  <Text style={[styles.btnText, { color }]}>{button.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
