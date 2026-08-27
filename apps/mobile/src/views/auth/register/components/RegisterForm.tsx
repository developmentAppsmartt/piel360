import { useEffect, useMemo, useState } from 'react';
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
import { LocationPicker } from '../../../../components/maps/LocationPicker';
import { useAuth } from '../../../../context/AuthContext';
import { useBranding } from '../../../../context/BrandingContext';
import { PATIENT_FITZ_OPTIONS } from '../../../../data/patientFormOptions';
import {
  FITZPATRICK_DESCRIPTIONS,
  SURVEY_QUESTIONS,
} from '../../../../data/surveyQuestions';
import { ApiError } from '../../../../services/api.client';
import { patientsService } from '../../../../services/patients.service';
import { AuthConsent } from '../../login/components/AuthConsent';
import { createLoginStyles } from '../../login/styles/login.styles';
import { createRegisterStyles } from '../styles/register.styles';
import { SkinIntroStep } from './SkinIntroStep';
import { SurveyOptionList } from './SurveyOptionList';
import { SurveyProgressDots } from './SurveyProgressDots';

export type RegisterStep =
  | 'credentials'
  | 'profile'
  | 'contact'
  | 'skinIntro'
  | 'survey';

type RegisterFormProps = {
  onGoLogin: () => void;
  onStepChange?: (step: RegisterStep) => void;
};

const GENDERS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
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

export function RegisterForm({ onGoLogin, onStepChange }: RegisterFormProps) {
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

  const [step, setStep] = useState<RegisterStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captcha, setCaptcha] = useState(false);
  const [terms, setTerms] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('male');
  const [areaCode, setAreaCode] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  function goTo(next: RegisterStep) {
    setError(null);
    setStep(next);
  }

  function goCredentialsNext() {
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
    // OTP desactivado hasta integrar correo/Redis; ir directo a perfil.
    goTo('profile');
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
    goTo('contact');
  }

  function goContactNext() {
    goTo('skinIntro');
  }

  async function onFinish() {
    setError(null);
    const current = SURVEY_QUESTIONS[surveyIndex];
    if (!surveyAnswers[current.key]) {
      setError('Selecciona una opción para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      await registerPatient({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
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
          ...(lat != null && lng != null ? { lat, lng } : {}),
          skinType: surveyAnswers.skin_type || undefined,
          fitzpatrickType: surveyAnswers.fitzpatrick_type || undefined,
          mascotType: surveyAnswers.mascot_type || undefined,
        });
      }

      await patientsService.submitSurvey({
        skinType: surveyAnswers.skin_type,
        fitzpatrickType: surveyAnswers.fitzpatrick_type,
        surveyResponses: surveyAnswers,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function selectSurveyOption(value: string) {
    const key = SURVEY_QUESTIONS[surveyIndex].key;
    setSurveyAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function goSurveyNext() {
    const current = SURVEY_QUESTIONS[surveyIndex];
    if (!surveyAnswers[current.key]) {
      setError('Selecciona una opción para continuar.');
      return;
    }
    setError(null);
    if (surveyIndex >= SURVEY_QUESTIONS.length - 1) {
      void onFinish();
      return;
    }
    setSurveyIndex((i) => i + 1);
  }

  function goSurveyBack() {
    setError(null);
    if (surveyIndex === 0) {
      goTo('skinIntro');
      return;
    }
    setSurveyIndex((i) => i - 1);
  }

  if (step === 'credentials') {
    return (
      <View>
        <Text style={styles.stepHint}>PASO 1 · CUENTA</Text>

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

  if (step === 'profile') {
    return (
      <View style={styles.card}>
        <View style={styles.welcomeBannerCard}>
          <Text style={styles.welcomeTitle}>¡Bienvenido a Piel 360!</Text>
          <Text style={styles.welcomeSubtitle}>
            Apoyo Diagnóstico Dermatológico con AI
          </Text>
        </View>

        <Text style={styles.stepHintDark}>DATOS PERSONALES</Text>

        <View style={styles.field}>
          <Text style={styles.labelDark}>Nombres</Text>
          <TextInput
            style={styles.inputCard}
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
          <Text style={styles.labelDark}>Apellidos</Text>
          <TextInput
            style={styles.inputCard}
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
          <Text style={styles.labelDark}>Fecha cumpleaños</Text>
          <TextInput
            style={styles.inputCard}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="mm - dd - aaaa"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.labelDark}>Género</Text>
          <View style={styles.chips}>
            {GENDERS.map((opt) => {
              const active = gender === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.chipDark,
                    active && styles.chipActive,
                  ]}
                  onPress={() => setGender(opt.value)}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.chipTextDark,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.labelDark}>Correo electrónico</Text>
          <TextInput style={styles.inputCard} value={email} editable={false} />
        </View>

        {error ? <Text style={styles.errorDark}>{error}</Text> : null}

        <View style={styles.footerRow}>
          <Pressable onPress={onGoLogin}>
            <Text style={styles.footerLinkDark}>Tengo una cuenta</Text>
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

  if (step === 'contact') {
    return (
      <View style={styles.card}>
        <Text style={styles.stepHintDark}>CONTACTO</Text>

        <View style={styles.row}>
          <View style={[styles.field, styles.areaCode]}>
            <Text style={styles.labelDark}>Código área</Text>
            <TextInput
              style={styles.inputCard}
              value={areaCode}
              onChangeText={setAreaCode}
              keyboardType="phone-pad"
              placeholder="+57"
              placeholderTextColor="#9CA3AF"
              editable={!submitting}
            />
          </View>
          <View style={[styles.field, styles.phoneFlex]}>
            <Text style={styles.labelDark}>Teléfono</Text>
            <View style={styles.inputWithIconCard}>
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
          <LocationPicker
            variant="auth"
            disabled={submitting}
            value={{ address: location, lat, lng }}
            onChange={(next) => {
              setLocation(next.address);
              setLat(next.lat);
              setLng(next.lng);
            }}
          />
          <Pressable
            onPress={() =>
              Alert.alert(
                '¿Por qué es esto importante?',
                'La localización ayuda a contextualizar recomendaciones y citas cercanas. Puedes buscarla o marcarla en el mapa.',
              )
            }
          >
            <Text style={styles.whyLinkDark}>¿Por qué es esto importante?</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorDark}>{error}</Text> : null}

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.buttonSecondaryCard}
            onPress={() => goTo('profile')}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={goContactNext}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>Siguiente</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'skinIntro') {
    return (
      <SkinIntroStep
        styles={styles}
        onStart={() => {
          setSurveyIndex(0);
          goTo('survey');
        }}
      />
    );
  }

  const currentQ = SURVEY_QUESTIONS[surveyIndex];
  const selected = surveyAnswers[currentQ.key];
  const isLast = surveyIndex === SURVEY_QUESTIONS.length - 1;
  const fitzOptions =
    currentQ.key === 'fitzpatrick_type'
      ? currentQ.options.map((opt) => {
          const fitz = PATIENT_FITZ_OPTIONS.find((f) => f.value === opt.value);
          return {
            value: opt.value,
            label: fitz
              ? `${opt.value}: ${fitz.hint}`
              : opt.label,
            color: fitz?.color,
          };
        })
      : currentQ.options;

  return (
    <View>
      <SurveyProgressDots
        total={SURVEY_QUESTIONS.length}
        current={surveyIndex}
        styles={styles}
      />
      <View style={styles.card}>
        <Text style={styles.surveyQuestion}>{currentQ.question}</Text>
        {currentQ.key === 'fitzpatrick_type' ? (
          <Text style={[styles.stepHintDark, { marginBottom: 8 }]}>
            Selecciona la opción más cercana
          </Text>
        ) : null}

        <SurveyOptionList
          options={fitzOptions}
          value={selected}
          onChange={selectSurveyOption}
          styles={styles}
          disabled={submitting}
        />

        {currentQ.key === 'fitzpatrick_type' && selected ? (
          <Text style={styles.surveyHint}>
            {FITZPATRICK_DESCRIPTIONS[selected]}
          </Text>
        ) : null}

        {error ? <Text style={styles.errorDark}>{error}</Text> : null}

        <View style={styles.buttonRow}>
          <Pressable
            style={styles.buttonSecondaryCard}
            onPress={goSurveyBack}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              (!selected || submitting) && styles.buttonDisabled,
            ]}
            onPress={goSurveyNext}
            disabled={!selected || submitting}
          >
            {submitting && isLast ? (
              <ActivityIndicator color={onDark} />
            ) : (
              <Text style={styles.buttonText}>
                {isLast ? 'Finalizar' : 'Siguiente'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
