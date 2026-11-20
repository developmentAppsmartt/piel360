import { Text, TextInput, View } from 'react-native';
import {
  CLINICAL_PREGNANCY_OPTIONS,
  CLINICAL_SENSITIVITY_OPTIONS,
  CLINICAL_SUN_EXPOSURE_OPTIONS,
  CLINICAL_TEXT_MAX_LENGTH,
  type ClinicalHistoryCatalogGroup,
  type ClinicalProfileDraft,
} from '../../../../data/clinicalHistoryOptions';
import { PatientClinicalChecklist } from './PatientClinicalChecklist';
import { PatientClinicalExpectations } from './PatientClinicalExpectations';
import { PatientClinicalLifestyle } from './PatientClinicalLifestyle';
import {
  ClinicalChipRow,
  ClinicalSectionHeader,
  clinicalUi,
} from './clinicalFormUi';

type PatientClinicalSectionsProps = {
  value: ClinicalProfileDraft;
  onChange: (next: ClinicalProfileDraft) => void;
  groups: ClinicalHistoryCatalogGroup[];
  accentColor: string;
  textColor: string;
  mutedColor: string;
  textOnAccent: string;
};

/** Historia clínica del alta: mismas secciones que el CRM. */
export function PatientClinicalSections({
  value,
  onChange,
  groups,
  accentColor,
  textColor,
  mutedColor,
  textOnAccent,
}: PatientClinicalSectionsProps) {
  function setField<K extends keyof ClinicalProfileDraft>(
    key: K,
    next: ClinicalProfileDraft[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  const chipProps = {
    accentColor,
    textColor,
    textOnAccent,
  };

  return (
    <View style={clinicalUi.wrap}>
      <View style={clinicalUi.card}>
        <ClinicalSectionHeader
          title="Motivo de consulta"
          description="Por qué viene el paciente y cuánto sol recibe."
          textColor={textColor}
          mutedColor={mutedColor}
        />
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Motivo principal de consulta
          </Text>
          <TextInput
            style={[
              clinicalUi.input,
              clinicalUi.textarea,
              { color: textColor },
            ]}
            value={value.consultationReason}
            onChangeText={(t) => setField('consultationReason', t)}
            placeholder="Ej. manchas en las mejillas, acné, arrugas…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
            textAlignVertical="top"
          />
        </View>
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Exposición solar
          </Text>
          <ClinicalChipRow
            options={CLINICAL_SUN_EXPOSURE_OPTIONS}
            selected={value.sunExposure}
            onSelect={(v) => setField('sunExposure', v)}
            {...chipProps}
          />
        </View>
      </View>

      <View style={clinicalUi.card}>
        <ClinicalSectionHeader
          title="Antecedentes y salud"
          description="Cada respuesta da una pieza del rompecabezas."
          textColor={textColor}
          mutedColor={mutedColor}
        />
        {(
          [
            {
              key: 'cosmeticRoutine' as const,
              label: 'Rutina cosmética actual',
              placeholder: 'Limpiador, protector solar…',
            },
            {
              key: 'recentProcedures' as const,
              label: 'Procedimientos recientes',
              placeholder: 'Ej. peeling hace 2 semanas',
            },
            {
              key: 'relevantMedication' as const,
              label: 'Medicación relevante',
              placeholder: 'Ej. isotretinoína',
            },
            {
              key: 'knownAllergies' as const,
              label: 'Alergias conocidas',
              placeholder: 'Ej. ácido salicílico',
            },
            {
              key: 'dermatologicalHistory' as const,
              label: 'Antecedentes dermatológicos',
              placeholder: 'Ej. dermatitis, rosácea…',
            },
          ] as const
        ).map((field) => (
          <View key={field.key} style={clinicalUi.field}>
            <Text style={[clinicalUi.label, { color: mutedColor }]}>
              {field.label}
            </Text>
            <TextInput
              style={[clinicalUi.input, { color: textColor }]}
              value={value[field.key]}
              onChangeText={(t) => setField(field.key, t)}
              placeholder={field.placeholder}
              placeholderTextColor="#9CA3AF"
              maxLength={CLINICAL_TEXT_MAX_LENGTH}
            />
          </View>
        ))}
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Sensibilidad o reacciones frecuentes
          </Text>
          <ClinicalChipRow
            options={CLINICAL_SENSITIVITY_OPTIONS}
            selected={value.frequentSensitivity}
            onSelect={(v) => setField('frequentSensitivity', v)}
            {...chipProps}
          />
        </View>
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Embarazo / lactancia (cuando corresponda)
          </Text>
          <ClinicalChipRow
            options={CLINICAL_PREGNANCY_OPTIONS}
            selected={value.pregnancyLactation}
            onSelect={(v) => setField('pregnancyLactation', v)}
            {...chipProps}
          />
        </View>
      </View>

      <PatientClinicalLifestyle
        value={value}
        onChange={onChange}
        accentColor={accentColor}
        textColor={textColor}
        mutedColor={mutedColor}
        textOnAccent={textOnAccent}
      />

      <PatientClinicalChecklist
        value={value}
        onChange={onChange}
        groups={groups}
        accentColor={accentColor}
        textColor={textColor}
        mutedColor={mutedColor}
        textOnAccent={textOnAccent}
      />

      <PatientClinicalExpectations
        value={value}
        onChange={onChange}
        accentColor={accentColor}
        textColor={textColor}
        mutedColor={mutedColor}
        textOnAccent={textOnAccent}
      />
    </View>
  );
}
