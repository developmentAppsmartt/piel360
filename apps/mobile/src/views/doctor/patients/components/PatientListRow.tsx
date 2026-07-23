import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../../components/AppIcon';
import { Icons } from '../../../../components/icons';
import type { PatientProfile } from '../../../../types/patient';
import { patientDisplayName } from '../../../profile/data/patient';
import type { DoctorPatientsStyles } from '../styles/patients.styles';

function ageFromBirth(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return String(age);
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}${mm}${yyyy} ${hh}:${min}`;
}

function initials(p: PatientProfile): string {
  return [p.firstName, p.lastName]
    .map((x) => x?.[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

type PatientListRowProps = {
  styles: DoctorPatientsStyles;
  patient: PatientProfile;
  onPress: () => void;
};

export function PatientListRow({ styles, patient, onPress }: PatientListRowProps) {
  const onDark = styles.rowGoText.color as string;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(patient)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {patientDisplayName(patient)}
        </Text>
        <Text style={styles.rowMeta}>{formatStamp(patient.createdAt)}</Text>
      </View>
      <Text style={styles.rowAge}>{ageFromBirth(patient.birthDate)}</Text>
      <View style={styles.rowGo}>
        <AppIcon icon={Icons.chevronRight} size={18} color={onDark} />
      </View>
    </Pressable>
  );
}
