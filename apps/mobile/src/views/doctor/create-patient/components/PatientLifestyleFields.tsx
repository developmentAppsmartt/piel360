import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import { useBranding } from '../../../../context/BrandingContext';
import {
  PATIENT_BIRTH_TYPE_OPTIONS,
  PATIENT_EXERCISE_DAYS_OPTIONS,
  PATIENT_EXERCISE_DURATION_OPTIONS,
  PATIENT_EXERCISE_HABIT_OPTIONS,
} from '../../../../data/patientFormOptions';

export type PatientLifestyleValues = {
  birthType: string;
  exerciseHabit: string;
  exerciseDaysPerWeek: string;
  exerciseSessionDuration: string;
};

type LifestyleFieldProps = {
  values: PatientLifestyleValues;
  onChange: (patch: Partial<PatientLifestyleValues>) => void;
  disabled?: boolean;
};

export function PatientBirthTypeField({
  values,
  onChange,
  disabled,
}: LifestyleFieldProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createLifestyleStyles(branding.colors.primary),
    [branding.colors.primary],
  );
  const primary = branding.colors.primary;
  const text = branding.colors.text;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Tipo de nacimiento</Text>
      <View style={styles.choiceRow}>
        {PATIENT_BIRTH_TYPE_OPTIONS.map((option) => {
          const active = values.birthType === option.value;
          return (
            <Pressable
              key={option.value}
              disabled={disabled}
              onPress={() => onChange({ birthType: option.value })}
              style={[styles.choiceCard, active && styles.choiceCardActive]}
            >
              <AppIcon
                icon={option.icon}
                size={22}
                color={active ? primary : text}
              />
              <Text
                style={[styles.choiceText, active && styles.choiceTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PatientActivityFields({
  values,
  onChange,
  disabled,
}: LifestyleFieldProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createLifestyleStyles(branding.colors.primary),
    [branding.colors.primary],
  );
  const text = branding.colors.text;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Actividad Física</Text>

      <View style={styles.field}>
        <Text style={styles.question}>
          1. ¿Realiza algún tipo de ejercicio o deporte de forma regular?
          (Como correr, nadar, ir al gimnasio o andar en bicicleta).
        </Text>
        <View style={styles.choiceRow}>
          {PATIENT_EXERCISE_HABIT_OPTIONS.map((option) => {
            const active = values.exerciseHabit === option.value;
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                onPress={() => onChange({ exerciseHabit: option.value })}
                style={[
                  styles.habitCard,
                  active && {
                    borderColor: option.color,
                    backgroundColor: `${option.color}14`,
                  },
                ]}
              >
                <AppIcon icon={option.icon} size={20} color={option.color} />
                <Text
                  style={[
                    styles.habitText,
                    active && { color: option.color },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.question}>
          2. ¿Cuántos días a la semana dedica a estas actividades?
        </Text>
        <View style={styles.chips}>
          {PATIENT_EXERCISE_DAYS_OPTIONS.map((option) => {
            const active = values.exerciseDaysPerWeek === option.value;
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                onPress={() =>
                  onChange({ exerciseDaysPerWeek: option.value })
                }
                style={[
                  styles.colorChip,
                  {
                    borderColor: active ? option.color : '#E5E7EB',
                    backgroundColor: active ? `${option.color}18` : '#FFFFFF',
                  },
                ]}
              >
                <AppIcon
                  icon={Icons.calendarDay}
                  size={16}
                  color={option.color}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? option.color : text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.question}>
          3. ¿Cuánto tiempo dura cada sesión de entrenamiento?
        </Text>
        <View style={styles.chips}>
          {PATIENT_EXERCISE_DURATION_OPTIONS.map((option) => {
            const active = values.exerciseSessionDuration === option.value;
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                onPress={() =>
                  onChange({ exerciseSessionDuration: option.value })
                }
                style={[
                  styles.colorChip,
                  {
                    borderColor: active ? option.color : '#E5E7EB',
                    backgroundColor: active ? `${option.color}18` : '#FFFFFF',
                  },
                ]}
              >
                <AppIcon icon={Icons.clock} size={16} color={option.color} />
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? option.color : text },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function createLifestyleStyles(primary: string) {
  return StyleSheet.create({
    field: { gap: 8 },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: '#6B7280',
    },
    section: { gap: 14 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#374151',
    },
    question: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4B5563',
      lineHeight: 18,
    },
    choiceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    choiceCard: {
      flex: 1,
      minWidth: 140,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    choiceCardActive: {
      borderColor: primary,
      backgroundColor: `${primary}14`,
    },
    choiceText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: '#111827',
    },
    choiceTextActive: {
      color: primary,
    },
    habitCard: {
      flex: 1,
      minWidth: 96,
      alignItems: 'center',
      gap: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    habitText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#111827',
      textAlign: 'center',
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    colorChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
