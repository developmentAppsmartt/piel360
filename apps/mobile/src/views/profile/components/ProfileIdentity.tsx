import { Text, View } from 'react-native';
import type { ProfileStyles } from '../styles/profile.styles';

type ProfileIdentityProps = {
  styles: ProfileStyles;
  displayName: string;
  subtitle: string;
  secondarySubtitle?: string;
  avatarInitials: string;
};

export function ProfileIdentity({
  styles,
  displayName,
  subtitle,
  secondarySubtitle,
  avatarInitials,
}: ProfileIdentityProps) {
  return (
    <View style={styles.identity}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarInitials || '?'}</Text>
      </View>
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {secondarySubtitle ? (
        <Text style={styles.secondarySubtitle}>{secondarySubtitle}</Text>
      ) : null}
    </View>
  );
}
