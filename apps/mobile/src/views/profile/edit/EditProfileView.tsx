import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { UpdatePatientInput } from '../../../services/patients.service';
import type { PatientAnalysisSummary } from '../../../types/analysis';
import type { PatientProfile } from '../../../types/patient';
import { useBranding } from '../../../context/BrandingContext';
import { AppModuleChrome } from '../../shared/AppModuleChrome';
import { EditProfileForm } from './components/EditProfileForm';
import { createEditProfileStyles } from './styles/editProfile.styles';

type EditProfileViewProps = {
  patient: PatientProfile;
  onBack: () => void;
  onSave: (input: UpdatePatientInput) => Promise<void>;
  title?: string;
  emailEditable?: boolean;
  analyses?: PatientAnalysisSummary[];
  onOpenMessages?: () => void;
};

export function EditProfileView({
  patient,
  onBack,
  onSave,
  title = 'Editar perfil',
  emailEditable = true,
  analyses,
  onOpenMessages,
}: EditProfileViewProps) {
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
            keyboardDismissMode="on-drag"
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
              {title}
            </Text>
            <EditProfileForm
              patient={patient}
              onSubmit={onSave}
              emailEditable={emailEditable}
              analyses={analyses}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </AppModuleChrome>
    </View>
  );
}
