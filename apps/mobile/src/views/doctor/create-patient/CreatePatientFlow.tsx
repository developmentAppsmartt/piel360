import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useBranding } from '../../../context/BrandingContext';
import { ApiError } from '../../../services/api.client';
import {
  patientsService,
  type CreatePatientInput,
} from '../../../services/patients.service';
import { DoctorHeader } from '../patients/components/DoctorHeader';
import { createDoctorPatientsStyles } from '../patients/styles/patients.styles';
import { ConsentStep } from './components/ConsentStep';
import { CreatePatientForm } from './components/CreatePatientForm';
import { CreatePatientSuccess } from './components/CreatePatientSuccess';
import { createCreatePatientStyles } from './styles/createPatient.styles';

type Step = 'form' | 'consent' | 'success';

type CreatePatientFlowProps = {
  onClose: () => void;
  onOpenMenu: () => void;
  onCreated?: () => void;
};

export function CreatePatientFlow({
  onClose,
  onOpenMenu,
  onCreated,
}: CreatePatientFlowProps) {
  const branding = useBranding();
  const headerStyles = useMemo(
    () => createDoctorPatientsStyles(branding.colors),
    [branding.colors],
  );
  const styles = useMemo(
    () => createCreatePatientStyles(branding.colors),
    [branding.colors],
  );

  const [step, setStep] = useState<Step>('form');
  const [draft, setDraft] = useState<CreatePatientInput | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitCreate() {
    if (!draft) return;
    setSubmitting(true);
    try {
      const created = await patientsService.create(draft);
      setCreatedId(created.id);
      setStep('success');
      onCreated?.();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof ApiError
          ? err.message
          : 'No se pudo crear el paciente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <DoctorHeader
        styles={headerStyles}
        title={step === 'success' ? undefined : 'Nuevo Paciente'}
        showBack={step !== 'success'}
        onBack={() => {
          if (step === 'consent') setStep('form');
          else onClose();
        }}
        onOpenMenu={onOpenMenu}
      />

      {step === 'form' ? (
        <CreatePatientForm
          onNext={(values) => {
            setDraft(values);
            setStep('consent');
          }}
        />
      ) : null}

      {step === 'consent' ? (
        <ConsentStep
          onBack={() => setStep('form')}
          onAccept={() => void submitCreate()}
          submitting={submitting}
        />
      ) : null}

      {step === 'success' && createdId ? (
        <CreatePatientSuccess
          patientId={createdId}
          onDone={onClose}
          onNewDermatology={() =>
            Alert.alert('Próximamente', 'El análisis dermatológico se conectará después.')
          }
          onNewSkinState={() =>
            Alert.alert('Próximamente', 'El análisis de estado de piel se conectará después.')
          }
        />
      ) : null}
    </View>
  );
}
