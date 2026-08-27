import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import type { ProfileStyles } from '../styles/profile.styles';

type ProfileIdentityProps = {
  styles: ProfileStyles;
  displayName: string;
  subtitle: string;
  secondarySubtitle?: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  avatarBusy?: boolean;
  onPressAvatar?: () => void;
};

export function ProfileIdentity({
  styles,
  displayName,
  subtitle,
  secondarySubtitle,
  avatarInitials,
  avatarUrl,
  avatarBusy,
  onPressAvatar,
}: ProfileIdentityProps) {
  return (
    <View style={styles.identity}>
      <Pressable
        style={styles.avatar}
        onPress={onPressAvatar}
        disabled={!onPressAvatar || avatarBusy}
        accessibilityRole="button"
        accessibilityLabel="Cambiar foto de perfil"
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatarImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={styles.avatarText}>{avatarInitials || '?'}</Text>
        )}
        {avatarBusy ? (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
      {onPressAvatar ? (
        <Text style={styles.avatarHint}>Toca la foto para cambiarla</Text>
      ) : null}
      <Text style={styles.displayName}>{displayName}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {secondarySubtitle ? (
        <Text style={styles.secondarySubtitle}>{secondarySubtitle}</Text>
      ) : null}
    </View>
  );
}
