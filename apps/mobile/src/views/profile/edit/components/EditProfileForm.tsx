import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { ApiError } from '../../../../services/api.client';
import type { UpdatePatientInput } from '../../../../services/patients.service';
import type { PatientProfile } from '../../../../types/patient';
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

type EditProfileFormProps = {
  patient: PatientProfile;
  onSubmit: (input: UpdatePatientInput) => Promise<void>;
};

export function EditProfileForm({ patient, onSubmit }: EditProfileFormProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createEditProfileStyles(branding.colors),
    [branding.colors],
  );

  const [firstName, setFirstName] = useState(patient.firstName ?? '');
  const [lastName, setLastName] = useState(patient.lastName ?? '');
  const [email, setEmail] = useState(patient.email ?? '');
  const [areaCode, setAreaCode] = useState(patient.areaCode ?? '+57');
  const [phone, setPhone] = useState(patient.phone ?? '');
  const [docType, setDocType] = useState(patient.docType ?? 'CC');
  const [docNumber, setDocNumber] = useState(patient.docNumber ?? '');
  const [birthDate, setBirthDate] = useState(toDateInput(patient.birthDate));
  const [gender, setGender] = useState(patient.gender ?? '');
  const [address, setAddress] = useState(patient.address ?? '');
  const [mascotType, setMascotType] = useState(patient.mascotType ?? '');
  const [skinType, setSkinType] = useState(patient.skinType ?? '');
  const [fitzpatrickType, setFitzpatrickType] = useState(
    patient.fitzpatrickType ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const input: UpdatePatientInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: optional(email),
      phone: optional(phone),
      areaCode: optional(areaCode),
      docType: optional(docType),
      docNumber: optional(docNumber),
      address: optional(address),
      birthDate: optional(birthDate),
      gender: optional(gender),
      mascotType: optional(mascotType),
      skinType: optional(skinType),
      fitzpatrickType: optional(fitzpatrickType),
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
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
          <Text style={styles.label}>Dirección</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            editable={!submitting}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { width: 90 }]}>
            <Text style={styles.label}>Cód. área</Text>
            <TextInput
              style={styles.input}
              value={areaCode}
              onChangeText={setAreaCode}
              editable={!submitting}
            />
          </View>
          <View style={[styles.field, styles.half]}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!submitting}
            />
          </View>
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
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!submitting}
          />
        </View>
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
          <Text style={styles.label}>Fototipo Fitzpatrick</Text>
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
