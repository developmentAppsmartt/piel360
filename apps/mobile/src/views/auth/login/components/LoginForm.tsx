import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useAuth } from '../../../../context/AuthContext';
import { useBranding } from '../../../../context/BrandingContext';
import { ApiError } from '../../../../services/api.client';
import { AuthConsent } from './AuthConsent';
import { AuthGradientButton } from './AuthGradientButton';
import { LoginIconField } from './LoginIconField';
import { AUTH_THEME } from '../../authTheme';
import { createLoginStyles } from '../styles/login.styles';

type LoginFormProps = {
  onGoRegister: () => void;
  onGoForgotPassword: () => void;
};

export function LoginForm({ onGoRegister, onGoForgotPassword }: LoginFormProps) {
  const { login, loginWithGoogle } = useAuth();
  const branding = useBranding();
  const styles = useMemo(() => createLoginStyles(branding.colors), [branding.colors]);

  const [captcha, setCaptcha] = useState(false);
  const [terms, setTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const primary = AUTH_THEME.purple;
  const onDark = branding.colors.textOnDark;

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
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
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

  async function onGoogleSignIn() {
    setError(null);
    if (!captcha || !terms) {
      setError('Marca “No soy un robot” y acepta los términos.');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err instanceof ApiError && err.status === 499) {
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo iniciar sesión con Google.',
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
          onPress={onGoogleSignIn}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#DB4437" />
          ) : (
            <AppIcon icon={Icons.google} size={20} color="#DB4437" />
          )}
          <Text style={styles.methodBtnText}>Continuar con Google</Text>
        </Pressable>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o continúa con tu cuenta</Text>
        <View style={styles.dividerLine} />
      </View>

      <LoginIconField
        styles={styles}
        label="Correo electrónico"
        icon={Icons.mail}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="tu@correo.com"
        editable={!submitting}
      />

      <LoginIconField
        styles={styles}
        label="Contraseña"
        icon={Icons.lock}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoComplete="password"
        textContentType="password"
        placeholder="••••••••"
        editable={!submitting}
        endAdornment={
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            accessibilityLabel={
              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
          >
            <AppIcon
              icon={showPassword ? Icons.eyeOff : Icons.eye}
              size={20}
              color="#64748B"
            />
          </Pressable>
        }
      />

      <View style={styles.forgotRow}>
        <Pressable onPress={onGoForgotPassword} hitSlop={8}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
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

      <View style={styles.featureRow}>
        <View style={[styles.featureCard, styles.featureCardBorder]}>
          <AppIcon icon={Icons.clipboardCheck} size={20} color={AUTH_THEME.accent} />
          <Text style={styles.featureTitle}>Seguro y confiable</Text>
          <Text style={styles.featureText}>
            Tus datos están protegidos con los más altos estándares.
          </Text>
        </View>
        <View style={styles.featureCard}>
          <AppIcon icon={Icons.heartPulse} size={20} color={AUTH_THEME.accent} />
          <Text style={styles.featureTitle}>Resultados medibles</Text>
          <Text style={styles.featureText}>
            Información precisa para decisiones más inteligentes.
          </Text>
        </View>
      </View>

      <AuthGradientButton
        label="Iniciar sesión"
        onPress={onSubmitSignIn}
        disabled={submitting}
        loading={submitting}
        styles={styles}
      />

      <Text style={styles.footer}>
        ¿No tienes una cuenta?{' '}
        <Text style={styles.link} onPress={onGoRegister}>
          Regístrate
        </Text>
      </Text>

      <View style={styles.complianceRow}>
        <AppIcon icon={Icons.lock} size={12} color="rgba(255,255,255,0.55)" />
        <Text style={styles.compliance}>Cumplimos con GDPR · HIPAA · ISO 13485</Text>
      </View>
    </View>
  );
}
