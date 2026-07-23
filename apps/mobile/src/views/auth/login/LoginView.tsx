import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/RootNavigator';
import { useBranding } from '../../../context/BrandingContext';
import { AuthBackground } from './components/AuthBackground';
import { LoginForm } from './components/LoginForm';
import { createLoginStyles } from './styles/login.styles';
import { StatusBar } from 'expo-status-bar';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginView({ navigation }: Props) {
  const branding = useBranding();
  const styles = useMemo(() => createLoginStyles(branding.colors), [branding.colors]);

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.brand}>{branding.appName}</Text>
            <Text style={styles.subtitle}>
              Explora tu piel, entiende tu salud. Inicia sesión para continuar.
            </Text>
            <LoginForm
              onGoRegister={() => navigation.navigate('Register')}
              onGoForgotPassword={() => navigation.navigate('ForgotPassword')}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}
