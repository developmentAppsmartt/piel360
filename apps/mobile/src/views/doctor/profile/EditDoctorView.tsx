import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import type {
  DoctorProfile,
  UpdateDoctorInput,
} from '../../../services/doctors.service';
import { ProfileHeaderBar } from '../../profile/components/ProfileHeaderBar';
import { createEditProfileStyles } from '../../profile/edit/styles/editProfile.styles';
import { createProfileStyles } from '../../profile/styles/profile.styles';
import { EditDoctorForm } from './EditDoctorForm';

type EditDoctorViewProps = {
  doctor: DoctorProfile;
  onBack: () => void;
  onSave: (input: UpdateDoctorInput) => Promise<void>;
};

export function EditDoctorView({
  doctor,
  onBack,
  onSave,
}: EditDoctorViewProps) {
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
          <EditDoctorForm doctor={doctor} onSubmit={onSave} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
