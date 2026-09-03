import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/RootNavigator';
import { useBranding } from '../../../context/BrandingContext';
import { useDeviceLayout } from '../../../styles/deviceLayout';
import { BrandLogo } from '../../../components/BrandLogo';
import { AuthBackground } from './components/AuthBackground';
import { LoginForm } from './components/LoginForm';
import { createLoginStyles } from './styles/login.styles';
import { StatusBar } from 'expo-status-bar';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginView({ navigation }: Props) {
  const branding = useBranding();
  const styles = useMemo(() => createLoginStyles(branding.colors), [branding.colors]);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useDeviceLayout();
  const scrollMinHeight =
    isTablet && isLandscape
      ? Math.max(height - insets.top - insets.bottom, 480)
      : undefined;

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { flexGrow: 1 },
              scrollMinHeight != null ? { minHeight: scrollMinHeight } : null,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoWrap}>
              <BrandLogo height={120} style={styles.logo} />
            </View>

            <Text style={styles.intro}>
              <Text style={styles.introAccent}>PIEL360</Text>
              {' cambia la forma de conectar con tus pacientes: '}
              <Text style={styles.introViolet}>evidencia visual</Text>
              {' y '}
              <Text style={styles.introAccent}>resultados medibles</Text>.
            </Text>

            <LoginForm
              onGoRegister={() => navigation.navigate('Register')}
              onGoForgotPassword={() => navigation.navigate('ForgotPassword')}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}
