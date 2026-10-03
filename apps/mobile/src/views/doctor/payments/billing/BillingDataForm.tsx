import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from '../../../../components/KeyboardAwareScrollView';
import { ApiError } from '../../../../services/api.client';
import {
  doctorsService,
  type DoctorProfile,
} from '../../../../services/doctors.service';
import type { BillingStyles } from '../styles/billing.styles';

type BillingForm = {
  firstName: string;
  lastName: string;
  docType: string;
  docNumber: string;
  address: string;
  city: string;
  country: string;
  zip: string;
};

function formFromDoctor(doctor: DoctorProfile): BillingForm {
  return {
    firstName: doctor.firstName ?? '',
    lastName: doctor.lastName ?? '',
    docType: doctor.docType ?? '',
    docNumber: doctor.docNumber ?? '',
    address: doctor.address ?? '',
    city: doctor.city ?? '',
    country: doctor.country ?? '',
    zip: doctor.zip ?? '',
  };
}

const FIELDS: {
  key: keyof BillingForm;
  label: string;
  placeholder: string;
  caps?: 'characters';
}[] = [
  { key: 'firstName', label: 'Nombres', placeholder: 'Nombres' },
  { key: 'lastName', label: 'Apellidos', placeholder: 'Apellidos' },
  { key: 'docType', label: 'Tipo de documento', placeholder: 'CC, NIT, CE…', caps: 'characters' },
  { key: 'docNumber', label: 'Número de documento', placeholder: 'Documento' },
  { key: 'address', label: 'Dirección', placeholder: 'Dirección de facturación' },
  { key: 'city', label: 'Ciudad', placeholder: 'Ciudad' },
  { key: 'country', label: 'País', placeholder: 'País' },
  { key: 'zip', label: 'Código postal', placeholder: 'Código postal' },
];

export function BillingDataForm({
  styles,
  doctor,
  mutedColor,
  onSaved,
}: {
  styles: BillingStyles;
  doctor: DoctorProfile;
  mutedColor: string;
  onSaved: (doctor: DoctorProfile) => void;
}) {
  const [form, setForm] = useState<BillingForm>(() => formFromDoctor(doctor));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await doctorsService.updateMe({
        ...(form.firstName.trim() ? { firstName: form.firstName.trim() } : {}),
        ...(form.lastName.trim() ? { lastName: form.lastName.trim() } : {}),
        docType: form.docType.trim(),
        docNumber: form.docNumber.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        zip: form.zip.trim(),
      });
      setForm(formFromDoctor(updated));
      onSaved(updated);
      Alert.alert('Listo', 'Los datos de facturación se guardaron.');
    } catch (err) {
      Alert.alert(
        'No se pudo guardar',
        err instanceof ApiError
          ? err.message
          : 'Revisa los datos e inténtalo de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>
        Nombre, documento y dirección que aparecen en tus compras.
      </Text>
      {FIELDS.slice(0, 4).map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={form[field.key]}
            onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
            placeholder={field.placeholder}
            autoCapitalize={field.caps}
            placeholderTextColor={mutedColor}
          />
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Correo</Text>
        <TextInput
          style={[styles.input, { opacity: 0.7 }]}
          value={doctor.user?.email ?? ''}
          editable={false}
        />
      </View>
      {FIELDS.slice(4).map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={form[field.key]}
            onChangeText={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
            placeholder={field.placeholder}
            placeholderTextColor={mutedColor}
          />
        </View>
      ))}
      <Pressable
        style={[styles.primaryBtn, saving ? { opacity: 0.6 } : null]}
        disabled={saving}
        onPress={() => void save()}
      >
        <Text style={styles.primaryBtnText}>
          {saving ? 'Guardando…' : 'Guardar datos'}
        </Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}
