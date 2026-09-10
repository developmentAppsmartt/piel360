/** Textos legales de PIEL360 — fuente única para login, registro y flujos de análisis. */

export type LegalDocId =
  | 'terms'
  | 'terms-professional'
  | 'privacy'
  | 'privacy-aesthetic'
  | 'privacy-fototipo'
  | 'privacy-dermatological';

export type LegalSection = {
  heading?: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: LegalDocId;
  title: string;
  updatedAt: string;
  intro?: string;
  sections: LegalSection[];
};

const UPDATED = '7 de septiembre de 2026';

export const LEGAL_TERMS: LegalDocument = {
  id: 'terms',
  title: 'Términos y Condiciones de Uso — PIEL360',
  updatedAt: UPDATED,
  intro:
    'Al registrarse y utilizar PIEL360, usted acepta estos Términos y Condiciones.',
  sections: [
    {
      heading: '1. Uso de la plataforma',
      paragraphs: [
        'PIEL360 es una plataforma tecnológica para realizar análisis de la piel, generar reportes, gestionar pacientes, citas y otra información relacionada con el cuidado y seguimiento de la piel, de acuerdo con las funcionalidades disponibles para cada usuario.',
      ],
    },
    {
      heading: '2. Análisis estético',
      paragraphs: [
        'El análisis estético utiliza herramientas digitales e inteligencia artificial para evaluar características de la piel y generar información orientativa para fines de cuidado, seguimiento y apoyo a protocolos estéticos.',
        'Este análisis no constituye un diagnóstico médico.',
      ],
    },
    {
      heading: '3. Análisis dermatológico asistido por IA',
      paragraphs: [
        'El análisis dermatológico utiliza inteligencia artificial como herramienta de apoyo al profesional de la salud.',
        'Los resultados generados por PIEL360 no constituyen por sí solos un diagnóstico médico definitivo ni sustituyen la valoración, criterio o responsabilidad del profesional.',
        'El profesional es responsable de interpretar los resultados y determinar la conducta que corresponda.',
      ],
    },
    {
      heading: '4. Resultados de inteligencia artificial',
      paragraphs: [
        'Los resultados pueden verse afectados por la calidad de las imágenes, iluminación, dispositivo utilizado, información suministrada, características del paciente y otros factores técnicos.',
        'PIEL360 no garantiza que un resultado de IA sea siempre exacto o concluyente.',
      ],
    },
    {
      heading: '5. Datos personales e imágenes',
      paragraphs: [
        'PIEL360 podrá tratar datos personales, fotografías e información relacionada con la piel y, cuando corresponda, información sensible relacionada con la salud, de acuerdo con la autorización otorgada y la Política de Tratamiento de Datos Personales de PIEL360.',
        'El usuario se compromete a utilizar la información únicamente para las finalidades autorizadas.',
      ],
    },
    {
      heading: '6. Responsabilidad del usuario profesional',
      paragraphs: [
        'Los profesionales deben utilizar PIEL360 dentro del ámbito de sus competencias, verificar la información del paciente y ejercer su criterio profesional.',
        'La utilización de PIEL360 no reemplaza la consulta, examen clínico ni los procedimientos que determine el profesional.',
      ],
    },
    {
      heading: '7. Seguridad y confidencialidad',
      paragraphs: [
        'PIEL360 implementará medidas técnicas y organizativas destinadas a proteger la información frente a accesos no autorizados, pérdida, alteración o divulgación indebida.',
      ],
    },
    {
      heading: '8. Uso adecuado',
      paragraphs: [
        'Está prohibido utilizar la plataforma para fines fraudulentos, acceder a información sin autorización, manipular resultados, vulnerar la seguridad del sistema o proporcionar información falsa.',
      ],
    },
    {
      heading: '9. Disponibilidad',
      paragraphs: [
        'PIEL360 podrá realizar mantenimientos, actualizaciones o modificaciones de la plataforma y sus funcionalidades, por lo que pueden presentarse interrupciones temporales del servicio.',
      ],
    },
    {
      heading: '10. Aceptación',
      paragraphs: [
        'Al seleccionar “Acepto”, usted declara haber leído y comprendido estos Términos y Condiciones y acepta el uso de PIEL360 conforme a los mismos.',
      ],
    },
  ],
};

export const LEGAL_TERMS_PROFESSIONAL: LegalDocument = {
  id: 'terms-professional',
  title: 'Acuerdo de usuario — Profesional',
  updatedAt: UPDATED,
  intro:
    'Al utilizar PIEL360 como profesional de la salud o de la estética, usted acepta este Acuerdo de usuario y los Términos y Condiciones aplicables al rol profesional.',
  sections: [
    {
      heading: '1. Alcance del rol profesional',
      paragraphs: [
        'PIEL360 pone a su disposición herramientas de análisis de la piel, gestión de pacientes, citas, mensajería y reportes, según el plan y los permisos asociados a su cuenta profesional o empresarial.',
        'El uso de la plataforma queda limitado al ejercicio profesional autorizado y a las finalidades previstas en su perfil.',
      ],
    },
    {
      heading: '2. Análisis asistidos por inteligencia artificial',
      paragraphs: [
        'Los módulos de análisis (dermatológico, estético y fototipo) utilizan inteligencia artificial como apoyo a su valoración.',
        'Los resultados no constituyen por sí solos un diagnóstico médico definitivo ni sustituyen el examen clínico, el criterio profesional ni la responsabilidad del profesional tratante.',
        'Usted es responsable de interpretar los resultados, contrastarlos con la información clínica disponible y determinar la conducta que corresponda.',
      ],
    },
    {
      heading: '3. Responsabilidad sobre pacientes e imágenes',
      paragraphs: [
        'Al solicitar, capturar o recibir imágenes y datos de pacientes, usted garantiza contar con la autorización pertinente y utilizarlos únicamente para la atención, seguimiento y finalidades autorizadas.',
        'No debe compartir información clínica ni imágenes fuera de los canales seguros de PIEL360 ni con terceros no autorizados.',
      ],
    },
    {
      heading: '4. Confidencialidad y seguridad',
      paragraphs: [
        'Debe proteger el acceso a su cuenta, no compartir credenciales y notificar cualquier uso indebido.',
        'PIEL360 implementa medidas técnicas y organizativas para proteger la información; el profesional colaborará en el uso seguro de la plataforma.',
      ],
    },
    {
      heading: '5. Uso adecuado',
      paragraphs: [
        'Está prohibido manipular resultados, acceder a datos de pacientes sin autorización, utilizar la plataforma con fines fraudulentos o vulnerar la seguridad del sistema.',
      ],
    },
    {
      heading: '6. Aceptación',
      paragraphs: [
        'Al continuar usando PIEL360 con rol profesional, usted declara haber leído y comprendido este Acuerdo de usuario y acepta utilizar la plataforma conforme al mismo y a la normativa aplicable.',
      ],
    },
  ],
};

export const LEGAL_PRIVACY: LegalDocument = {
  id: 'privacy',
  title: 'Política de Privacidad y Tratamiento de Datos — PIEL360',
  updatedAt: UPDATED,
  intro:
    'Esta política describe cómo PIEL360 recopila, usa y protege datos personales e imágenes en el marco de la plataforma y sus módulos de análisis.',
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        'PIEL360 actúa como responsable del tratamiento de los datos personales tratados a través de la aplicación, conforme a la normativa de protección de datos aplicable y a las autorizaciones otorgadas por el titular.',
      ],
    },
    {
      heading: '2. Datos que tratamos',
      paragraphs: [
        'Podemos tratar datos de identificación y contacto, datos de cuenta, información clínica o de cuidado de la piel suministrada por el usuario o el profesional, fotografías e imágenes de regiones cutáneas, registros de citas, reportes de análisis y datos técnicos de uso necesarios para operar el servicio.',
        'Cuando corresponda, podrá tratarse información sensible relacionada con la salud, únicamente para las finalidades autorizadas.',
      ],
    },
    {
      heading: '3. Finalidades',
      paragraphs: [
        'Los datos se tratan para prestar los servicios de la plataforma: análisis de la piel (estético, dermatológico asistido por IA y fototipo), generación de reportes, gestión de pacientes y citas, soporte técnico, seguridad, mejora del servicio y cumplimiento de obligaciones legales.',
      ],
    },
    {
      heading: '4. Análisis asistidos por IA',
      paragraphs: [
        'Las imágenes y datos necesarios pueden procesarse mediante herramientas digitales e inteligencia artificial para generar resultados orientativos o de apoyo profesional.',
        'Estos resultados no constituyen por sí solos un diagnóstico médico definitivo ni sustituyen el criterio de un profesional de la salud.',
      ],
    },
    {
      heading: '5. Confidencialidad y seguridad',
      paragraphs: [
        'PIEL360 implementa medidas técnicas y organizativas destinadas a proteger la información frente a accesos no autorizados, pérdida, alteración o divulgación indebida, alineadas con buenas prácticas de cumplimiento (incluidos marcos de referencia como GDPR, HIPAA e ISO 13485, según aplique al contexto operativo).',
      ],
    },
    {
      heading: '6. Conservación',
      paragraphs: [
        'Los datos se conservarán durante el tiempo necesario para cumplir las finalidades autorizadas y las obligaciones legales aplicables. Posteriormente podrán eliminarse, anonimizarse o bloquearse según corresponda.',
      ],
    },
    {
      heading: '7. Derechos del titular',
      paragraphs: [
        'El titular podrá solicitar consulta, actualización, corrección, revocación de la autorización o supresión de sus datos, cuando legalmente corresponda, a través de los canales de contacto de PIEL360.',
      ],
    },
    {
      heading: '8. Aceptación',
      paragraphs: [
        'Al marcar la casilla de aceptación o continuar el uso de PIEL360 tras haber sido informado, usted autoriza el tratamiento de datos conforme a esta política y a los términos aplicables.',
      ],
    },
  ],
};

export const LEGAL_PRIVACY_AESTHETIC: LegalDocument = {
  id: 'privacy-aesthetic',
  title: 'Privacidad — Análisis Estético',
  updatedAt: UPDATED,
  intro:
    'Para realizar el análisis estético, PIEL360 recopila y procesa los datos e imágenes necesarios para evaluar características visibles de la piel, generar el reporte y permitir su seguimiento.',
  sections: [
    {
      heading: 'Tratamiento de datos e imágenes',
      paragraphs: [
        'Las fotografías y la información relacionada con la piel serán tratadas de forma confidencial y segura, únicamente para las finalidades autorizadas y conforme a la normativa de protección de datos aplicable.',
      ],
    },
    {
      heading: 'Naturaleza del análisis',
      paragraphs: [
        'PIEL360 utilizará herramientas digitales e inteligencia artificial para analizar características visibles de su piel y generar un reporte orientativo para fines de cuidado, seguimiento y personalización de rutinas estéticas.',
        'Este análisis no constituye un diagnóstico médico y no sustituye la valoración de un profesional de la salud.',
      ],
    },
    {
      heading: 'Derechos del titular',
      paragraphs: [
        'El titular podrá solicitar consulta, actualización, corrección, revocación de la autorización o supresión de sus datos, cuando legalmente corresponda.',
      ],
    },
    {
      heading: 'Autorización',
      paragraphs: [
        'Al continuar, usted autoriza a PIEL360 y al responsable del análisis a tratar sus datos e imágenes para realizar el análisis estético, generar el reporte y realizar seguimiento.',
      ],
    },
  ],
};

export const LEGAL_PRIVACY_FOTOTIPO: LegalDocument = {
  id: 'privacy-fototipo',
  title: 'Privacidad — Análisis de Fototipo',
  updatedAt: UPDATED,
  intro:
    'Para realizar el análisis de fototipo, PIEL360 recopila y procesa los datos e imágenes necesarios para estimar el tipo de piel según la escala de Fitzpatrick, orientar recomendaciones de protección solar y permitir el seguimiento.',
  sections: [
    {
      heading: 'Tratamiento de datos e imágenes',
      paragraphs: [
        'Las fotografías faciales o de la zona evaluada y la información relacionada con el tono y la sensibilidad de la piel serán tratadas de forma confidencial y segura, únicamente para las finalidades autorizadas y conforme a la normativa de protección de datos aplicable.',
      ],
    },
    {
      heading: 'Naturaleza del análisis',
      paragraphs: [
        'PIEL360 utilizará herramientas digitales e inteligencia artificial para clasificar el fototipo y generar información orientativa sobre protección solar y cuidado de la piel.',
        'Este análisis no constituye un diagnóstico médico y no sustituye la valoración de un profesional de la salud.',
      ],
    },
    {
      heading: 'Derechos del titular',
      paragraphs: [
        'El titular podrá solicitar consulta, actualización, corrección, revocación de la autorización o supresión de sus datos, cuando legalmente corresponda.',
      ],
    },
    {
      heading: 'Autorización',
      paragraphs: [
        'Al continuar, usted autoriza a PIEL360 y al responsable del análisis a tratar sus datos e imágenes para realizar el análisis de fototipo, generar el reporte y realizar seguimiento.',
      ],
    },
  ],
};

export const LEGAL_PRIVACY_DERMATOLOGICAL: LegalDocument = {
  id: 'privacy-dermatological',
  title: 'Privacidad — Análisis Dermatológico asistido por IA',
  updatedAt: UPDATED,
  intro:
    'Para el análisis dermatológico, PIEL360 trata imágenes de la zona cutánea e información asociada con el fin de generar resultados de apoyo a la valoración profesional.',
  sections: [
    {
      heading: 'Naturaleza del análisis',
      paragraphs: [
        'PIEL360 utilizará inteligencia artificial para analizar la información e imágenes suministradas y generar resultados de apoyo para la valoración profesional.',
        'Este resultado no sustituye el diagnóstico ni el criterio de un profesional de la salud.',
      ],
    },
    {
      heading: 'Tratamiento de datos',
      paragraphs: [
        'Las imágenes y datos serán tratados de forma confidencial y segura, únicamente para las finalidades autorizadas y conforme a la Política de Tratamiento de Datos Personales de PIEL360 y la normativa aplicable.',
      ],
    },
    {
      heading: 'Autorización',
      paragraphs: [
        'Al continuar, usted acepta realizar el análisis y el tratamiento de los datos para esta finalidad.',
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocId, LegalDocument> = {
  terms: LEGAL_TERMS,
  'terms-professional': LEGAL_TERMS_PROFESSIONAL,
  privacy: LEGAL_PRIVACY,
  'privacy-aesthetic': LEGAL_PRIVACY_AESTHETIC,
  'privacy-fototipo': LEGAL_PRIVACY_FOTOTIPO,
  'privacy-dermatological': LEGAL_PRIVACY_DERMATOLOGICAL,
};

export function getLegalDocument(id: LegalDocId): LegalDocument {
  return LEGAL_DOCUMENTS[id];
}

/** Textos cortos para pantallas de consentimiento pre-análisis. */
export const ANALYSIS_CONSENT_COPY = {
  skiniver: {
    title: 'Análisis dermatológico asistido por IA',
    subtitle: 'Antes de iniciar',
    body: 'PIEL360 utilizará inteligencia artificial para analizar la información e imágenes suministradas y generar resultados de apoyo para la valoración profesional. Este resultado no sustituye el diagnóstico ni el criterio de un profesional de la salud.',
    checkbox:
      'Acepto realizar el análisis y el tratamiento de mis datos para esta finalidad.',
    cta: 'Iniciar análisis',
    privacyDocId: 'privacy-dermatological' as LegalDocId,
  },
  youcam: {
    title: 'Análisis Estético de la Piel',
    subtitle: 'Antes de iniciar',
    body: 'PIEL360 utilizará herramientas digitales e inteligencia artificial para analizar características visibles de su piel y generar un reporte orientativo para fines de cuidado, seguimiento y personalización de rutinas estéticas.\n\nEste análisis no constituye un diagnóstico médico y no sustituye la valoración de un profesional de la salud.',
    privacyShort:
      'Privacidad: Tus datos e imágenes serán tratados de forma segura y confidencial para realizar el análisis estético, generar tu reporte y permitir su seguimiento, conforme a nuestra Política de Tratamiento de Datos Personales.',
    checkbox: 'Autorizo el tratamiento de mis datos e imágenes.',
    cta: 'Continuar',
    privacyDocId: 'privacy-aesthetic' as LegalDocId,
  },
  fitzpatrick: {
    title: 'Análisis de Fototipo',
    subtitle: 'Antes de iniciar',
    body: 'PIEL360 utilizará herramientas digitales e inteligencia artificial para estimar su fototipo de piel y generar información orientativa sobre protección solar y cuidado.\n\nEste análisis no constituye un diagnóstico médico y no sustituye la valoración de un profesional de la salud.',
    privacyShort:
      'Privacidad: Tus datos e imágenes serán tratados de forma segura y confidencial para realizar el análisis de fototipo, generar tu reporte y permitir su seguimiento, conforme a nuestra Política de Tratamiento de Datos Personales.',
    checkbox: 'Autorizo el tratamiento de mis datos e imágenes.',
    cta: 'Continuar',
    privacyDocId: 'privacy-fototipo' as LegalDocId,
  },
} as const;
