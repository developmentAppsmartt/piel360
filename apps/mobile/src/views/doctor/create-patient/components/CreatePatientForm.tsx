import { useMemo, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { KeyboardAwareScrollView } from '../../../../components/KeyboardAwareScrollView';
import { BirthDateField } from '../../../../components/BirthDateField';
import { LocationPicker } from '../../../../components/maps/LocationPicker';
import { useBranding } from '../../../../context/BrandingContext';
import { OptionsSelect } from '../../../../components/OptionsSelect';
import { PhoneSplitInputs } from '../../../../components/auth/PhoneSplitInputs';
import {
  DEFAULT_PATIENT_DOC_TYPE,
  PATIENT_DOC_TYPE_OPTIONS,
  PATIENT_GENDER_OPTIONS,
  PATIENT_MASCOT_OPTIONS,
  PATIENT_SKIN_OPTIONS,
} from '../../../../data/patientFormOptions';
import {
  EMPTY_CLINICAL_PROFILE,
  type ClinicalProfileDraft,
} from '../../../../data/clinicalHistoryOptions';
import { chronologicalAgeYears } from '../../../../data/skinAge';
import {
  resolveCreatePatientSubmit,
  type CreatePatientSubmitValues,
} from '../createPatientSubmit';
import { useClinicalCatalog } from '../useClinicalCatalog';
import { createCreatePatientStyles } from '../styles/createPatient.styles';
import { FitzpatrickTypePicker } from './FitzpatrickTypePicker';
import { PatientAppAccessSection } from './PatientAppAccessSection';
import { PatientClinicalSections } from './PatientClinicalSections';
import {
  PatientActivityFields,
  PatientBirthTypeField,
} from './PatientLifestyleFields';

export type CreatePatientFormValues = CreatePatientSubmitValues;

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
  const [createAppAccess, setCreateAppAccess] = useState(false);
  const [docType, setDocType] = useState<string>(DEFAULT_PATIENT_DOC_TYPE);
  const [docNumber, setDocNumber] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [areaCode, setAreaCode] = useState('57');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [mascotType, setMascotType] = useState('');
  const [birthType, setBirthType] = useState('');
  const [exerciseHabit, setExerciseHabit] = useState('');
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState('');
  const [exerciseSessionDuration, setExerciseSessionDuration] = useState('');
  const [skinType, setSkinType] = useState('');
  const [fitzpatrickType, setFitz] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [clinical, setClinical] = useState<ClinicalProfileDraft>(
    EMPTY_CLINICAL_PROFILE,
  );
  const catalogGroups = useClinicalCatalog(setClinical);
  const [error, setError] = useState<string | null>(null);

  const onDark = branding.colors.textOnDark;
  const text = branding.colors.text;

  function submit() {
    setError(null);
    const result = resolveCreatePatientSubmit({
      firstName,
      lastName,
      email,
      password,
      createAppAccess,
      docType,
      docNumber,
      gender,
      address,
      lat,
      lng,
      areaCode,
      phone,
      birthDate,
      birthType,
      mascotType,
      exerciseHabit,
      exerciseDaysPerWeek,
      exerciseSessionDuration,
      skinType,
      fitzpatrickType,
      importantNotes,
      clinical,
    });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    onNext(result.values);
  }

  return (
    <KeyboardAwareScrollView
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
          <Text style={styles.hint}>
            Correo de contacto. Si activas «Crear cuenta» más abajo, se usará
            para iniciar sesión.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Tipo identificación</Text>
          <OptionsSelect
            value={docType}
            options={PATIENT_DOC_TYPE_OPTIONS}
            onChange={setDocType}
            placeholder="Seleccionar documento"
            textColor={text}
            accentColor={branding.colors.buttonHover}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>No. Identificación *</Text>
          <TextInput
            style={styles.input}
            value={docNumber}
            onChangeText={setDocNumber}
            placeholder="Obligatorio"
            placeholderTextColor="#9CA3AF"
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

        <View style={styles.field}>
          <Text style={styles.label}>Teléfono</Text>
          <PhoneSplitInputs
            prefix={areaCode}
            national={phone}
            onPrefixChange={setAreaCode}
            onNationalChange={setPhone}
            textColor={text}
          />
        </View>

        <PatientAppAccessSection
          createAppAccess={createAppAccess}
          onCreateAppAccessChange={setCreateAppAccess}
          password={password}
          onPasswordChange={setPassword}
          accentColor={branding.colors.primary}
          textColor={text}
          mutedColor={branding.colors.muted}
        />

        <BirthDateField
          value={birthDate}
          onChange={setBirthDate}
          label="Fecha de nacimiento"
          labelStyle={styles.label}
          fieldStyle={styles.field}
          triggerStyle={styles.input}
          valueStyle={{ color: text }}
          accentColor={branding.colors.primary}
          textColor={text}
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
          <FitzpatrickTypePicker
            value={fitzpatrickType}
            onChange={setFitz}
            accentColor={branding.colors.buttonHover}
            mutedColor={branding.colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notas importantes</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            value={importantNotes}
            onChangeText={setImportantNotes}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>{importantNotes.length}/500</Text>
        </View>

        <PatientClinicalSections
          value={clinical}
          onChange={setClinical}
          groups={catalogGroups}
          accentColor={branding.colors.buttonHover}
          textColor={text}
          mutedColor={branding.colors.muted}
          textOnAccent={onDark}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={({ pressed }) => [styles.nextBtn, pressed && { backgroundColor: branding.colors.buttonHover }]} onPress={submit}>
          <Text style={styles.nextBtnText}>Siguiente</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}
