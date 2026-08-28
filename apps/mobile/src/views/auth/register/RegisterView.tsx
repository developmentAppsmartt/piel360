import { useCallback, useMemo, useState } from 'react';
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
import { BrandLogo } from '../../../components/BrandLogo';
import { AuthBackground } from '../login/components/AuthBackground';
import {
  RegisterForm,
  type RegisterStep,
} from './components/RegisterForm';
import { createRegisterStyles } from './styles/register.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const CARD_STEPS: RegisterStep[] = [
  'profile',
  'contact',
  'skinIntro',
  'survey',
];

export function RegisterView({ navigation }: Props) {
  const branding = useBranding();
  const styles = useMemo(
    () => createRegisterStyles(branding.colors),
    [branding.colors],
  );
  const [step, setStep] = useState<RegisterStep>('credentials');
  const isCard = CARD_STEPS.includes(step);

  const onStepChange = useCallback((next: RegisterStep) => {
    setStep(next);
  }, []);

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={
              isCard ? styles.scrollContentCard : styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isCard ? (
              <>
                <BrandLogo height={44} style={styles.logo} />
                <Text style={styles.subtitle}>
                  Registro de paciente. Completa los pasos para crear tu cuenta.
                </Text>
              </>
            ) : null}
            <RegisterForm
              onGoLogin={() => navigation.navigate('Login')}
              onStepChange={onStepChange}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthBackground>
  );
}
