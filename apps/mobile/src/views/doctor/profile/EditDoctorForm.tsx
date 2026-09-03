import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LocationPicker } from '../../../components/maps/LocationPicker';
import { useBranding } from '../../../context/BrandingContext';
import {
  DOCTOR_DOC_TYPES,
  DOCTOR_GENDER_OPTIONS,
  DOCTOR_SPECIALTIES,
} from '../../../data/doctorFormOptions';
import { ApiError } from '../../../services/api.client';
import type {
  DoctorProfile,
  UpdateDoctorInput,
} from '../../../services/doctors.service';
import { PhoneOtpSection } from '../../../components/auth/PhoneOtpSection';
import {
  combinePhoneDigits,
  isValidE164Digits,
  splitPhoneDigits,
} from '../../../lib/phone';
import { createEditProfileStyles } from '../../profile/edit/styles/editProfile.styles';

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

function toCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

type EditDoctorFormProps = {
  doctor: DoctorProfile;
  onSubmit: (input: UpdateDoctorInput) => Promise<void>;
};

export function EditDoctorForm({ doctor, onSubmit }: EditDoctorFormProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createEditProfileStyles(branding.colors),
    [branding.colors],
  );

  const initialSplit = splitPhoneDigits(doctor.phone ?? '');

  const [firstName, setFirstName] = useState(doctor.firstName ?? '');
  const [lastName, setLastName] = useState(doctor.lastName ?? '');
  const [phonePrefix, setPhonePrefix] = useState(initialSplit.prefix);
  const [phoneNational, setPhoneNational] = useState(initialSplit.national);
  const [originalPhoneDigits, setOriginalPhoneDigits] = useState(() =>
    combinePhoneDigits(initialSplit.prefix, initialSplit.national),
  );
  const [phoneTicket, setPhoneTicket] = useState<string | null>(null);
  const [docType, setDocType] = useState(doctor.docType ?? 'CC');
  const [docNumber, setDocNumber] = useState(doctor.docNumber ?? '');
  const [birthDate, setBirthDate] = useState(toDateInput(doctor.birthDate));
  const [gender, setGender] = useState(doctor.gender ?? '');
  const [specialty, setSpecialty] = useState(
    doctor.specialty ?? DOCTOR_SPECIALTIES[0],
  );
  const [medicalRegistry, setMedicalRegistry] = useState(
    doctor.medicalRegistry ?? '',
  );
  const [licenseNumber, setLicenseNumber] = useState(
    doctor.licenseNumber ?? '',
  );
  const [educationEntity, setEducationEntity] = useState(
    doctor.educationEntity ?? '',
  );
  const [graduationInstitution, setGraduationInstitution] = useState(
    doctor.graduationInstitution ?? '',
  );
  const [address, setAddress] = useState(doctor.address ?? '');
  const [city, setCity] = useState(doctor.city ?? '');
  const [country, setCountry] = useState(doctor.country ?? '');
  const [zip, setZip] = useState(doctor.zip ?? '');
  const [lat, setLat] = useState<number | null>(() => toCoord(doctor.lat));
  const [lng, setLng] = useState<number | null>(() => toCoord(doctor.lng));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const email = doctor.user?.email ?? '';

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
    const phoneDigits = combinePhoneDigits(phonePrefix, phoneNational);
    if (phoneDigits && !isValidE164Digits(phoneDigits)) {
      setError(
        'Celular inválido — revisa el prefijo y el número (10 a 15 dígitos).',
      );
      return;
    }
    const phoneChanged = phoneDigits !== originalPhoneDigits;
    if (phoneChanged && !phoneTicket) {
      setError('Verifica tu nuevo celular con el código SMS antes de guardar.');
      return;
    }

    const input: UpdateDoctorInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phoneDigits || undefined,
      ...(phoneChanged && phoneTicket ? { phoneTicket } : {}),
      docType: optional(docType),
      docNumber: optional(docNumber),
      birthDate: optional(birthDate),
      gender: optional(gender),
      specialty: optional(specialty),
      medicalRegistry: optional(medicalRegistry),
      licenseNumber: optional(licenseNumber),
      educationEntity: optional(educationEntity),
      graduationInstitution: optional(graduationInstitution),
      address: optional(address),
      city: optional(city),
      country: optional(country),
      zip: optional(zip),
      ...(lat != null && lng != null ? { lat, lng } : {}),
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
      if (phoneDigits) {
        setOriginalPhoneDigits(phoneDigits);
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
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={[styles.input, styles.inputReadonly]}
            value={email}
            editable={false}
          />
          <Text style={styles.hint}>El correo no se puede cambiar aquí.</Text>
        </View>

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
            {DOCTOR_DOC_TYPES.map((d) => {
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
            keyboardType="default"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Sexo</Text>
          <View style={styles.chips}>
            {DOCTOR_GENDER_OPTIONS.map((g) => {
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
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={branding.colors.muted}
            editable={!submitting}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Celular</Text>
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
            primaryColor={branding.colors.primary}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información profesional</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Especialidad</Text>
          <View style={styles.chips}>
            {DOCTOR_SPECIALTIES.map((s) => {
              const active = specialty === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSpecialty(s)}
                  disabled={submitting}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Registro médico</Text>
          <TextInput
            style={styles.input}
            value={medicalRegistry}
            onChangeText={setMedicalRegistry}
            editable={!submitting}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Número de licencia</Text>
          <TextInput
            style={styles.input}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            editable={!submitting}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Entidad educativa</Text>
          <TextInput
            style={styles.input}
            value={educationEntity}
            onChangeText={setEducationEntity}
            editable={!submitting}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Institución de graduación</Text>
          <TextInput
            style={styles.input}
            value={graduationInstitution}
            onChangeText={setGraduationInstitution}
            editable={!submitting}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ubicación</Text>
        <LocationPicker
          disabled={submitting}
          showAdminFields
          showLabel={false}
          value={{ address, city, country, zip, lat, lng }}
          onChange={(next) => {
            setAddress(next.address);
            setCity(next.city ?? '');
            setCountry(next.country ?? '');
            setZip(next.zip ?? '');
            setLat(next.lat);
            setLng(next.lng);
          }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
        onPress={() => void handleSave()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={branding.colors.textOnDark} />
        ) : (
          <Text style={styles.saveButtonText}>Guardar cambios</Text>
        )}
      </Pressable>
    </View>
  );
}
