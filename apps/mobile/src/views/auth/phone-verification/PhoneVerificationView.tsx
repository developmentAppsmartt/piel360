import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PhoneOtpSection } from '../../../components/auth/PhoneOtpSection';
import { BrandLogo } from '../../../components/BrandLogo';
import { useAuth } from '../../../context/AuthContext';
import { useBranding } from '../../../context/BrandingContext';
import { useDeviceLayout } from '../../../styles/deviceLayout';
import {
  combinePhoneDigits,
  isValidE164Digits,
  splitPhoneDigits,
} from '../../../lib/phone';
import { ApiError } from '../../../services/api.client';
import { authService } from '../../../services/auth.service';
import { AuthBackground } from '../login/components/AuthBackground';
import { AuthGradientButton } from '../login/components/AuthGradientButton';
import { AUTH_THEME } from '../authTheme';
import { createLoginStyles } from '../login/styles/login.styles';

export function PhoneVerificationView() {
  const branding = useBranding();
  const styles = useMemo(
    () => createLoginStyles(branding.colors),
    [branding.colors],
  );
  const { completePhoneVerification, logout } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useDeviceLayout();
  const scrollMinHeight =
    isTablet && isLandscape
      ? Math.max(height - insets.top - insets.bottom, 480)
      : undefined;

  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState('57');
  const [national, setNational] = useState('');
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const phone = combinePhoneDigits(prefix, national);
  const phoneValid = isValidE164Digits(phone);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authService.meDetails();
        if (cancelled) return;
        const source = me.phone ?? me.doctor?.phone ?? '';
        const split = splitPhoneDigits(source);
        setPrefix(split.prefix);
        setNational(split.national);
      } catch {
        if (!cancelled) setError('No se pudo cargar tu perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirm() {
    setError(null);
    if (!phoneValid) {
      setError('Revisa el prefijo y el número de celular.');
      return;
    }
    if (!phoneTicket) {
      setError('Verifica tu celular con el código SMS.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.confirmPhoneVerification(phone, phoneTicket);
      completePhoneVerification();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo verificar el celular.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={AUTH_THEME.purple} size="large" />
          </View>
        ) : (
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
                <BrandLogo height={120} />
              </View>

              <Text style={styles.brand}>Verifica tu celular</Text>
              <Text style={styles.subtitle}>
                Por seguridad, confirma tu número antes de continuar en la app.
              </Text>

              <PhoneOtpSection
                prefix={prefix}
                national={national}
                onPrefixChange={setPrefix}
                onNationalChange={setNational}
                originalPhoneDigits=""
                phoneTicket={phoneTicket}
                onPhoneTicketChange={setPhoneTicket}
                mode="profile"
                variant="auth"
                disabled={submitting}
                primaryColor={AUTH_THEME.purple}
                onDark={branding.colors.textOnDark}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <AuthGradientButton
                label="Continuar"
                onPress={handleConfirm}
                disabled={submitting || !phoneTicket}
                loading={submitting}
                styles={styles}
              />

              <Pressable onPress={logout} style={{ marginTop: 16 }}>
                <Text style={[styles.link, { textAlign: 'center' }]}>
                  Cerrar sesión
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </AuthBackground>
  );
}
