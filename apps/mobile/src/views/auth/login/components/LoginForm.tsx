import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
// import { ComplianceBadges } from '../../../../components/legal/ComplianceBadges';
import { LegalDocumentModal } from '../../../../components/legal/LegalDocumentModal';
import { isRecaptchaNativeReady } from '../../../../config/recaptcha';
import { useAuth } from '../../../../context/AuthContext';
import { useBranding } from '../../../../context/BrandingContext';
import type { LegalDocId } from '../../../../data/legal/documents';
import { ApiError } from '../../../../services/api.client';
import {
  getRecaptchaToken,
  isRecaptchaSdkLinked,
} from '../../../../services/recaptcha-native.service';
import { useDeviceLayout } from '../../../../styles/deviceLayout';
import { AuthConsent } from './AuthConsent';
import { AuthGradientButton } from './AuthGradientButton';
import { LoginIconField } from './LoginIconField';
import { createLoginStyles } from '../styles/login.styles';

const POWERED_BY_LOGO = require('../../../../../assets/logo-piel360-report.png');

type LoginFormProps = {
  onGoRegister: () => void;
  onGoForgotPassword: () => void;
};

export function LoginForm({ onGoRegister, onGoForgotPassword }: LoginFormProps) {
  const { login, loginWithGoogle } = useAuth();
  const branding = useBranding();
  const { isTablet, isLandscape } = useDeviceLayout();
  const styles = useMemo(() => createLoginStyles(branding.colors), [branding.colors]);
  const poweredByLogoSize = isTablet
    ? isLandscape
      ? { width: 168, height: 62 }
      : { width: 200, height: 74 }
    : { width: 132, height: 48 };
  const poweredByLabelSize = isTablet ? (isLandscape ? 14 : 16) : 13;

  const [terms, setTerms] = useState(false);

  async function resolveCaptchaToken(): Promise<string> {
    if (!isRecaptchaNativeReady()) return '';
    // En Expo Go / Metro sin native module el SDK no existe.
    if (__DEV__ && !isRecaptchaSdkLinked()) {
      console.warn(
        '[recaptcha] SDK no enlazado: login sin captcha en desarrollo. Usa expo run:android.',
      );
      return '';
    }
    return (await getRecaptchaToken('LOGIN')).trim();
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const featureIconColor =
    branding.colors.iconMuted === branding.colors.icon
      ? branding.colors.icon
      : branding.colors.loginAccent;

  function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function loginErrorMessage(err: unknown): string {
    if (!(err instanceof ApiError)) {
      return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
    }
    const msg = err.message.trim();
    const lower = msg.toLowerCase();
    if (
      err.status === 401 ||
      lower.includes('credenciales') ||
      lower.includes('unauthorized') ||
      lower.includes('invalid credentials')
    ) {
      return 'Correo o contraseña incorrectos.';
    }
    return msg || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }

  async function onSubmitSignIn() {
    setError(null);
    if (!terms) {
      setError('Debes aceptar los Términos y Condiciones.');
      return;
    }
    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError('Completa el correo y la contraseña.');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      setError('El correo no tiene un formato válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      let captchaToken: string | undefined;
      if (isRecaptchaNativeReady()) {
        try {
          const token = await resolveCaptchaToken();
          if (token) captchaToken = token;
          else if (!__DEV__ || isRecaptchaSdkLinked()) {
            setError('No se pudo verificar reCAPTCHA. Inténtalo de nuevo.');
            return;
          }
        } catch (captchaErr) {
          const detail =
            captchaErr instanceof Error
              ? captchaErr.message
              : 'No se pudo verificar reCAPTCHA.';
          // Dev sin build nativo: no bloquear login.
          if (__DEV__ && !isRecaptchaSdkLinked()) {
            console.warn('[recaptcha]', detail);
          } else {
            setError(detail);
            return;
          }
        }
      }
      await login({
        email: emailTrimmed.toLowerCase(),
        password,
        ...(captchaToken ? { captchaToken } : {}),
      });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    if (!terms) {
      setError('Debes aceptar los Términos y Condiciones.');
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
              color={branding.colors.iconMuted}
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
        termsChecked={terms}
        onToggleTerms={() => setTerms((v) => !v)}
        onOpenTerms={() => setLegalDoc('terms')}
        onOpenPrivacy={() => setLegalDoc('privacy')}
        disabled={submitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AuthGradientButton
        label="Iniciar sesión"
        onPress={onSubmitSignIn}
        disabled={submitting}
        loading={submitting}
        styles={styles}
      />

      <View style={styles.featureRow}>
        <View style={[styles.featureCard, styles.featureCardBorder]}>
          <AppIcon icon={Icons.clipboardCheck} size={18} color={featureIconColor} />
          <Text style={styles.featureTitle}>Seguro y confiable</Text>
          <Text style={styles.featureText}>
            Tus datos están protegidos con los más altos estándares.
          </Text>
        </View>
        <View style={styles.featureCard}>
          <AppIcon icon={Icons.heartPulse} size={18} color={featureIconColor} />
          <Text style={styles.featureTitle}>Resultados medibles</Text>
          <Text style={styles.featureText}>
            Información precisa para decisiones más inteligentes.
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        ¿No tienes una cuenta?{' '}
        <Text style={styles.link} onPress={onGoRegister}>
          Regístrate
        </Text>
      </Text>

      <View style={styles.poweredBy} accessibilityRole="text">
        <Text style={[styles.poweredByLabel, { fontSize: poweredByLabelSize }]}>
          POWERED BY
        </Text>
        <Image
          source={POWERED_BY_LOGO}
          style={[styles.poweredByLogo, poweredByLogoSize]}
          resizeMode="contain"
          accessibilityLabel="Piel 360"
        />
      </View>

      {/* Oculto por temas legales: aún no se cuenta con estas certificaciones.
      <View style={styles.complianceBlock}>
        <View style={styles.complianceRow}>
          <AppIcon icon={Icons.lock} size={12} color="rgba(255,255,255,0.55)" />
          <Text style={styles.compliance}>
            Cumplimiento normativo
          </Text>
        </View>
        <ComplianceBadges variant="dark" />
      </View>
      */}

      <LegalDocumentModal
        docId={legalDoc}
        visible={legalDoc != null}
        onClose={() => setLegalDoc(null)}
      />
    </View>
  );
}
