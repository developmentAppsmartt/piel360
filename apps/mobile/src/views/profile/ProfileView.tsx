import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { ApiError } from '../../services/api.client';
import {
  doctorsService,
  type DoctorProfile,
  type UpdateDoctorInput,
} from '../../services/doctors.service';
import {
  patientsService,
  type UpdatePatientInput,
} from '../../services/patients.service';
import { usersService } from '../../services/users.service';
import type { PatientProfile } from '../../types/patient';
import { isClinicalPanelRole, isDoctorVerificationActive } from '../../types/auth';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { buildProfileContent } from './data/profileContent';
import { EditProfileView } from './edit/EditProfileView';
import { ProfileIdentity } from './components/ProfileIdentity';
import { ProfileSection } from './components/ProfileSection';
import { createProfileStyles } from './styles/profile.styles';
import { AppModuleChrome } from '../shared/AppModuleChrome';

type EditDoctorViewComponent = typeof import('../doctor/profile/EditDoctorView').EditDoctorView;

type ProfileViewProps = {
  onBack?: () => void;
  onOpenMessages?: () => void;
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

const PATIENT_EDITABLE = new Set([
  'documento',
  'telefono',
  'birth_date',
  'gender',
  'address',
  'skin_type',
  'fitzpatrick_type',
  'mascot_type',
]);

const DOCTOR_EDITABLE = new Set([
  'documento',
  'telefono',
  'birth_date',
  'gender',
  'address',
  'city',
  'specialty',
  'medical_registry',
  'license',
  'education',
]);

export function ProfileView({ onBack, onOpenMessages }: ProfileViewProps) {
  const { user, logout, patchUser } = useAuth();
  const branding = useBranding();
  const styles = useMemo(
    () => createProfileStyles(branding.colors),
    [branding.colors],
  );
  const role = user?.role ?? 'patient';
  const isDoctor = isClinicalPanelRole(role);
  const doctorPending =
    isDoctor && !isDoctorVerificationActive(user?.verificationStatus);

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const [EditDoctorView, setEditDoctorView] =
    useState<EditDoctorViewComponent | null>(null);

  useEffect(() => {
    if (!editing || !isDoctor) return;
    let cancelled = false;
    void import('../doctor/profile/EditDoctorView')
      .then((mod) => {
        if (!cancelled) setEditDoctorView(() => mod.EditDoctorView);
      })
      .catch(() => {
        if (!cancelled) {
          setEditing(false);
          Alert.alert(
            'No se pudo abrir el editor',
            'Reinicia la app e inténtalo de nuevo.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editing, isDoctor]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isDoctor) {
        const mine = await doctorsService.getMe();
        setDoctor(mine);
        setPatient(null);
        setLocalAvatarUrl(resolveMediaUrl(mine.avatarUrl));
        await patchUser({ verificationStatus: mine.verificationStatus });
      } else if (role === 'patient') {
        const mine = await patientsService.getMyPatient();
        setPatient(mine);
        setDoctor(null);
        setLocalAvatarUrl(resolveMediaUrl(mine?.avatarUrl));
      } else {
        setPatient(null);
        setDoctor(null);
        setLocalAvatarUrl(null);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo cargar el perfil.',
      );
    } finally {
      setLoading(false);
    }
  }, [isDoctor, role, patchUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const content = useMemo(
    () =>
      buildProfileContent({
        role,
        userName: user?.name?.trim() || 'Usuario',
        email: user?.email ?? '',
        patient,
        doctor,
      }),
    [role, user?.email, user?.name, patient, doctor],
  );

  const [toggles, setToggles] = useState(() => initialToggles(content.sections));

  useEffect(() => {
    setToggles(initialToggles(content.sections));
    // Solo al cambiar de perfil cargado (no en cada rebuild de sections).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor?.id, patient?.id, isDoctor]);

  const handleRowPress = (rowId: string) => {
    if (isDoctor && DOCTOR_EDITABLE.has(rowId)) {
      if (!doctor) {
        Alert.alert(
          'Perfil incompleto',
          'No hay un registro de doctor vinculado a tu cuenta.',
        );
        return;
      }
      setEditing(true);
      return;
    }
    if (!isDoctor && PATIENT_EDITABLE.has(rowId)) {
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
    if (isDoctor) {
      if (!doctor) {
        Alert.alert(
          'Perfil incompleto',
          'No hay un registro de doctor vinculado a tu cuenta todavía.',
        );
        return;
      }
      setEditing(true);
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

  const handleSavePatient = async (input: UpdatePatientInput) => {
    if (!patient) return;
    const updated = await patientsService.update(patient.id, input);
    setPatient(updated);
    setEditing(false);
    Alert.alert('Listo', 'Tu perfil se actualizó correctamente.');
  };

  const handleSaveDoctor = async (input: UpdateDoctorInput) => {
    const updated = await doctorsService.updateMe(input);
    setDoctor(updated);
    setLocalAvatarUrl(resolveMediaUrl(updated.avatarUrl) ?? localAvatarUrl);
    setEditing(false);
    Alert.alert('Listo', 'Tu perfil profesional se actualizó correctamente.');
  };

  async function handleChangeAvatar() {
    if (avatarBusy) return;
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu galería para cambiar la foto de perfil.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    setAvatarBusy(true);
    try {
      const uploaded = await usersService.uploadAvatar(result.assets[0].uri);
      const url = resolveMediaUrl(uploaded.avatarUrl);
      setLocalAvatarUrl(url);
      if (isDoctor && doctor) {
        setDoctor({ ...doctor, avatarUrl: url });
      }
      if (!isDoctor && patient) {
        setPatient({ ...patient, avatarUrl: url });
      }
    } catch (err) {
      Alert.alert(
        'No se pudo subir',
        err instanceof ApiError
          ? err.message
          : 'Intenta con otra imagen (JPG o PNG).',
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  if (editing && isDoctor && doctor) {
    if (!EditDoctorView) {
      return (
        <View style={styles.screen}>
          <AppModuleChrome
            showBack
            onBack={() => setEditing(false)}
            onOpenMessages={onOpenMessages}
          >
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator size="large" color={branding.colors.primary} />
            </View>
          </AppModuleChrome>
        </View>
      );
    }
    return (
      <EditDoctorView
        doctor={doctor}
        onBack={() => setEditing(false)}
        onSave={handleSaveDoctor}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  if (editing && patient) {
    return (
      <EditProfileView
        patient={patient}
        onBack={() => setEditing(false)}
        onSave={handleSavePatient}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppModuleChrome
          showBack={Boolean(onBack)}
          onBack={onBack}
          onOpenMessages={onOpenMessages}
          onConfig={handleEdit}
        >
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <ActivityIndicator size="large" color={branding.colors.primary} />
          </View>
        </AppModuleChrome>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppModuleChrome
        showBack={Boolean(onBack)}
        onBack={onBack}
        onOpenMessages={onOpenMessages}
        onConfig={handleEdit}
      >
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
          avatarUrl={localAvatarUrl}
          avatarBusy={avatarBusy}
          onPressAvatar={() => void handleChangeAvatar()}
        />

        {doctorPending ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerTitle}>Verificación pendiente</Text>
            <Text style={styles.pendingBannerText}>
              Tu cuenta está en revisión. Solo puedes gestionar tu perfil hasta
              que un administrador active tu cuenta.
            </Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.logoutWrap}>
            <Text style={{ color: branding.colors.error, marginBottom: 12 }}>
              {loadError}
            </Text>
            <Pressable
              style={styles.logoutButton}
              onPress={() => void loadProfile()}
            >
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
      </AppModuleChrome>
    </View>
  );
}
