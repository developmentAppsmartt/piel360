import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { LocationPicker } from '../../../../components/maps/LocationPicker';
import { useBranding } from '../../../../context/BrandingContext';
import {
  PATIENT_DOC_TYPES,
  PATIENT_FITZ_OPTIONS,
  PATIENT_GENDER_OPTIONS,
  PATIENT_MASCOT_OPTIONS,
  PATIENT_SKIN_OPTIONS,
} from '../../../../data/patientFormOptions';
import type { CreatePatientInput } from '../../../../services/patients.service';
import { createCreatePatientStyles } from '../styles/createPatient.styles';
import { chronologicalAgeYears } from '../../../../data/skinAge';
import {
  PatientActivityFields,
  PatientBirthTypeField,
} from './PatientLifestyleFields';

export type CreatePatientFormValues = CreatePatientInput;

type CreatePatientFormProps = {
  onNext: (values: CreatePatientFormValues) => void;
};

export function CreatePatientForm({ onNext }: CreatePatientFormProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createCreatePatientStyles(branding.colors),
    [branding.colors],
  );

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [areaCode, setAreaCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [mascotType, setMascotType] = useState('');
  const [birthType, setBirthType] = useState('');
  const [exerciseHabit, setExerciseHabit] = useState('');
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState('');
  const [exerciseSessionDuration, setExerciseSessionDuration] = useState('');
  const [skinType, setSkinType] = useState('');
  const [fitzpatrickType, setFitz] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;
  const fitzHint = PATIENT_FITZ_OPTIONS.find(
    (f) => f.value === fitzpatrickType,
  )?.hint;

  function submit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Nombre y apellidos son obligatorios.');
      return;
    }
    const emailTrim = email.trim();
    const passwordTrim = password.trim();
    if (!emailTrim) {
      setError('El correo es obligatorio para que el paciente pueda acceder.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError('Correo inválido.');
      return;
    }
    if (passwordTrim.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setError('Fecha inválida. Usa AAAA-MM-DD.');
      return;
    }
    const opt = (v: string) => (v.trim() ? v.trim() : undefined);
    onNext({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: emailTrim,
      password: passwordTrim,
      docType: opt(docType),
      docNumber: opt(docNumber),
      gender: opt(gender),
      address: opt(address),
      ...(lat != null && lng != null ? { lat, lng } : {}),
      areaCode: opt(areaCode),
      phone: opt(phone),
      birthDate: opt(birthDate),
      birthType: opt(birthType),
      mascotType: opt(mascotType),
      exerciseHabit: opt(exerciseHabit),
      exerciseDaysPerWeek: opt(exerciseDaysPerWeek),
      exerciseSessionDuration: opt(exerciseSessionDuration),
      skinType: opt(skinType),
      fitzpatrickType: opt(fitzpatrickType),
    });
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Nombres</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Apellidos</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña de acceso</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
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
          <Text style={[styles.label, { marginBottom: 4 }]}>Ubicación</Text>
          <LocationPicker
            showLabel={false}
            value={{ address, lat, lng }}
            onChange={(next) => {
              setAddress(next.address);
              setLat(next.lat);
              setLng(next.lng);
            }}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { width: 90 }]}>
            <Text style={styles.label}>Cód. área</Text>
            <TextInput
              style={styles.input}
              value={areaCode}
              onChangeText={setAreaCode}
            />
          </View>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Fecha de nacimiento (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="1976-06-12"
            placeholderTextColor="#9CA3AF"
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
        />

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
                  onPress={() => setFitz(f.value)}
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.nextBtn} onPress={submit}>
          <Text style={styles.nextBtnText}>Siguiente</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
