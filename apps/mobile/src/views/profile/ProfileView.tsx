import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import {
  patientsService,
  type UpdatePatientInput,
} from '../../services/patients.service';
import type { PatientProfile } from '../../types/patient';
import { buildProfileContent } from './data/profileContent';
import { EditProfileView } from './edit/EditProfileView';
import { ProfileHeaderBar } from './components/ProfileHeaderBar';
import { ProfileIdentity } from './components/ProfileIdentity';
import { ProfileSection } from './components/ProfileSection';
import { createProfileStyles } from './styles/profile.styles';

type ProfileViewProps = {
  onBack?: () => void;
};

function initialToggles(
  sections: ReturnType<typeof buildProfileContent>['sections'],
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.kind === 'toggle') {
        next[row.id] = Boolean(row.toggleDefault);
      }
    }
  }
  return next;
}

export function ProfileView({ onBack }: ProfileViewProps) {
  const { user, logout } = useAuth();
  const branding = useBranding();
  const styles = useMemo(
    () => createProfileStyles(branding.colors),
    [branding.colors],
  );
  const role = user?.role ?? 'patient';

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadPatient = useCallback(async () => {
    if (role !== 'patient') {
      setPatient(null);
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const mine = await patientsService.getMyPatient();
      setPatient(mine);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el perfil.',
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  const content = useMemo(
    () =>
      buildProfileContent({
        role,
        userName: user?.name?.trim() || 'Usuario',
        email: user?.email ?? '',
        patient,
      }),
    [role, user?.email, user?.name, patient],
  );

  const [toggles, setToggles] = useState(() => initialToggles(content.sections));

  const handleRowPress = (rowId: string) => {
    const editable = new Set([
      'documento',
      'telefono',
      'birth_date',
      'gender',
      'address',
      'skin_type',
      'fitzpatrick_type',
      'mascot_type',
    ]);
    if (editable.has(rowId)) {
      if (!patient) {
        Alert.alert(
          'Perfil incompleto',
          'No hay un registro de paciente vinculado a tu cuenta.',
        );
        return;
      }
      setEditing(true);
      return;
    }
    Alert.alert(
      'Próximamente',
      `La opción "${rowId}" se conectará en una siguiente iteración.`,
    );
  };

  const handleEdit = () => {
    if (role !== 'patient') {
      Alert.alert(
        'Perfil doctor',
        'La edición del perfil profesional se conectará en una próxima iteración.',
      );
      return;
    }
    if (!patient) {
      Alert.alert(
        'Perfil incompleto',
        'No hay un registro de paciente vinculado a tu cuenta todavía.',
      );
      return;
    }
    setEditing(true);
  };

  const handleSave = async (input: UpdatePatientInput) => {
    if (!patient) return;
    const updated = await patientsService.update(patient.id, input);
    setPatient(updated);
    setEditing(false);
    Alert.alert('Listo', 'Tu perfil se actualizó correctamente.');
  };

  if (editing && patient) {
    return (
      <EditProfileView
        patient={patient}
        onBack={() => setEditing(false)}
        onSave={handleSave}
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={branding.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ProfileHeaderBar styles={styles} onBack={onBack} onEdit={handleEdit} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileIdentity
          styles={styles}
          displayName={content.displayName}
          subtitle={content.subtitle}
          secondarySubtitle={content.secondarySubtitle}
          avatarInitials={content.avatarInitials}
        />

        {loadError ? (
          <View style={styles.logoutWrap}>
            <Text style={{ color: branding.colors.error, marginBottom: 12 }}>
              {loadError}
            </Text>
            <Pressable style={styles.logoutButton} onPress={() => void loadPatient()}>
              <Text style={styles.logoutText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {content.sections.map((section) => (
          <ProfileSection
            key={section.id}
            styles={styles}
            accentColor={branding.colors.primary}
            section={section}
            toggles={toggles}
            onToggle={(rowId, next) =>
              setToggles((prev) => ({ ...prev, [rowId]: next }))
            }
            onRowPress={handleRowPress}
          />
        ))}

        <View style={styles.logoutWrap}>
          <Pressable
            style={styles.logoutButton}
            onPress={() => void logout()}
            accessibilityRole="button"
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
