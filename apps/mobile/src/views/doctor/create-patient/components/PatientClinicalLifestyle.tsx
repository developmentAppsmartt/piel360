import { Text, TextInput, View } from 'react-native';
import {
  CLINICAL_ALCOHOL_OPTIONS,
  CLINICAL_SLEEP_OPTIONS,
  CLINICAL_SMOKING_OPTIONS,
  CLINICAL_STRESS_OPTIONS,
  CLINICAL_TEXT_MAX_LENGTH,
  CLINICAL_YES_NO_NA_OPTIONS,
  type ClinicalProfileDraft,
} from '../../../../data/clinicalHistoryOptions';
import {
  ClinicalChipRow,
  ClinicalSectionHeader,
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

export function PatientClinicalLifestyle({
  value,
  onChange,
  accentColor,
  textColor,
  mutedColor,
  textOnAccent,
}: Props) {
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
    <View style={clinicalUi.card}>
      <ClinicalSectionHeader
        title="Hábitos y estilo de vida"
        description="Lo que el día a día le hace a la piel."
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <View style={clinicalUi.field}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          Tabaquismo
        </Text>
        <ClinicalChipRow
          options={CLINICAL_SMOKING_OPTIONS}
          selected={value.smoking}
          onSelect={(v) => setField('smoking', v)}
          {...chipProps}
        />
      </View>
      <View style={clinicalUi.field}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          Consumo de alcohol
        </Text>
        <ClinicalChipRow
          options={CLINICAL_ALCOHOL_OPTIONS}
          selected={value.alcohol}
          onSelect={(v) => setField('alcohol', v)}
          {...chipProps}
        />
      </View>
      <View style={clinicalUi.field}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          Calidad de sueño
        </Text>
        <ClinicalChipRow
          options={CLINICAL_SLEEP_OPTIONS}
          selected={value.sleepQuality}
          onSelect={(v) => setField('sleepQuality', v)}
          {...chipProps}
        />
      </View>
      <View style={clinicalUi.field}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          Nivel de estrés
        </Text>
        <ClinicalChipRow
          options={CLINICAL_STRESS_OPTIONS}
          selected={value.stressLevel}
          onSelect={(v) => setField('stressLevel', v)}
          {...chipProps}
        />
      </View>

      <View style={clinicalUi.nested}>
        <Text style={[clinicalUi.nestedTitle, { color: textColor }]}>
          Antecedentes ginecológicos{' '}
          <Text style={{ fontWeight: '400', color: mutedColor }}>
            (cuando corresponda)
          </Text>
        </Text>
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Menopausia
          </Text>
          <ClinicalChipRow
            options={CLINICAL_YES_NO_NA_OPTIONS}
            selected={value.menopause}
            onSelect={(v) => setField('menopause', v)}
            {...chipProps}
          />
        </View>
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Trastornos hormonales (SOP)
          </Text>
          <ClinicalChipRow
            options={CLINICAL_YES_NO_NA_OPTIONS}
            selected={value.pcos}
            onSelect={(v) => setField('pcos', v)}
            {...chipProps}
          />
        </View>
        <View style={clinicalUi.field}>
          <Text style={[clinicalUi.label, { color: mutedColor }]}>
            Método anticonceptivo actual (opcional)
          </Text>
          <TextInput
            style={[clinicalUi.input, { color: textColor }]}
            value={value.contraceptiveMethod}
            onChangeText={(t) => setField('contraceptiveMethod', t)}
            placeholder="Ej. DIU, pastilla, ninguno"
            placeholderTextColor="#9CA3AF"
            maxLength={CLINICAL_TEXT_MAX_LENGTH}
          />
        </View>
      </View>
    </View>
  );
}
