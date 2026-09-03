import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useBranding } from '../../../context/BrandingContext';
import type {
  DoctorProfile,
  UpdateDoctorInput,
} from '../../../services/doctors.service';
import { AppModuleChrome } from '../../shared/AppModuleChrome';
import { createEditProfileStyles } from '../../profile/edit/styles/editProfile.styles';
import { EditDoctorForm } from './EditDoctorForm';

type EditDoctorViewProps = {
  doctor: DoctorProfile;
  onBack: () => void;
  onSave: (input: UpdateDoctorInput) => Promise<void>;
  onOpenMessages?: () => void;
};

export function EditDoctorView({
  doctor,
  onBack,
  onSave,
  onOpenMessages,
}: EditDoctorViewProps) {
  const branding = useBranding();
  const styles = useMemo(
    () => createEditProfileStyles(branding.colors),
    [branding.colors],
  );

  return (
    <View style={styles.screen}>
      <AppModuleChrome
        showBack
        onBack={onBack}
        onOpenMessages={onOpenMessages}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: branding.colors.text,
                marginBottom: 12,
              }}
            >
              Editar perfil
            </Text>
            <EditDoctorForm doctor={doctor} onSubmit={onSave} />
          </ScrollView>
        </KeyboardAvoidingView>
      </AppModuleChrome>
    </View>
  );
}
