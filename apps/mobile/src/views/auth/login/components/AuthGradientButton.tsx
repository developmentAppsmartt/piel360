import {
  ActivityIndicator,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LoginStyles } from '../styles/login.styles';
import { AUTH_THEME } from '../../authTheme';

const GRADIENT_COLORS = AUTH_THEME.gradient;

type AuthGradientButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  styles: LoginStyles;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AuthGradientButton({
  label,
  onPress,
  disabled,
  loading,
  styles,
  containerStyle,
}: AuthGradientButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonWrap,
        containerStyle,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}
