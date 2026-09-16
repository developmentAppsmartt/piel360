import { useMemo } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { AppIcon } from '../AppIcon';
import { Icons, type AppIconName } from '../icons';
import { useBranding } from '../../context/BrandingContext';

const LOGO = require('../../../assets/logo-piel360-brand.jpeg');
const BANNER = require('../../../assets/acerca-de-banner.png');

const DIAGNOSES: { icon: AppIconName; label: string }[] = [
  { icon: Icons.dermAnalysis, label: 'Dermatológico' },
  { icon: Icons.aesthetic, label: 'Estético' },
  { icon: Icons.fototipo, label: 'Fototipo' },
];

function appVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0'
  );
}

type AboutPiel360ContentProps = {
  onClose?: () => void;
  showClose?: boolean;
  /** Ancho del contenido (p. ej. card del modal). */
  contentMaxWidth?: number;
  /** Logo más compacto para modal. */
  compact?: boolean;
};

/** Contenido visual de «Acerca de»: logo oficial + copy + banner. */
export function AboutPiel360Content({
  onClose,
  showClose = false,
  contentMaxWidth,
  compact = false,
}: AboutPiel360ContentProps) {
  const branding = useBranding();
  const { width } = useWindowDimensions();
  const primary = branding.colors.primary;
  const primaryDark = branding.colors.primaryDark;
  const contentWidth = Math.min(
    contentMaxWidth ?? width - 32,
    compact ? 420 : 560,
  );
  const logoHeight = contentWidth * (compact ? 0.42 : 408 / 612);
  const bannerHeight = contentWidth * (206 / 512);
  const styles = useMemo(
    () => createStyles(primary, primaryDark),
    [primary, primaryDark],
  );

  return (
    <View style={styles.inner}>
      {showClose && onClose ? (
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Acerca de</Text>
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Cerrar"
            hitSlop={8}
          >
            <AppIcon icon={Icons.close} size={18} color={primary} />
          </Pressable>
        </View>
      ) : null}

      <Image
        source={LOGO}
        style={{ width: contentWidth, height: logoHeight, alignSelf: 'center' }}
        resizeMode="contain"
        accessibilityLabel="Piel 360 — Explora tu piel, entiende tu salud"
        accessibilityIgnoresInvertColors
      />

      <View style={styles.copyBlock}>
        <Text style={styles.lead}>
          <Text style={styles.brandInline}>PIEL360</Text> cambia la forma de
          conectar con tus pacientes:
        </Text>
        <Text style={styles.highlight}>
          tres diagnósticos con evidencia visual y resultados medibles.
        </Text>
        <Text style={styles.support}>
          Análisis Dermatológico, Estético y de Fototipo en una sola plataforma
          de apoyo clínico y estético.
        </Text>
      </View>

      <View style={styles.diagnosesRow}>
        {DIAGNOSES.map((item) => (
          <View key={item.label} style={styles.diagnosisCard}>
            <View style={styles.diagnosisIcon}>
              <AppIcon icon={item.icon} size={22} color={primary} />
            </View>
            <Text style={styles.diagnosisLabel}>{item.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <Image
        source={BANNER}
        style={{
          width: contentWidth,
          height: bannerHeight,
          alignSelf: 'center',
          marginTop: 8,
        }}
        resizeMode="contain"
        accessibilityLabel={`Versión ${appVersion()}`}
        accessibilityIgnoresInvertColors
      />

      <Text style={styles.disclaimer}>
        Piel 360 AI — versión {appVersion()}. Esta app no sustituye una consulta
        médica presencial.
      </Text>
    </View>
  );
}

type AboutPiel360ModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AboutPiel360Modal({ visible, onClose }: AboutPiel360ModalProps) {
  const branding = useBranding();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const primary = branding.colors.primary;
  const cardWidth = Math.min(width - 28, 440);
  const cardMaxHeight = Math.min(height - insets.top - insets.bottom - 24, height * 0.88);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          modalStyles.backdrop,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            modalStyles.card,
            { width: cardWidth, maxHeight: cardMaxHeight },
          ]}
        >
          <ScrollView
            style={modalStyles.scroll}
            contentContainerStyle={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <AboutPiel360Content
              onClose={onClose}
              showClose
              compact
              contentMaxWidth={cardWidth - 32}
            />
          </ScrollView>
          <Pressable
            style={[modalStyles.doneBtn, { backgroundColor: primary }]}
            onPress={onClose}
          >
            <Text style={modalStyles.doneBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(primary: string, primaryDark: string) {
  return StyleSheet.create({
    inner: {
      gap: 16,
      alignItems: 'stretch',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    screenTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: primaryDark,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${primary}18`,
    },
    copyBlock: {
      gap: 8,
      paddingHorizontal: 4,
    },
    lead: {
      fontSize: 15,
      lineHeight: 22,
      color: primaryDark,
      fontWeight: '600',
    },
    brandInline: {
      fontWeight: '800',
      color: primaryDark,
    },
    highlight: {
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '800',
      color: primary,
    },
    support: {
      fontSize: 14,
      lineHeight: 21,
      color: '#475569',
      fontWeight: '500',
    },
    diagnosesRow: {
      flexDirection: 'row',
      gap: 8,
    },
    diagnosisCard: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 16,
      backgroundColor: `${primary}0F`,
      borderWidth: 1,
      borderColor: `${primary}22`,
    },
    diagnosisIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    diagnosisLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: primaryDark,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    disclaimer: {
      fontSize: 12,
      lineHeight: 18,
      color: '#64748B',
      textAlign: 'center',
      paddingHorizontal: 8,
    },
  });
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 61, 115, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 90, 158, 0.14)',
    // Altura mínima para que el contenido no colapse a solo el botón.
    minHeight: 320,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  doneBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
