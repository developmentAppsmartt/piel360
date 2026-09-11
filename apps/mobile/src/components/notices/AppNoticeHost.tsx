import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useBranding } from '../../context/BrandingContext';
import { AppIcon } from '../AppIcon';
import { Icons } from '../icons';
import {
  dismissAppNotice,
  subscribeAppNotice,
  type AppNoticeRequest,
} from './appNotice';

export function AppNoticeHost() {
  const branding = useBranding();
  const [notice, setNotice] = useState<AppNoticeRequest | null>(null);

  useEffect(() => subscribeAppNotice(setNotice), []);

  const destructive = notice?.buttons.some(
    (button) => button.style === 'destructive',
  );

  const styles = useMemo(
    () => ({
      overlay: {
        flex: 1,
        justifyContent: 'center' as const,
        paddingHorizontal: 22,
      },
      card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        overflow: 'hidden' as const,
        borderWidth: 1,
        borderColor: `${branding.colors.primary}22`,
        shadowColor: branding.colors.primaryDark,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      },
      header: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 12,
      },
      iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      headerCopy: {
        flex: 1,
        gap: 2,
      },
      brand: {
        fontSize: 11,
        fontWeight: '700' as const,
        letterSpacing: 0.4,
        textTransform: 'uppercase' as const,
        color: branding.colors.secondary,
      },
      title: {
        fontSize: 18,
        fontWeight: '800' as const,
        color: branding.colors.primaryDark,
      },
      body: {
        paddingHorizontal: 20,
        paddingBottom: 8,
      },
      message: {
        fontSize: 15,
        lineHeight: 22,
        color: branding.colors.muted,
      },
      divider: {
        height: 1,
        backgroundColor: `${branding.colors.primary}14`,
        marginTop: 12,
      },
      actions: {
        flexDirection: 'row' as const,
        justifyContent: 'flex-end' as const,
        flexWrap: 'wrap' as const,
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16,
      },
      btn: {
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 11,
        minWidth: 104,
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

  const accent = destructive
    ? branding.colors.error
    : branding.colors.primary;

  return (
    <Modal
      visible={notice != null}
      transparent
      animationType="fade"
      onRequestClose={closeFromBackdrop}
    >
      <Pressable style={{ flex: 1 }} onPress={closeFromBackdrop}>
        <LinearGradient
          colors={['rgba(15, 61, 115, 0.55)', 'rgba(11, 10, 18, 0.62)']}
          style={styles.overlay}
        >
          <Pressable onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.card}>
              <LinearGradient
                colors={[`${branding.colors.primary}18`, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}
                >
                  <AppIcon
                    icon={destructive ? Icons.alertCircle : Icons.information}
                    size={20}
                    color={accent}
                  />
                </View>
                <View style={styles.headerCopy}>
                  <Text style={styles.brand}>{branding.appName}</Text>
                  <Text style={styles.title}>{notice?.title}</Text>
                </View>
              </LinearGradient>
              {notice?.message ? (
                <View style={styles.body}>
                  <Text style={styles.message}>{notice.message}</Text>
                  <View style={styles.divider} />
                </View>
              ) : (
                <View style={[styles.divider, { marginHorizontal: 20 }]} />
              )}
              <View style={styles.actions}>
                {notice?.buttons.map((button, index) => {
                  const cancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  const bg = cancel
                    ? 'transparent'
                    : isDestructive
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
                      <Text style={[styles.btnText, { color }]}>
                        {button.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
}
