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
import { authService } from '../../../../services/auth.service';
import { patientsService } from '../../../../services/patients.service';
import { AuthFeedbackModal } from '../../components/AuthFeedbackModal';
import { OtpInput } from '../../components/OtpInput';
import { AuthConsent } from '../../login/components/AuthConsent';
import { createLoginStyles } from '../../login/styles/login.styles';
import { createRegisterStyles } from '../styles/register.styles';

type RegisterFormProps = {
  onGoLogin: () => void;
};

type Step = 'credentials' | 'otp' | 'profile' | 'contact';

const GENDERS = [
  { value: 'masculine', label: 'Masculino' },
  { value: 'feminine', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
  { value: 'unspecified', label: 'Prefiero no decir' },
] as const;

function normalizeBirthDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = /^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})$/.exec(t);
  if (!m) return null;
  const mm = m[1].padStart(2, '0');
  const dd = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

export function RegisterForm({ onGoLogin }: RegisterFormProps) {
  const { registerPatient } = useAuth();
  const branding = useBranding();
  const styles = useMemo(
    () => createRegisterStyles(branding.colors),
    [branding.colors],
  );
  const consentStyles = useMemo(
    () => createLoginStyles(branding.colors),
    [branding.colors],
  );

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState(false);
  const [terms, setTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailTicket, setEmailTicket] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('masculine');
  const [areaCode, setAreaCode] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);

  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;

  async function goCredentialsNext() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Completa email y contraseña.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!captcha || !terms) {
      setError('Marca “No soy un robot” y acepta los términos.');
      return;
    }
    setSubmitting(true);
    try {
      await authService.sendOtp(email, 'register');
      setOtp('');
      setStep('otp');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar el código. ¿Está el API reiniciado y Redis activo?';
      setError(message);
      Alert.alert('Verificación de correo', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEmailOtp() {
    setError(null);
    if (otp.trim().length !== 5) {
      setError('Introduce el código de 5 dígitos.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authService.verifyOtp(email, 'register', otp);
      if (!res.ticket) {
        throw new Error('Sin ticket de verificación');
      }
      setEmailTicket(res.ticket);
      setVerifyModal(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Código inválido. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goProfileNext() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Completa nombres y apellidos.');
      return;
    }
    if (birthDate.trim() && !normalizeBirthDate(birthDate)) {
      setError('Fecha inválida. Usa AAAA-MM-DD o mm-dd-aaaa.');
      return;
    }
    setStep('contact');
  }

  async function onFinish() {
    setError(null);
    if (!emailTicket) {
      setError('Debes verificar tu correo antes de continuar.');
      setStep('otp');
      return;
    }
    setSubmitting(true);
    try {
      await registerPatient({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailTicket,
      });

      const patient = await patientsService.getMyPatient();
      if (patient) {
        const iso = birthDate.trim()
          ? normalizeBirthDate(birthDate)
          : undefined;
        await patientsService.update(patient.id, {
          ...(iso ? { birthDate: iso } : {}),
          gender: gender || undefined,
          areaCode: areaCode.trim() || undefined,
          phone: phone.trim() || undefined,
          address: location.trim() || undefined,
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      );
      setStep('credentials');
    } finally {
      setSubmitting(false);
    }
  }

  function onAllowLocation() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocation((prev) => prev || 'Ubicación actual permitida');
        },
        () => {
          Alert.alert(
            'Ubicación',
            'No se pudo obtener GPS. Escribe tu ciudad o dirección.',
          );
        },
        { timeout: 8000 },
      );
      return;
    }
    Alert.alert(
      'Ubicación',
      'Escribe tu ciudad o dirección en el campo Localización.',
    );
  }

  if (step === 'credentials') {
    return (
      <View>
        <Text style={styles.stepHint}>PASO 1 DE 4 · CUENTA</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Tu email</Text>
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
          <Text style={styles.label}>Crea tu contraseña</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={styles.inputFlex}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
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

        <AuthConsent
          styles={consentStyles}
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
          onPress={goCredentialsNext}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={onDark} />
          ) : (
            <Text style={styles.buttonText}>CONTINUAR</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <Text style={styles.link} onPress={onGoLogin}>
            Inicia sesión
          </Text>
        </Text>
      </View>
    );
  }

  if (step === 'otp') {
    return (
      <View>
        <Text style={styles.stepHint}>PASO 2 DE 4 · VERIFICAR EMAIL</Text>
        <Text style={styles.welcomeSubtitle}>
          Revisa tu correo para ver el código de 5 dígitos enviado a{' '}
          {email.trim().toLowerCase()}.
        </Text>

        <OtpInput value={otp} onChange={setOtp} editable={!submitting} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={verifyEmailOtp}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={onDark} />
          ) : (
            <Text style={styles.buttonText}>Verificar dirección</Text>
          )}
        </Pressable>

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.buttonSecondary}
            onPress={() => {
              setError(null);
              setStep('credentials');
            }}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
          <Pressable
            style={styles.buttonSecondary}
            onPress={goCredentialsNext}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>Reenviar</Text>
          </Pressable>
        </View>

        <AuthFeedbackModal
          visible={verifyModal}
          variant="success"
          title="Verifica tu dirección de correo electrónico"
          message="Tu correo quedó verificado. Continúa completando tu perfil."
          buttonLabel="Continuar"
          colors={branding.colors}
          onAction={() => {
            setVerifyModal(false);
            setStep('profile');
          }}
        />
      </View>
    );
  }

  if (step === 'profile') {
    return (
      <View>
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeTitle}>¡Bienvenido a Piel 360!</Text>
          <Text style={styles.welcomeSubtitle}>
            Tecnología que te ayuda a conocer mejor tu piel
          </Text>
        </View>

        <Text style={styles.stepHint}>PASO 3 DE 4 · DATOS</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nombres</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            placeholder="Ana"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Apellidos</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            placeholder="García"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Fecha cumpleaños</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="mm - dd - aaaa"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Género</Text>
          <View style={styles.chips}>
            {GENDERS.map((opt) => {
              const active = gender === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setGender(opt.value)}
                  disabled={submitting}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            editable={false}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.footerRow}>
          <Pressable onPress={onGoLogin}>
            <Text style={styles.footerLink}>Tengo una cuenta</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { flex: 0, minWidth: 140, marginTop: 0 }]}
            onPress={goProfileNext}
          >
            <Text style={styles.buttonText}>Siguiente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.stepHint}>PASO 4 DE 4 · CONTACTO</Text>

      <View style={styles.row}>
        <View style={[styles.field, styles.areaCode]}>
          <Text style={styles.label}>Código área</Text>
          <TextInput
            style={styles.input}
            value={areaCode}
            onChangeText={setAreaCode}
            keyboardType="phone-pad"
            placeholder="+57"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
        </View>
        <View style={[styles.field, styles.phoneFlex]}>
          <Text style={styles.label}>Teléfono</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={styles.inputFlex}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="3001234567"
              placeholderTextColor="#9CA3AF"
              editable={!submitting}
            />
            {phone.trim().length >= 7 ? (
              <AppIcon icon={Icons.check} size={20} color="#16A34A" />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.labelInline}>Localización</Text>
          <Pressable onPress={onAllowLocation}>
            <Text style={styles.allowLink}>Permitir</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Ciudad o dirección"
          placeholderTextColor="#9CA3AF"
          editable={!submitting}
        />
        <Pressable
          onPress={() =>
            Alert.alert(
              '¿Por qué es esto importante?',
              'La localización ayuda a contextualizar recomendaciones y citas cercanas. Puedes escribirla manualmente.',
            )
          }
        >
          <Text style={styles.whyLink}>¿Por qué es esto importante?</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable
          style={styles.buttonSecondary}
          onPress={() => {
            setError(null);
            setStep('profile');
          }}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onFinish}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={onDark} />
          ) : (
            <Text style={styles.buttonText}>Siguiente</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
