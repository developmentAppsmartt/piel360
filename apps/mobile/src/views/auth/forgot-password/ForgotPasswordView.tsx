import { useMemo, useState } from 'react';
import {
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
import { PhoneSplitInputs } from '../../../components/auth/PhoneSplitInputs';
import { BrandLogo } from '../../../components/BrandLogo';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { combinePhoneDigits, isValidE164Digits } from '../../../lib/phone';
import type { AuthStackParamList } from '../../../navigation/RootNavigator';
import { ApiError } from '../../../services/api.client';
import { authService } from '../../../services/auth.service';
import { AuthFeedbackModal } from '../components/AuthFeedbackModal';
import { OtpInput } from '../components/OtpInput';
import { AuthBackground } from '../login/components/AuthBackground';
import { AuthGradientButton } from '../login/components/AuthGradientButton';
import { createLoginStyles } from '../login/styles/login.styles';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

type Channel = 'email' | 'phone';
type Step = 'channel' | 'identity' | 'otp' | 'password';

type ChangePasswordFlowProps = {
  onBack: () => void;
  onSuccess: () => void;
  /** Prefill cuando el usuario ya está logueado. */
  initialEmail?: string;
  initialPhoneDigits?: string | null;
  title?: string;
};

export function ChangePasswordFlow({
  onBack,
  onSuccess,
  initialEmail = '',
  initialPhoneDigits = null,
  title = 'Recuperar contraseña',
}: ChangePasswordFlowProps) {
  const branding = useBranding();
  const { logout } = useAuth();
  const styles = useMemo(
    () => createLoginStyles(branding.colors),
    [branding.colors],
  );

  const [step, setStep] = useState<Step>('channel');
  const [channel, setChannel] = useState<Channel>('email');
  const [email, setEmail] = useState(initialEmail);
  const [areaCode, setAreaCode] = useState('57');
  const [phone, setPhone] = useState(() => {
    if (!initialPhoneDigits) return '';
    const digits = initialPhoneDigits.replace(/\D/g, '');
    if (digits.startsWith('57') && digits.length >= 12) return digits.slice(2);
    return digits;
  });
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
  const passwordUnlocked = Boolean(resetToken);

  function goBack() {
    setError(null);
    if (step === 'channel') {
      onBack();
      return;
    }
    if (step === 'identity') {
      setStep('channel');
      return;
    }
    if (step === 'otp') {
      setStep('identity');
      setOtp('');
      return;
    }
    setStep('otp');
    setPassword('');
    setConfirm('');
  }

  async function sendCode() {
    setError(null);
    if (channel === 'email') {
      if (!email.trim()) {
        setError('Introduce tu correo electrónico.');
        return;
      }
    } else {
      const fullPhone = combinePhoneDigits(areaCode, phone);
      if (!isValidE164Digits(fullPhone)) {
        setError('Revisa el prefijo y el número de celular.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (channel === 'email') {
        await authService.sendOtp(email.trim().toLowerCase(), 'reset');
      } else {
        await authService.sendPhoneOtp(
          combinePhoneDigits(areaCode, phone),
          'reset',
        );
      }
      setOtp('');
      setResetToken(null);
      setPassword('');
      setConfirm('');
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
      let token: string | undefined;
      if (channel === 'email') {
        const res = await authService.verifyOtp(
          email.trim().toLowerCase(),
          'reset',
          otp,
        );
        token = res.token;
      } else {
        const res = await authService.verifyPhoneOtp(
          combinePhoneDigits(areaCode, phone),
          otp,
          'reset',
        );
        token = res.token;
      }
      if (!token) {
        throw new Error('Sin token de recuperación');
      }
      setResetToken(token);
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
      setError('Valida el código OTP antes de cambiar la contraseña.');
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

  const subtitle =
    step === 'channel'
      ? 'Elige cómo quieres recibir el código de verificación.'
      : step === 'identity'
        ? channel === 'email'
          ? 'Introduce tu correo y enviaremos un código OTP.'
          : 'Introduce tu celular y enviaremos un código OTP por SMS.'
        : step === 'otp'
          ? channel === 'email'
            ? 'Revisa tu correo. Tu código tiene 5 dígitos.'
            : 'Revisa tus SMS. Tu código tiene 5 dígitos.'
          : 'Crea y confirma una nueva contraseña de al menos 8 caracteres.';

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
            <Pressable onPress={goBack}>
              <Text style={styles.backLink}>← Volver</Text>
            </Pressable>

            <BrandLogo height={44} style={styles.logo} />
            <Text style={[styles.subtitle, { marginBottom: 8 }]}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {step === 'channel' ? (
              <View style={{ gap: 12, marginTop: 8 }}>
                <Pressable
                  style={[
                    styles.input,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: channel === 'email' ? 2 : 0,
                      borderColor: branding.colors.textOnDark,
                    },
                  ]}
                  onPress={() => setChannel('email')}
                >
                  <AppIcon icon={Icons.mail} size={22} color={text} />
                  <Text style={{ color: text, fontWeight: '700', flex: 1 }}>
                    Enviar OTP al correo
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.input,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: channel === 'phone' ? 2 : 0,
                      borderColor: branding.colors.textOnDark,
                    },
                  ]}
                  onPress={() => setChannel('phone')}
                >
                  <AppIcon icon={Icons.phone} size={22} color={text} />
                  <Text style={{ color: text, fontWeight: '700', flex: 1 }}>
                    Enviar OTP al celular
                  </Text>
                </Pressable>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <AuthGradientButton
                  label="Continuar"
                  onPress={() => {
                    setError(null);
                    setStep('identity');
                  }}
                  styles={styles}
                />
              </View>
            ) : null}

            {step === 'identity' ? (
              <View>
                {channel === 'email' ? (
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
                ) : (
                  <View style={styles.field}>
                    <Text style={styles.label}>Celular</Text>
                    <PhoneSplitInputs
                      prefix={areaCode}
                      national={phone}
                      onPrefixChange={setAreaCode}
                      onNationalChange={setPhone}
                      disabled={submitting}
                    />
                  </View>
                )}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <AuthGradientButton
                  label="Enviar código"
                  onPress={() => void sendCode()}
                  disabled={submitting}
                  loading={submitting}
                  styles={styles}
                />
              </View>
            ) : null}

            {step === 'otp' ? (
              <View>
                <OtpInput value={otp} onChange={setOtp} editable={!submitting} />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <AuthGradientButton
                  label="Validar código"
                  onPress={() => void verifyCode()}
                  disabled={submitting || otp.trim().length !== 5}
                  loading={submitting}
                  styles={styles}
                />
                <Text style={styles.footer}>
                  ¿No llegó?{' '}
                  <Text style={styles.link} onPress={() => void sendCode()}>
                    Reenviar código
                  </Text>
                </Text>
              </View>
            ) : null}

            {step === 'password' ? (
              <View>
                {!passwordUnlocked ? (
                  <Text style={styles.error}>
                    Primero debes validar el código OTP.
                  </Text>
                ) : null}
                <View style={styles.field}>
                  <Text style={styles.label}>Nueva contraseña</Text>
                  <View style={styles.inputWithIcon}>
                    <TextInput
                      style={styles.inputFlex}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor="#9CA3AF"
                      editable={!submitting && passwordUnlocked}
                      autoComplete="new-password"
                      textContentType="newPassword"
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
                  <Text style={styles.label}>Confirmar contraseña</Text>
                  <View style={styles.inputWithIcon}>
                    <TextInput
                      style={styles.inputFlex}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!showConfirm}
                      placeholder="Repite la contraseña"
                      placeholderTextColor="#9CA3AF"
                      editable={!submitting && passwordUnlocked}
                      autoComplete="new-password"
                      textContentType="newPassword"
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
                {password.length > 0 &&
                confirm.length > 0 &&
                password !== confirm ? (
                  <Text style={styles.error}>Las contraseñas no coinciden.</Text>
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <AuthGradientButton
                  label="Validar y cambiar contraseña"
                  onPress={() => void changePassword()}
                  disabled={
                    submitting ||
                    !passwordUnlocked ||
                    password.length < 8 ||
                    password !== confirm
                  }
                  loading={submitting}
                  styles={styles}
                />
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AuthFeedbackModal
        visible={result === 'success'}
        variant="success"
        title="Contraseña actualizada"
        message="Tu sesión se cerró. Inicia sesión de nuevo con tu nueva contraseña."
        buttonLabel="Ir a iniciar sesión"
        colors={branding.colors}
        onAction={() => {
          setResult(null);
          void (async () => {
            await logout();
            onSuccess();
          })();
        }}
      />
        message={error ?? 'Algo salió mal. Inténtalo de nuevo.'}
        buttonLabel="Intentar otra vez"
        colors={branding.colors}
        onAction={() => {
          setResult(null);
          setError(null);
          setStep('channel');
          setOtp('');
          setResetToken(null);
          setPassword('');
          setConfirm('');
        }}
      />
    </AuthBackground>
  );
}

export function ForgotPasswordView({ navigation }: Props) {
  return (
    <ChangePasswordFlow
      title="Recuperar contraseña"
      onBack={() => navigation.navigate('Login')}
      onSuccess={() => navigation.navigate('Login')}
    />
  );
}
