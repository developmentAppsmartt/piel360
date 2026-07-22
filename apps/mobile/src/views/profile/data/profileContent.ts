import type { Role } from '../../../types/auth';
import type { PatientProfileDisplay } from './patient';
import {
  formatPatientDocument,
  formatPatientPhone,
  patientDisplayName,
} from './patient';

export type ProfileRowKind = 'nav' | 'toggle' | 'info';

export type ProfileRowConfig = {
  id: string;
  label: string;
  value?: string;
  kind: ProfileRowKind;
  icon?: 'clock' | 'robot' | 'mail' | 'skin' | 'phone' | 'doc' | 'calendar' | 'user' | 'home' | 'paw';
  toggleDefault?: boolean;
};

export type ProfileSectionConfig = {
  id: string;
  title: string;
  rows: ProfileRowConfig[];
};

export type ProfileContent = {
  displayName: string;
  subtitle: string;
  secondarySubtitle?: string;
  avatarInitials: string;
  sections: ProfileSectionConfig[];
};

const EMPTY = 'Sin registrar';

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function orEmpty(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY;
}

function formatBirthDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return orEmpty(iso);
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatSkinType(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const labels: Record<string, string> = {
    normal: 'Normal',
    dry: 'Seca',
    oily: 'Grasa',
    mixed: 'Mixta',
    sensitive: 'Sensible',
  };
  return labels[value] ?? value;
}

function formatFitzpatrick(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const labels: Record<string, string> = {
    I: 'Tipo I (Muy clara)',
    II: 'Tipo II (Clara)',
    III: 'Tipo III (Clara a intermedia)',
    IV: 'Tipo IV (Intermedia)',
    V: 'Tipo V (Oscura)',
    VI: 'Tipo VI (Muy oscura)',
  };
  return labels[value] ?? `Tipo ${value}`;
}

function formatMascot(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const labels: Record<string, string> = {
    none: 'No',
    dog: 'Perro',
    cat: 'Gato',
    other: 'Otro',
  };
  return labels[value] ?? value;
}

function formatGender(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const labels: Record<string, string> = {
    female: 'Femenino',
    male: 'Masculino',
    other: 'Otro',
    prefer_not: 'Prefiero no decir',
  };
  return labels[value.toLowerCase()] ?? value;
}

function buildPatientSections(patient?: PatientProfileDisplay | null): ProfileSectionConfig[] {
  const phone = formatPatientPhone(patient?.areaCode, patient?.phone);
  const document = formatPatientDocument(patient?.docType, patient?.docNumber);
  const surveyDone = Boolean(patient?.surveyCompletedAt);

  return [
    {
      id: 'personal',
      title: 'Información personal',
      rows: [
        {
          id: 'email',
          label: 'Correo',
          value: orEmpty(patient?.email),
          kind: 'info',
          icon: 'mail',
        },
        {
          id: 'documento',
          label: 'Documento',
          value: document ?? EMPTY,
          kind: 'nav',
          icon: 'doc',
        },
        {
          id: 'telefono',
          label: 'Teléfono',
          value: phone ?? EMPTY,
          kind: 'nav',
          icon: 'phone',
        },
        {
          id: 'birth_date',
          label: 'Fecha de nacimiento',
          value: formatBirthDate(patient?.birthDate),
          kind: 'nav',
          icon: 'calendar',
        },
        {
          id: 'gender',
          label: 'Género',
          value: formatGender(patient?.gender),
          kind: 'nav',
          icon: 'user',
        },
        {
          id: 'address',
          label: 'Dirección',
          value: orEmpty(patient?.address),
          kind: 'nav',
          icon: 'home',
        },
      ],
    },
    {
      id: 'clinico',
      title: 'Información clínica',
      rows: [
        {
          id: 'skin_type',
          label: 'Tipo de piel',
          value: formatSkinType(patient?.skinType),
          kind: 'nav',
          icon: 'skin',
        },
        {
          id: 'fitzpatrick_type',
          label: 'Fototipo',
          value: formatFitzpatrick(patient?.fitzpatrickType),
          kind: 'nav',
          icon: 'skin',
        },
        {
          id: 'mascot_type',
          label: 'Mascotas',
          value: formatMascot(patient?.mascotType),
          kind: 'nav',
          icon: 'paw',
        },
        {
          id: 'survey',
          label: 'Encuesta de salud',
          value: surveyDone ? 'Completada' : 'Pendiente',
          kind: 'nav',
        },
      ],
    },
    {
      id: 'preferencias',
      title: 'Preferencias de cuenta',
      rows: [
        {
          id: 'notificaciones',
          label: 'Notificaciones',
          kind: 'toggle',
          toggleDefault: true,
        },
        {
          id: 'idioma',
          label: 'Idioma',
          value: 'Español',
          kind: 'nav',
        },
      ],
    },
    {
      id: 'seguridad',
      title: 'Seguridad',
      rows: [
        { id: 'password', label: 'Cambiar Contraseña', kind: 'nav' },
        {
          id: 'biometria',
          label: 'Autenticación Biométrica',
          kind: 'toggle',
          toggleDefault: false,
        },
      ],
    },
    {
      id: 'soporte',
      title: 'Soporte',
      rows: [
        { id: 'ayuda', label: 'Ayuda y Tutoriales', kind: 'nav' },
        {
          id: 'contacto',
          label: 'Contactar Soporte',
          kind: 'nav',
          icon: 'mail',
        },
        {
          id: 'acerca',
          label: 'Acerca de',
          value: 'Versión 1.2.0',
          kind: 'info',
        },
      ],
    },
  ];
}

type BuildProfileOptions = {
  role: Role;
  userName: string;
  email: string;
  /** Datos de `patients` cuando el API esté conectado. */
  patient?: PatientProfileDisplay | null;
};

/** Contenido de perfil según rol (paciente usa campos de la tabla `patients`). */
export function buildProfileContent({
  role,
  userName,
  email,
  patient,
}: BuildProfileOptions): ProfileContent {
  if (role === 'doctor') {
    const name = userName.startsWith('Dr.') ? userName : `Dr. ${userName}`;
    return {
      displayName: name,
      subtitle: 'Dermatólogo Especialista',
      secondarySubtitle: 'Cédula Profesional: —',
      avatarInitials: initialsFromName(userName),
      sections: [
        {
          id: 'profesional',
          title: 'Información profesional',
          rows: [
            {
              id: 'especialidades',
              label: 'Especialidades',
              value: 'Dermatología',
              kind: 'nav',
            },
            {
              id: 'hospital',
              label: 'Hospital/Clínica',
              value: 'Sin asignar',
              kind: 'nav',
            },
            {
              id: 'horario',
              label: 'Horario de Atención',
              value: 'Lunes a Viernes 9:00 - 18:00',
              kind: 'nav',
              icon: 'clock',
            },
          ],
        },
        {
          id: 'preferencias',
          title: 'Preferencias de cuenta',
          rows: [
            {
              id: 'notificaciones',
              label: 'Notificaciones',
              kind: 'toggle',
              toggleDefault: true,
            },
            {
              id: 'idioma',
              label: 'Idioma',
              value: 'Español',
              kind: 'nav',
            },
            {
              id: 'ia',
              label: 'Configuración IA',
              value: 'Nivel de asistencia: Alto',
              kind: 'nav',
              icon: 'robot',
            },
          ],
        },
        {
          id: 'seguridad',
          title: 'Seguridad',
          rows: [
            { id: 'password', label: 'Cambiar Contraseña', kind: 'nav' },
            {
              id: 'biometria',
              label: 'Autenticación Biométrica',
              kind: 'toggle',
              toggleDefault: true,
            },
          ],
        },
        {
          id: 'soporte',
          title: 'Soporte',
          rows: [
            { id: 'ayuda', label: 'Ayuda y Tutoriales', kind: 'nav' },
            {
              id: 'contacto',
              label: 'Contactar Soporte',
              kind: 'nav',
              icon: 'mail',
            },
            {
              id: 'acerca',
              label: 'Acerca de',
              value: 'Versión 1.2.0',
              kind: 'info',
            },
          ],
        },
      ],
    };
  }

  const displayName = patient
    ? patientDisplayName(patient)
    : userName.trim() || 'Paciente';
  const subtitle = orEmpty(patient?.email ?? email);
  const surveyHint = patient?.surveyCompletedAt
    ? 'Encuesta completada'
    : 'Encuesta pendiente';

  return {
    displayName,
    subtitle: subtitle === EMPTY && email ? email : subtitle,
    secondarySubtitle: surveyHint,
    avatarInitials: initialsFromName(displayName),
    sections: buildPatientSections(patient),
  };
}
