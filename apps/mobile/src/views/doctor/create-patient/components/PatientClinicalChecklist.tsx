import { Pressable, Text, TextInput, View } from 'react-native';
import {
  CLINICAL_TEXT_MAX_LENGTH,
  type ClinicalHistoryCatalogGroup,
  type ClinicalProfileDraft,
} from '../../../../data/clinicalHistoryOptions';
import {
  ClinicalSectionHeader,
  ClinicalYesNoRow,
  clinicalUi,
} from './clinicalFormUi';

type Props = {
  value: ClinicalProfileDraft;
  onChange: (next: ClinicalProfileDraft) => void;
  groups: ClinicalHistoryCatalogGroup[];
  accentColor: string;
  textColor: string;
  mutedColor: string;
  textOnAccent: string;
};

export function PatientClinicalChecklist({
  value,
  onChange,
  groups,
  accentColor,
  textColor,
  mutedColor,
  textOnAccent,
}: Props) {
  const answers = value.answers ?? {};
  const pendingKeys = Object.entries(answers)
    .filter(([, answer]) => answer === null)
    .map(([key]) => key);

  function setAnswer(key: string, next: boolean | null) {
    onChange({
      ...value,
      answers: { ...answers, [key]: next },
    });
  }

  function markPendingAsNo() {
    const next = { ...answers };
    for (const key of pendingKeys) next[key] = false;
    onChange({ ...value, answers: next });
  }

  const safeGroups = groups ?? [];
  if (safeGroups.length === 0) {
    return (
      <View style={clinicalUi.card}>
        <ClinicalSectionHeader
          title="Seguridad y antecedentes clínicos"
          description="No se pudo cargar el catálogo de preguntas."
          textColor={textColor}
          mutedColor={mutedColor}
        />
      </View>
    );
  }

  return (
    <View style={clinicalUi.card}>
      <ClinicalSectionHeader
        title="Seguridad y antecedentes clínicos"
        description="Marca Sí o No en cada punto — toma menos de un minuto."
        textColor={textColor}
        mutedColor={mutedColor}
      />
      <View style={clinicalUi.pendingBar}>
        <Text style={[clinicalUi.label, { color: mutedColor }]}>
          {pendingKeys.length
            ? `${pendingKeys.length} sin responder`
            : 'Todas las preguntas respondidas'}
        </Text>
        <Pressable
          onPress={markPendingAsNo}
          disabled={pendingKeys.length === 0}
          style={[
            clinicalUi.pendingBtn,
            pendingKeys.length === 0 && { opacity: 0.45 },
          ]}
        >
          <Text style={[clinicalUi.pendingBtnText, { color: textColor }]}>
            Marcar pendientes como No
          </Text>
        </Pressable>
      </View>

      {safeGroups.map((group) => (
        <View key={group.key} style={{ gap: 2 }}>
          <Text style={[clinicalUi.groupLabel, { color: mutedColor }]}>
            {group.label}
          </Text>
          {(group.items ?? []).map((item) => (
            <ClinicalYesNoRow
              key={item.key}
              label={item.label}
              value={answers[item.key] ?? null}
              onChange={(next) => setAnswer(item.key, next)}
              accentColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              textOnAccent={textOnAccent}
            />
          ))}
          {group.key === 'aesthetic' ? (
            <View style={[clinicalUi.field, { marginTop: 8 }]}>
              <Text style={[clinicalUi.label, { color: mutedColor }]}>
                Detalle (opcional)
              </Text>
              <TextInput
                style={[clinicalUi.input, { color: textColor }]}
                value={value.aestheticHistoryDetail}
                onChangeText={(t) =>
                  onChange({ ...value, aestheticHistoryDetail: t })
                }
                placeholder="Tipo de tratamiento y fecha aproximada"
                placeholderTextColor="#9CA3AF"
                maxLength={CLINICAL_TEXT_MAX_LENGTH}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
