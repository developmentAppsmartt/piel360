import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { LocationPicker } from '../../../../components/maps/LocationPicker';
import { useBranding } from '../../../../context/BrandingContext';
import { resolveLatestFitzpatrickType } from '../../../../data/fitzpatrickLabels';
import {
  PATIENT_DOC_TYPES,
  PATIENT_FITZ_OPTIONS,
  PATIENT_GENDER_OPTIONS,
  PATIENT_MASCOT_OPTIONS,
  PATIENT_SKIN_OPTIONS,
} from '../../../../data/patientFormOptions';
import { ApiError } from '../../../../services/api.client';
import {
  patientsService,
  type UpdatePatientInput,
} from '../../../../services/patients.service';
import { PhoneOtpSection } from '../../../../components/auth/PhoneOtpSection';
import { PhoneSplitInputs } from '../../../../components/auth/PhoneSplitInputs';
import {
  combinePhoneDigits,
  splitPhoneDigits,
} from '../../../../lib/phone';
import type { PatientAnalysisSummary } from '../../../../types/analysis';
import type { PatientProfile } from '../../../../types/patient';
import { chronologicalAgeYears } from '../../../../data/skinAge';
import {
  PatientActivityFields,
  PatientBirthTypeField,
} from '../../../doctor/create-patient/components/PatientLifestyleFields';
import { createEditProfileStyles } from '../styles/editProfile.styles';

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

type EditProfileFormProps = {
  patient: PatientProfile;
  onSubmit: (input: UpdatePatientInput) => Promise<void>;
  /** Si false, el correo se muestra pero no se puede editar ni enviar. */
  emailEditable?: boolean;
  /** Historial ya cargado (evita un fetch extra desde detalle del paciente). */
  analyses?: PatientAnalysisSummary[];
  /** Si true (default), al cambiar celular pide OTP por SMS. */
  requirePhoneOtp?: boolean;
};

export function EditProfileForm({
  patient,
  onSubmit,
  emailEditable = true,
  analyses,
  requirePhoneOtp = true,
}: EditProfileFormProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createEditProfileStyles(branding.colors),
    [branding.colors],
  );

  const initialPhone = combinePhoneDigits(
    patient.areaCode ?? '57',
    patient.phone ?? '',
  );
  const initialSplit = splitPhoneDigits(initialPhone);

  const [firstName, setFirstName] = useState(patient.firstName ?? '');
  const [lastName, setLastName] = useState(patient.lastName ?? '');
  const [email, setEmail] = useState(patient.email ?? '');
  const [phonePrefix, setPhonePrefix] = useState(initialSplit.prefix);
  const [phoneNational, setPhoneNational] = useState(initialSplit.national);
  const [originalPhoneDigits, setOriginalPhoneDigits] = useState(initialPhone);
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [docType, setDocType] = useState(patient.docType ?? 'CC');
  const [docNumber, setDocNumber] = useState(patient.docNumber ?? '');
  const [birthDate, setBirthDate] = useState(toDateInput(patient.birthDate));
  const [gender, setGender] = useState(patient.gender ?? '');
  const [address, setAddress] = useState(patient.address ?? '');
  const [lat, setLat] = useState<number | null>(() => toCoord(patient.lat));
  const [lng, setLng] = useState<number | null>(() => toCoord(patient.lng));
  const [mascotType, setMascotType] = useState(patient.mascotType ?? '');
  const [birthType, setBirthType] = useState(patient.birthType ?? '');
  const [exerciseHabit, setExerciseHabit] = useState(patient.exerciseHabit ?? '');
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState(
    patient.exerciseDaysPerWeek ?? '',
  );
  const [exerciseSessionDuration, setExerciseSessionDuration] = useState(
    patient.exerciseSessionDuration ?? '',
  );
  const [skinType, setSkinType] = useState(patient.skinType ?? '');
  const [fitzpatrickType, setFitzpatrickType] = useState(() =>
    resolveLatestFitzpatrickType(patient, analyses ?? []),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (analyses) {
      const resolved = resolveLatestFitzpatrickType(patient, analyses);
      if (resolved) setFitzpatrickType(resolved);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const list = await patientsService.listAnalyses(patient.id);
        if (cancelled) return;
        const resolved = resolveLatestFitzpatrickType(patient, list);
        if (resolved) setFitzpatrickType(resolved);
      } catch {
        // Mantener el valor del perfil si el historial no carga.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patient.id, patient.fitzpatrickType, analyses]);

  const primary = branding.colors.primary;
  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;
  const fitzHint = PATIENT_FITZ_OPTIONS.find(
    (f) => f.value === fitzpatrickType,
  )?.hint;

  async function handleSave() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nombre y apellido son obligatorios.');
      return;
    }
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setError('Fecha inválida. Usa el formato AAAA-MM-DD.');
      return;
    }

    const fullPhone = combinePhoneDigits(phonePrefix, phoneNational);
    const phoneChanged = fullPhone !== originalPhoneDigits;
    if (requirePhoneOtp && phoneChanged && !phoneTicket) {
      setError('Verifica tu nuevo celular con el código SMS antes de guardar.');
      return;
    }

    const input: UpdatePatientInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: optional(phoneNational),
      areaCode: optional(`+${phonePrefix.replace(/\D/g, '')}`),
      ...(requirePhoneOtp && phoneChanged && phoneTicket
        ? { phoneTicket }
        : {}),
      docType: optional(docType),
      docNumber: optional(docNumber),
      address: optional(address),
      ...(lat != null && lng != null ? { lat, lng } : {}),
      birthDate: optional(birthDate),
      gender: optional(gender),
      birthType: optional(birthType),
      mascotType: optional(mascotType),
      exerciseHabit: optional(exerciseHabit),
      exerciseDaysPerWeek: optional(exerciseDaysPerWeek),
      exerciseSessionDuration: optional(exerciseSessionDuration),
      skinType: optional(skinType),
      fitzpatrickType: optional(fitzpatrickType),
    };
    if (emailEditable) {
      input.email = optional(email);
    }

    setSubmitting(true);
    try {
      await onSubmit(input);
      if (fullPhone) {
        setOriginalPhoneDigits(fullPhone);
        setPhoneTicket(null);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo guardar el perfil. Inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos personales</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nombres</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            editable={!submitting}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Apellidos</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tipo identificación</Text>
          <View style={styles.chips}>
            {PATIENT_DOC_TYPES.map((d) => {
              const active = docType === d;
              return (
                <Pressable
                  key={d}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDocType(d)}
                  disabled={submitting}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>No. Identificación</Text>
          <TextInput
            style={styles.input}
            value={docNumber}
            onChangeText={setDocNumber}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sexo</Text>
          <View style={styles.chips}>
            {PATIENT_GENDER_OPTIONS.map((g) => {
              const active = gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setGender(g.value)}
                  disabled={submitting}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Celular</Text>
          {requirePhoneOtp ? (
            <>
              <Text style={styles.hint}>
                Si cambias el número, te enviaremos un código SMS para
                verificarlo.
              </Text>
              <PhoneOtpSection
                prefix={phonePrefix}
                national={phoneNational}
                onPrefixChange={setPhonePrefix}
                onNationalChange={setPhoneNational}
                originalPhoneDigits={originalPhoneDigits}
                phoneTicket={phoneTicket}
                onPhoneTicketChange={setPhoneTicket}
                mode="profile"
                variant="card"
                disabled={submitting}
                primaryColor={primary}
              />
            </>
          ) : (
            <PhoneSplitInputs
              prefix={phonePrefix}
              national={phoneNational}
              onPrefixChange={setPhonePrefix}
              onNationalChange={setPhoneNational}
              disabled={submitting}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Fecha de nacimiento (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="1990-05-21"
            placeholderTextColor="#9CA3AF"
            editable={!submitting}
          />
          {chronologicalAgeYears(birthDate || null, new Date()) != null ? (
            <Text style={styles.hint}>
              Edad cronológica:{' '}
              {chronologicalAgeYears(birthDate, new Date())} años
            </Text>
          ) : (
            <Text style={styles.hint}>
              Se usa como edad cronológica en el análisis de salud de la piel.
            </Text>
          )}
        </View>

        <PatientBirthTypeField
          values={{
            birthType,
            exerciseHabit,
            exerciseDaysPerWeek,
            exerciseSessionDuration,
          }}
          onChange={(patch) => {
            if (patch.birthType != null) setBirthType(patch.birthType);
          }}
          disabled={submitting}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={[styles.input, !emailEditable && styles.inputReadonly]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={emailEditable && !submitting}
          />
          {!emailEditable ? (
            <Text style={styles.hint}>El correo no se puede modificar.</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ubicación</Text>
        <LocationPicker
          disabled={submitting}
          showLabel={false}
          value={{ address, lat, lng }}
          onChange={(next) => {
            setAddress(next.address);
            setLat(next.lat);
            setLng(next.lng);
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información clínica</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Mascota</Text>
          <View style={styles.chips}>
            {PATIENT_MASCOT_OPTIONS.map((m) => {
              const active = mascotType === m.value;
              return (
                <Pressable
                  key={m.value}
                  style={[styles.iconChip, active && styles.iconChipActive]}
                  onPress={() => setMascotType(m.value)}
                  disabled={submitting}
                >
                  <AppIcon
                    icon={m.icon}
                    size={18}
                    color={active ? onDark : text}
                  />
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PatientActivityFields
          values={{
            birthType,
            exerciseHabit,
            exerciseDaysPerWeek,
            exerciseSessionDuration,
          }}
          onChange={(patch) => {
            if (patch.exerciseHabit != null) setExerciseHabit(patch.exerciseHabit);
            if (patch.exerciseDaysPerWeek != null) {
              setExerciseDaysPerWeek(patch.exerciseDaysPerWeek);
            }
            if (patch.exerciseSessionDuration != null) {
              setExerciseSessionDuration(patch.exerciseSessionDuration);
            }
          }}
          disabled={submitting}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Tipo de piel</Text>
          <View style={styles.chips}>
            {PATIENT_SKIN_OPTIONS.map((s) => {
              const active = skinType === s.value;
              return (
                <Pressable
                  key={s.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSkinType(s.value)}
                  disabled={submitting}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Fototipo</Text>
          <View style={styles.fitzRow}>
            {PATIENT_FITZ_OPTIONS.map((f) => {
              const active = fitzpatrickType === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => setFitzpatrickType(f.value)}
                  disabled={submitting}
                  style={[
                    styles.fitzDot,
                    { backgroundColor: f.color },
                    active && styles.fitzDotActive,
                  ]}
                  accessibilityLabel={`Fototipo ${f.value}`}
                />
              );
            })}
          </View>
          {fitzHint ? <Text style={styles.hint}>{fitzHint}</Text> : null}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
        onPress={() => void handleSave()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={onDark} />
        ) : (
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        )}
      </Pressable>
    </View>
  );
}
