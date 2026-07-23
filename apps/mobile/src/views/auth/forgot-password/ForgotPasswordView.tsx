import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AppIcon } from '../../../components/AppIcon';
import { Icons } from '../../../components/icons';
import { useBranding } from '../../../context/BrandingContext';
import type { AuthStackParamList } from '../../../navigation/RootNavigator';
import { ApiError } from '../../../services/api.client';
import { authService } from '../../../services/auth.service';
import { AuthFeedbackModal } from '../components/AuthFeedbackModal';
import { OtpInput } from '../components/OtpInput';
import { AuthBackground } from '../login/components/AuthBackground';
import { createLoginStyles } from '../login/styles/login.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type Step = 'email' | 'otp' | 'password';

export function ForgotPasswordView({ navigation }: Props) {
  const branding = useBranding();
  const styles = useMemo(
    () => createLoginStyles(branding.colors),
    [branding.colors],
  );

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;

  async function sendCode() {
    setError(null);
    if (!email.trim()) {
      setError('Introduce tu correo electrónico.');
      return;
    }
    setSubmitting(true);
    try {
      await authService.sendOtp(email, 'reset');
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar el código. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    setError(null);
    if (otp.trim().length !== 5) {
      setError('Introduce el código de 5 dígitos.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authService.verifyOtp(email, 'reset', otp);
      if (!res.token) {
        throw new Error('Sin token de recuperación');
      }
      setResetToken(res.token);
      setStep('password');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Código inválido. Inténtalo de nuevo.',
      );
      setResult('error');
    } finally {
      setSubmitting(false);
    }
  }

  async function changePassword() {
    setError(null);
    if (!resetToken) {
      setError('Sesión de recuperación inválida. Solicita un nuevo código.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword(resetToken, password);
      setResult('success');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Algo salió mal. Inténtalo de nuevo.',
      );
      setResult('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => {
                if (step === 'email') navigation.navigate('Login');
                else if (step === 'otp') setStep('email');
                else setStep('otp');
              }}
            >
              <Text style={styles.backLink}>← Volver</Text>
            </Pressable>

            <Text style={styles.brand}>{branding.appName}</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Introduce tu correo electrónico y haz clic en “Enviar código”. Recibirás un código en tu correo.'
                : step === 'otp'
                  ? 'Revisa tu correo. Tu código tiene 5 dígitos.'
                  : 'Crea y confirma una nueva contraseña de al menos 8 caracteres.'}
            </Text>

            {step === 'email' ? (
              <View>
                <View style={styles.field}>
                  <Text style={styles.label}>Correo electrónico</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    placeholderTextColor="#9CA3AF"
                    editable={!submitting}
                  />
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  onPress={sendCode}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={onDark} />
                  ) : (
                    <Text style={styles.buttonText}>Enviar código</Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {step === 'otp' ? (
              <View>
                <OtpInput value={otp} onChange={setOtp} editable={!submitting} />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  onPress={verifyCode}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={onDark} />
                  ) : (
                    <Text style={styles.buttonText}>Enviar verificación</Text>
                  )}
                </Pressable>
                <Text style={styles.footer}>
                  ¿No llegó?{' '}
                  <Text style={styles.link} onPress={sendCode}>
                    Reenviar código
                  </Text>
                </Text>
              </View>
            ) : null}

            {step === 'password' ? (
              <View>
                <View style={styles.field}>
                  <Text style={styles.label}>Nueva clave</Text>
                  <View style={styles.inputWithIcon}>
                    <TextInput
                      style={styles.inputFlex}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor="#9CA3AF"
                      editable={!submitting}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)}>
                      <AppIcon
                        icon={showPassword ? Icons.eyeOff : Icons.eye}
                        size={22}
                        color={text}
                      />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Confirmar clave</Text>
                  <View style={styles.inputWithIcon}>
                    <TextInput
                      style={styles.inputFlex}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showConfirm}
                      placeholder="Repite la contraseña"
                      placeholderTextColor="#9CA3AF"
                      editable={!submitting}
                    />
                    <Pressable onPress={() => setShowConfirm((v) => !v)}>
                      <AppIcon
                        icon={showConfirm ? Icons.eyeOff : Icons.eye}
                        size={22}
                        color={text}
                      />
                    </Pressable>
                  </View>
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  onPress={changePassword}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={onDark} />
                  ) : (
                    <Text style={styles.buttonText}>Cambiar clave</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AuthFeedbackModal
        visible={result === 'success'}
        variant="success"
        title="Recuperación de contraseña exitosa"
        message="Regresa a la pantalla de inicio de sesión para ingresar a la aplicación."
        buttonLabel="Regresar al inicio de sesión"
        colors={branding.colors}
        onAction={() => navigation.navigate('Login')}
      />
      <AuthFeedbackModal
        visible={result === 'error'}
        variant="error"
        title="Recuperación de contraseña salió mal"
        message={error ?? 'Algo salió mal. Inténtalo de nuevo.'}
        buttonLabel="Intentar otra vez"
        colors={branding.colors}
        onAction={() => {
          setResult(null);
          setError(null);
          setStep('email');
          setOtp('');
          setResetToken(null);
          setPassword('');
          setConfirm('');
        }}
      />
    </AuthBackground>
  );
}
