import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useAuth } from '../../../../context/AuthContext';
import { useBranding } from '../../../../context/BrandingContext';
import { ApiError } from '../../../../services/api.client';
import { AuthConsent } from './AuthConsent';
import { createLoginStyles } from '../styles/login.styles';

type LoginFormProps = {
  onGoRegister: () => void;
  onGoForgotPassword: () => void;
};

export function LoginForm({ onGoRegister, onGoForgotPassword }: LoginFormProps) {
  const { login } = useAuth();
  const branding = useBranding();
  const styles = useMemo(() => createLoginStyles(branding.colors), [branding.colors]);

  const [captcha, setCaptcha] = useState(false);
  const [terms, setTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;

  async function onSubmitSignIn() {
    setError(null);
    if (!captcha || !terms) {
      setError('Marca “No soy un robot” y acepta los términos.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Completa email y contraseña.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View>
      <View style={styles.methodStack}>
        <Pressable
          style={styles.methodBtn}
          onPress={() =>
            Alert.alert(
              'Google',
              'El inicio con Google se conectará en una próxima iteración. Usa email por ahora.',
            )
          }
          disabled={submitting}
        >
          <AppIcon icon={Icons.google} size={20} color="#DB4437" />
          <Text style={styles.methodBtnText}>Continuar con Google</Text>
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="tu@email.com"
          placeholderTextColor="#9CA3AF"
          editable={!submitting}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Clave</Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            style={styles.inputFlex}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={
              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
          >
            <AppIcon
              icon={showPassword ? Icons.eyeOff : Icons.eye}
              size={22}
              color={text}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.forgotRow}>
        <Pressable onPress={onGoForgotPassword} hitSlop={8}>
          <Text style={styles.link}>¿Olvidaste contraseña?</Text>
        </Pressable>
      </View>

      <AuthConsent
        styles={styles}
        primaryColor={primary}
        onDark={onDark}
        captchaChecked={captcha}
        termsChecked={terms}
        onToggleCaptcha={() => setCaptcha((v) => !v)}
        onToggleTerms={() => setTerms((v) => !v)}
        disabled={submitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmitSignIn}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={onDark} />
        ) : (
          <Text style={styles.buttonText}>Acceso</Text>
        )}
      </Pressable>

      <Text style={styles.footer}>
        ¿No tienes una cuenta?{' '}
        <Text style={styles.link} onPress={onGoRegister}>
          Registro
        </Text>
      </Text>

      <Text style={styles.compliance}>GDPR · HIPAA · ISO 13485</Text>
    </View>
  );
}
