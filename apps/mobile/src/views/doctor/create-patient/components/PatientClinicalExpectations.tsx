import { Text, TextInput, View } from 'react-native';
import {
  CLINICAL_CONSENT_TYPES,
  CLINICAL_RECOVERY_OPTIONS,
  CLINICAL_TEXT_MAX_LENGTH,
  type ClinicalConsentType,
  type ClinicalProfileDraft,
} from '../../../../data/clinicalHistoryOptions';
import {
  ClinicalChipRow,
  ClinicalSectionHeader,
  ClinicalYesNoRow,
  clinicalUi,
} from './clinicalFormUi';

type Props = {
  value: ClinicalProfileDraft;
  onChange: (next: ClinicalProfileDraft) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  textOnAccent: string;
};

export function PatientClinicalExpectations({
  value,
  onChange,
  accentColor,
  textColor,
  mutedColor,
  textOnAccent,
}: Props) {
  function setConsent(type: ClinicalConsentType, next: boolean | null) {
    const consents = value.consents ?? { photos: null, informed: null };
    onChange({
      ...value,
      consents: { ...consents, [type]: next },
    });
  }

  return (
    <View style={clinicalUi.card}>
      <ClinicalSectionHeader
        title="Expectativas y consentimiento"
        description="Último paso antes de iniciar el tratamiento."
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <View style={clinicalUi.field}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          Expectativas del paciente frente al tratamiento
        </Text>
        <TextInput
          style={[
            clinicalUi.input,
            clinicalUi.textarea,
            { color: textColor },
          ]}
          value={value.expectations}
          onChangeText={(t) => onChange({ ...value, expectations: t })}
          placeholder="Qué espera lograr el paciente…"
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={CLINICAL_TEXT_MAX_LENGTH}
          textAlignVertical="top"
        />
      </View>
      <View style={clinicalUi.field}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          Disponibilidad de tiempo para recuperación
        </Text>
        <ClinicalChipRow
          options={CLINICAL_RECOVERY_OPTIONS}
          selected={value.recoveryAvailability}
          onSelect={(v) => onChange({ ...value, recoveryAvailability: v })}
          accentColor={accentColor}
          textColor={textColor}
          textOnAccent={textOnAccent}
        />
      </View>
      {(CLINICAL_CONSENT_TYPES ?? []).map((consent) => (
        <ClinicalYesNoRow
          key={consent.value}
          label={consent.label}
          value={value.consents?.[consent.value] ?? null}
          onChange={(next) => setConsent(consent.value, next)}
          accentColor={accentColor}
          textColor={textColor}
          mutedColor={mutedColor}
          textOnAccent={textOnAccent}
        />
      ))}
    </View>
  );
}
