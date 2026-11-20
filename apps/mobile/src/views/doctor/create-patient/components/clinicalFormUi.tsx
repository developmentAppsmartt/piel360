import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ChipOption = { value: string; label: string };

export function ClinicalSectionHeader({
  title,
  description,
  textColor,
  mutedColor,
}: {
  title: string;
  description: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={ui.sectionHeader}>
      <Text style={[ui.sectionTitle, { color: textColor }]}>{title}</Text>
      <Text style={[ui.sectionDesc, { color: mutedColor }]}>{description}</Text>
    </View>
  );
}

export function ClinicalChipRow({
  options,
  selected,
  onSelect,
  accentColor,
  textColor,
  textOnAccent,
}: {
  options: readonly ChipOption[];
  selected: string;
  onSelect: (value: string) => void;
  accentColor: string;
  textColor: string;
  textOnAccent: string;
}) {
  const list = options ?? [];
  return (
    <View style={ui.chips}>
      {list.map((o) => {
        const active = selected === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onSelect(active ? '' : o.value)}
            style={[
              ui.chip,
              active && {
                borderColor: accentColor,
                backgroundColor: accentColor,
              },
            ]}
          >
            <Text
              style={[
                ui.chipText,
                { color: active ? textOnAccent : textColor },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sí / No (null = sin responder). Tocar de nuevo la misma opción la limpia. */
export function ClinicalYesNoRow({
  label,
  value,
  onChange,
  accentColor,
  textColor,
  mutedColor,
  textOnAccent,
}: {
  label: string;
  value: boolean | null;
  onChange: (next: boolean | null) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  textOnAccent: string;
}) {
  return (
    <View style={ui.yesNoRow}>
      <Text style={[ui.yesNoLabel, { color: textColor }]}>{label}</Text>
      <View style={ui.yesNoToggle}>
        {(
          [
            { v: true as const, label: 'Sí' },
            { v: false as const, label: 'No' },
          ] as const
        ).map((opt) => {
          const active = value === opt.v;
          return (
            <Pressable
              key={opt.label}
              onPress={() => onChange(active ? null : opt.v)}
              style={[
                ui.yesNoBtn,
                active && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}
            >
              <Text
                style={[
                  ui.yesNoBtnText,
                  { color: active ? textOnAccent : mutedColor },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const clinicalUi = StyleSheet.create({
  wrap: { gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  nested: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    backgroundColor: '#F9FAFB',
  },
  nestedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textarea: { minHeight: 88 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  pendingBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  pendingBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

const ui = StyleSheet.create({
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionDesc: { fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  yesNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  yesNoLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  yesNoToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  yesNoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  yesNoBtnText: { fontSize: 13, fontWeight: '700' },
});
