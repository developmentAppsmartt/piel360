import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
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
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [areaCode, setAreaCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [mascotType, setMascotType] = useState('');
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
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setError('Fecha inválida. Usa AAAA-MM-DD.');
      return;
    }
    const opt = (v: string) => (v.trim() ? v.trim() : undefined);
    onNext({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      docType: opt(docType),
      docNumber: opt(docNumber),
      gender: opt(gender),
      address: opt(address),
      areaCode: opt(areaCode),
      phone: opt(phone),
      birthDate: opt(birthDate),
      mascotType: opt(mascotType),
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
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
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
        </View>

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
          <Text style={styles.label}>Fototipo Fitzpatrick</Text>
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
