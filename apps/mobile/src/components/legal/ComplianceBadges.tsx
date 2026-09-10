import { Image, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

type ComplianceBadgesProps = {
  /** Conservado por compatibilidad; los logos van sobre fondo claro. */
  variant?: 'dark' | 'light';
};

const BADGES: Array<{ id: string; label: string; source: ImageSourcePropType }> =
  [
    {
      id: 'gdpr',
      label: 'GDPR',
      source: require('../../../assets/GDPR.jpg'),
    },
    {
      id: 'hipaa',
      label: 'HIPAA',
      source: require('../../../assets/HIPAA.jpg'),
    },
    {
      id: 'iso',
      label: 'ISO 13485',
      source: require('../../../assets/ISO-13485.jpg'),
    },
    {
      id: 'ce',
      label: 'CE',
      source: require('../../../assets/CE.png'),
    },
  ];

/** Logos de cumplimiento normativo (GDPR, HIPAA, ISO 13485, CE). */
export function ComplianceBadges({ variant = 'light' }: ComplianceBadgesProps) {
  const labelColor = variant === 'dark' ? 'rgba(255,255,255,0.85)' : '#0F3D73';
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      {BADGES.map((badge) => (
        <View key={badge.id} style={styles.item}>
          <View style={styles.badge}>
            <Image
              source={badge.source}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={[styles.label, { color: labelColor }]}>{badge.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
});
