import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { cachedImageSource } from '../../../../lib/image-cache';
import { analysisResultHeroStyles as styles } from '../styles/analysisResultHero.styles';

type AnalysisResultHeroProps = {
  title: string;
  patientName: string;
  stamp: string;
  avatarUrl?: string | null;
  primaryColor: string;
};

/** Título azul + ficha del paciente arriba del resultado. */
export function AnalysisResultHero({
  title,
  patientName,
  stamp,
  avatarUrl,
  primaryColor,
}: AnalysisResultHeroProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[primaryColor, '#4F86C6']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.titleBar}
      >
        <View style={styles.titleIcon}>
          <AppIcon icon={Icons.chartBar} size={16} color={primaryColor} />
        </View>
        <Text style={styles.titleText}>{title}</Text>
      </LinearGradient>

      <View style={styles.patientCard}>
        <View style={[styles.avatar, { backgroundColor: `${primaryColor}22` }]}>
          {avatarUrl ? (
            <Image
              source={cachedImageSource(avatarUrl)}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <AppIcon icon={Icons.account} size={28} color={primaryColor} />
          )}
        </View>
        <View style={styles.patientMeta}>
          <Text style={[styles.patientName, { color: primaryColor }]} numberOfLines={1}>
            {patientName}
          </Text>
          <View style={styles.stampRow}>
            <AppIcon icon={Icons.calendarDay} size={14} color={primaryColor} />
            <Text style={styles.stamp}>{stamp}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
