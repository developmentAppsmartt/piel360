import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import type { AuthStackParamList } from '../../../navigation/RootNavigator';
import { useBranding } from '../../../context/BrandingContext';
import { AuthBackground } from '../login/components/AuthBackground';
import { RegisterForm } from './components/RegisterForm';
import { createRegisterStyles } from './styles/register.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterView({ navigation }: Props) {
  const branding = useBranding();
  const styles = useMemo(
    () => createRegisterStyles(branding.colors),
    [branding.colors],
  );

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.brand}>{branding.appName}</Text>
            <Text style={styles.subtitle}>
              Registro de paciente. Completa los pasos para crear tu cuenta.
            </Text>
            <RegisterForm onGoLogin={() => navigation.navigate('Login')} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}
