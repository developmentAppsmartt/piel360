import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { Icons } from '../icons';
import { useBranding } from '../../context/BrandingContext';

const AUTO_DISMISS_MS = 4500;

type AnalysisRequestToastProps = {
  visible: boolean;
  title?: string;
  body?: string;
  onClose: () => void;
  onPressDetail: () => void;
};

/** Banner complementario de solicitudes al entrar a la home del paciente. */
export function AnalysisRequestToast({
  visible,
  title = 'Nueva solicitud de análisis',
  body = 'Tienes una solicitud pendiente de análisis de piel.',
  onClose,
  onPressDetail,
}: AnalysisRequestToastProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createStyles(branding.colors.primary, branding.colors.primaryDark),
    [branding.colors.primary, branding.colors.primaryDark],
  );
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    translateY.setValue(-8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onClose();
      });
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [visible, onClose, opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconWrap}>
        <AppIcon icon={Icons.bell} size={20} color={branding.colors.primaryDark} />
        <View style={styles.badge} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.body} numberOfLines={3}>
          {body}
        </Text>
      </View>

      <Pressable
        onPress={onPressDetail}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel="Ver detalle de la solicitud"
      >
        <Text style={styles.ctaText}>Ver detalle</Text>
        <AppIcon icon={Icons.chevronRight} size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="Cerrar notificación"
      >
        <AppIcon icon={Icons.close} size={16} color={branding.colors.primaryDark} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(primary: string, primaryDark: string) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#E8F1FA',
      borderWidth: 1,
      borderColor: '#C5D9EE',
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      paddingRight: 36,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#D6E6F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: '#E8F1FA',
    },
    copy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    title: {
      fontSize: 13,
      fontWeight: '800',
      color: primaryDark,
    },
    body: {
      fontSize: 12,
      lineHeight: 16,
      color: '#3A5570',
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    ctaText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    close: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 2,
    },
  });
}
