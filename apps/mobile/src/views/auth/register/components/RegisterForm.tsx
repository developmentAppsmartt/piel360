import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { LocationPicker } from '../../../../components/maps/LocationPicker';
import { BirthDateField } from '../../../../components/BirthDateField';
import { useAuth } from '../../../../context/AuthContext';
import { useBranding } from '../../../../context/BrandingContext';
import {
  isStrongPassword,
  PASSWORD_STRENGTH_HINT,
  PASSWORD_STRENGTH_MESSAGE,
} from '../../../../lib/password';
import { PATIENT_DOC_TYPES, PATIENT_FITZ_OPTIONS } from '../../../../data/patientFormOptions';
import {
  FITZPATRICK_DESCRIPTIONS,
  SURVEY_QUESTIONS,
} from '../../../../data/surveyQuestions';
import { ApiError } from '../../../../services/api.client';
import { patientsService } from '../../../../services/patients.service';
import { EmailOtpSection } from '../../../../components/auth/EmailOtpSection';
import { PhoneOtpSection } from '../../../../components/auth/PhoneOtpSection';
import {
  combinePhoneDigits,
  isValidE164Digits,
} from '../../../../lib/phone';
import { AuthConsent } from '../../login/components/AuthConsent';
import { AuthGradientButton } from '../../login/components/AuthGradientButton';
import { AUTH_THEME } from '../../authTheme';
import { createLoginStyles } from '../../login/styles/login.styles';
import { LegalDocumentModal } from '../../../../components/legal/LegalDocumentModal';
import type { LegalDocId } from '../../../../data/legal/documents';
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
  const [docType, setDocType] = useState<string>('CC');
  const [docNumber, setDocNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('male');
  const [emailTicket, setEmailTicket] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState('57');
  const [phone, setPhone] = useState('');
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [surveyIndex, setSurveyIndex] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);

  const primary = AUTH_THEME.purple;
  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;
  const { width: windowWidth } = useWindowDimensions();
  /** Ancho del banner dentro de la card (padding del scroll ~16×2 + card ~20×2). */
  const bannerWidth = Math.max(200, Math.min(windowWidth - 72, 420));
  const bannerHeight = Math.round(bannerWidth / 2);

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
    if (!isStrongPassword(password)) {
      setError(PASSWORD_STRENGTH_MESSAGE);
      return;
    }
    if (!captcha || !terms) {
      setError('Marca “No soy un robot” y acepta los términos.');
      return;
    }
    if (!emailTicket) {
      setError('Verifica tu correo con el código que te enviamos.');
      return;
    }
    goTo('profile');
  }

  function goProfileNext() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Completa nombres y apellidos.');
      return;
    }
    if (!docType.trim()) {
      setError('Selecciona el tipo de documento.');
      return;
    }
    if (!docNumber.trim()) {
      setError('El número de cédula / documento es obligatorio.');
      return;
    }
    if (docNumber.trim().length < 4) {
      setError('El número de documento debe tener al menos 4 caracteres.');
      return;
    }
    if (birthDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setError('Selecciona una fecha válida en el calendario.');
      return;
    }
    goTo('contact');
  }

  function goContactNext() {
    setError(null);
    const fullPhone = combinePhoneDigits(areaCode, phone);
    if (!isValidE164Digits(fullPhone)) {
      setError('Revisa el prefijo y el número de celular.');
      return;
    }
    if (!phoneTicket) {
      setError('Verifica tu celular con el código SMS.');
      return;
    }
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
      const fullPhone = combinePhoneDigits(areaCode, phone);
      const iso =
        birthDate.trim() && /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())
          ? birthDate.trim()
          : undefined;
      await registerPatient({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        docType: docType.trim(),
        docNumber: docNumber.trim(),
        phone: fullPhone,
        phoneTicket: phoneTicket!,
        emailTicket: emailTicket!,
        ...(iso ? { birthDate: iso } : {}),
        gender: gender || undefined,
        address: location.trim() || undefined,
        ...(lat != null && lng != null ? { lat, lng } : {}),
        skinType: surveyAnswers.skin_type || undefined,
        fitzpatrickType: surveyAnswers.fitzpatrick_type || undefined,
        mascotType: surveyAnswers.mascot_type || undefined,
      });

      const patient = await patientsService.getMyPatient();
      if (patient) {
        // Refuerzo post-registro (por si algún campo no llegó en register).
        await patientsService.update(patient.id, {
          docType: docType.trim(),
          docNumber: docNumber.trim(),
          ...(iso ? { birthDate: iso } : {}),
          gender: gender || undefined,
          areaCode: `+${areaCode.replace(/\D/g, '')}`,
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
          <EmailOtpSection
            email={email}
            emailTicket={emailTicket}
            onEmailTicketChange={setEmailTicket}
            disabled={submitting}
            variant="auth"
            primaryColor={primary}
            onDark={onDark}
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
              placeholder={PASSWORD_STRENGTH_HINT}
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
          <Text style={[styles.stepHint, { marginTop: 6, opacity: 0.85 }]}>
            {PASSWORD_STRENGTH_HINT}
          </Text>
        </View>

        <AuthConsent
          styles={consentStyles}
          primaryColor={primary}
          onDark={onDark}
          captchaChecked={captcha}
          termsChecked={terms}
          onToggleCaptcha={() => setCaptcha((v) => !v)}
          onToggleTerms={() => setTerms((v) => !v)}
          onOpenTerms={() => setLegalDoc('terms')}
          onOpenPrivacy={() => setLegalDoc('privacy')}
          disabled={submitting}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AuthGradientButton
          label="Continuar"
          onPress={goCredentialsNext}
          disabled={submitting}
          loading={submitting}
          styles={consentStyles}
        />

        <Text style={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <Text style={styles.link} onPress={onGoLogin}>
            Inicia sesión
          </Text>
        </Text>

        <LegalDocumentModal
          docId={legalDoc}
          visible={legalDoc != null}
          onClose={() => setLegalDoc(null)}
        />
      </View>
    );
  }

  if (step === 'profile') {
    return (
      <View style={styles.card}>
        <View style={styles.welcomeBannerCard}>
          <Image
            source={require('../../../../../assets/banner.png')}
            style={{ width: bannerWidth, height: bannerHeight }}
            resizeMode="contain"
            accessibilityLabel="Bienvenido a Piel 360 AI"
            accessibilityIgnoresInvertColors
          />
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
          <Text style={styles.labelDark}>Tipo Doc</Text>
          <View style={styles.chips}>
            {PATIENT_DOC_TYPES.map((d) => {
              const active = docType === d;
              return (
                <Pressable
                  key={d}
                  style={[styles.chipDark, active && styles.chipActive]}
                  onPress={() => setDocType(d)}
                  disabled={submitting}
                >
                  <Text
                    style={[
                      styles.chipTextDark,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.labelDark}>Cédula / Nº documento *</Text>
          <TextInput
            style={styles.inputCard}
            value={docNumber}
            onChangeText={setDocNumber}
            placeholder="Número de documento"
            placeholderTextColor="#9CA3AF"
            keyboardType="default"
            autoCapitalize="characters"
            editable={!submitting}
          />
        </View>

        <BirthDateField
          value={birthDate}
          onChange={setBirthDate}
          label="Fecha cumpleaños"
          labelStyle={styles.labelDark}
          fieldStyle={styles.field}
          triggerStyle={styles.inputCard}
          valueStyle={{ color: text }}
          accentColor={primary}
          textColor={text}
          disabled={submitting}
        />

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
          <AuthGradientButton
            label="Siguiente"
            onPress={goProfileNext}
            styles={consentStyles}
            containerStyle={{ flex: 0, minWidth: 140, marginTop: 0 }}
          />
        </View>
      </View>
    );
  }

  if (step === 'contact') {
    return (
      <View style={styles.card}>
        <Text style={styles.stepHintDark}>CONTACTO</Text>

        <View style={styles.field}>
          <Text style={styles.labelDark}>Celular</Text>
          <PhoneOtpSection
            prefix={areaCode}
            national={phone}
            onPrefixChange={setAreaCode}
            onNationalChange={setPhone}
            originalPhoneDigits=""
            phoneTicket={phoneTicket}
            onPhoneTicketChange={setPhoneTicket}
            mode="register"
            variant="card"
            disabled={submitting}
            primaryColor={AUTH_THEME.purple}
          />
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
          <AuthGradientButton
            label="Siguiente"
            onPress={goContactNext}
            disabled={submitting}
            styles={consentStyles}
            containerStyle={{ flex: 1, marginTop: 0 }}
          />
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
          <AuthGradientButton
            label={isLast ? 'Finalizar' : 'Siguiente'}
            onPress={goSurveyNext}
            disabled={!selected || submitting}
            loading={submitting && isLast}
            styles={consentStyles}
            containerStyle={{ flex: 1, marginTop: 0 }}
          />
        </View>
      </View>
    </View>
  );
}
