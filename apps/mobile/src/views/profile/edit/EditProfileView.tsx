import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { UpdatePatientInput } from '../../../services/patients.service';
import type { PatientProfile } from '../../../types/patient';
import { useBranding } from '../../../context/BrandingContext';
import { ProfileHeaderBar } from '../components/ProfileHeaderBar';
import { createProfileStyles } from '../styles/profile.styles';
import { EditProfileForm } from './components/EditProfileForm';
import { createEditProfileStyles } from './styles/editProfile.styles';

type EditProfileViewProps = {
  patient: PatientProfile;
  onBack: () => void;
  onSave: (input: UpdatePatientInput) => Promise<void>;
};

export function EditProfileView({
  patient,
  onBack,
  onSave,
}: EditProfileViewProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createProfileStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createEditProfileStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ProfileHeaderBar
        styles={headerStyles}
        title="Editar perfil"
        onBack={onBack}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <EditProfileForm patient={patient} onSubmit={onSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
