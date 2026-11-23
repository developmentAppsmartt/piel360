/**
 * Textos legales de PIEL360: términos, política de datos y consentimientos
 * antes del análisis, para el web. El móvil tiene los mismos textos en
 * apps/mobile/src/data/legal/documents.ts (Metro no resuelve el workspace):
 * si cambias uno, cambia el otro.
 *
 * Al cambiar los términos o la política hay que subir `LEGAL_VERSION`: quien
 * aceptó una versión anterior vuelve a ver la pantalla de aceptación.
 */
export const LEGAL_VERSION = "2026-11-23";
export const LEGAL_UPDATED_LABEL = "23 de noviembre de 2026";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const TERMS_OF_USE: LegalDocument = {
  title: "Términos y Condiciones de Uso — PIEL360",
  intro: "Al registrarse y utilizar PIEL360, usted acepta estos Términos y Condiciones.",
  sections: [
    {
      title: "1. Uso de la plataforma",
      paragraphs: [
        "PIEL360 es una plataforma tecnológica para realizar análisis de la piel, generar reportes, gestionar pacientes, citas y otra información relacionada con el cuidado y seguimiento de la piel, de acuerdo con las funcionalidades disponibles para cada usuario.",
      ],
    },
    {
      title: "2. Análisis estético",
      paragraphs: [
        "El análisis estético utiliza herramientas digitales e inteligencia artificial para evaluar características de la piel y generar información orientativa para fines de cuidado, seguimiento y apoyo a protocolos estéticos.",
        "Este análisis no constituye un diagnóstico médico.",
      ],
    },
    {
      title: "3. Análisis dermatológico asistido por IA",
      paragraphs: [
        "El análisis dermatológico utiliza inteligencia artificial como herramienta de apoyo al profesional de la salud.",
        "Los resultados generados por PIEL360 no constituyen por sí solos un diagnóstico médico definitivo ni sustituyen la valoración, criterio o responsabilidad del profesional.",
        "El profesional es responsable de interpretar los resultados y determinar la conducta que corresponda.",
      ],
    },
    {
      title: "4. Resultados de inteligencia artificial",
      paragraphs: [
        "Los resultados pueden verse afectados por la calidad de las imágenes, iluminación, dispositivo utilizado, información suministrada, características del paciente y otros factores técnicos.",
        "PIEL360 no garantiza que un resultado de IA sea siempre exacto o concluyente.",
      ],
    },
    {
      title: "5. Datos personales e imágenes",
      paragraphs: [
        "PIEL360 podrá tratar datos personales, fotografías e información relacionada con la piel y, cuando corresponda, información sensible relacionada con la salud, de acuerdo con la autorización otorgada y la Política de Tratamiento de Datos Personales de PIEL360.",
        "El usuario se compromete a utilizar la información únicamente para las finalidades autorizadas.",
      ],
    },
    {
      title: "6. Responsabilidad del usuario profesional",
      paragraphs: [
        "Los profesionales deben utilizar PIEL360 dentro del ámbito de sus competencias, verificar la información del paciente y ejercer su criterio profesional.",
        "La utilización de PIEL360 no reemplaza la consulta, examen clínico ni los procedimientos que determine el profesional.",
      ],
    },
    {
      title: "7. Seguridad y confidencialidad",
      paragraphs: [
        "PIEL360 implementará medidas técnicas y organizativas destinadas a proteger la información frente a accesos no autorizados, pérdida, alteración o divulgación indebida.",
      ],
    },
    {
      title: "8. Uso adecuado",
      paragraphs: [
        "Está prohibido utilizar la plataforma para fines fraudulentos, acceder a información sin autorización, manipular resultados, vulnerar la seguridad del sistema o proporcionar información falsa.",
      ],
    },
    {
      title: "9. Disponibilidad",
      paragraphs: [
        "PIEL360 podrá realizar mantenimientos, actualizaciones o modificaciones de la plataforma y sus funcionalidades, por lo que pueden presentarse interrupciones temporales del servicio.",
      ],
    },
    {
      title: "10. Aceptación",
      paragraphs: [
        "Al seleccionar “Acepto”, usted declara haber leído y comprendido estos Términos y Condiciones y acepta el uso de PIEL360 conforme a los mismos.",
      ],
    },
  ],
};

/** La política completa: la misma que muestra la app
 * (apps/mobile/src/data/legal/documents.ts, LEGAL_PRIVACY). */
export const PRIVACY_POLICY: LegalDocument = {
  title: "Política de Privacidad y Tratamiento de Datos — PIEL360",
  intro: "Esta política describe cómo PIEL360 recopila, usa y protege datos personales e imágenes en el marco de la plataforma y sus módulos de análisis.",
  sections: [
    {
      title: "1. Responsable del tratamiento",
      paragraphs: [
        "PIEL360 actúa como responsable del tratamiento de los datos personales tratados a través de la aplicación, conforme a la normativa de protección de datos aplicable y a las autorizaciones otorgadas por el titular."
      ]
    },
    {
      title: "2. Datos que tratamos",
      paragraphs: [
        "Podemos tratar datos de identificación y contacto, datos de cuenta, información clínica o de cuidado de la piel suministrada por el usuario o el profesional, fotografías e imágenes de regiones cutáneas, registros de citas, reportes de análisis y datos técnicos de uso necesarios para operar el servicio.",
        "Cuando corresponda, podrá tratarse información sensible relacionada con la salud, únicamente para las finalidades autorizadas."
      ]
    },
    {
      title: "3. Finalidades",
      paragraphs: [
        "Los datos se tratan para prestar los servicios de la plataforma: análisis de la piel (estético, dermatológico asistido por IA y fototipo), generación de reportes, gestión de pacientes y citas, soporte técnico, seguridad, mejora del servicio y cumplimiento de obligaciones legales."
      ]
    },
    {
      title: "4. Análisis asistidos por IA",
      paragraphs: [
        "Las imágenes y datos necesarios pueden procesarse mediante herramientas digitales e inteligencia artificial para generar resultados orientativos o de apoyo profesional.",
        "Estos resultados no constituyen por sí solos un diagnóstico médico definitivo ni sustituyen el criterio de un profesional de la salud."
      ]
    },
    {
      title: "5. Confidencialidad y seguridad",
      paragraphs: [
        "PIEL360 implementa medidas técnicas y organizativas destinadas a proteger la información frente a accesos no autorizados, pérdida, alteración o divulgación indebida, alineadas con buenas prácticas de cumplimiento (incluidos marcos de referencia como GDPR, HIPAA e ISO 13485, según aplique al contexto operativo)."
      ]
    },
    {
      title: "6. Conservación",
      paragraphs: [
        "Los datos se conservarán durante el tiempo necesario para cumplir las finalidades autorizadas y las obligaciones legales aplicables. Posteriormente podrán eliminarse, anonimizarse o bloquearse según corresponda."
      ]
    },
    {
      title: "7. Derechos del titular",
      paragraphs: [
        "El titular podrá solicitar consulta, actualización, corrección, revocación de la autorización o supresión de sus datos, cuando legalmente corresponda, a través de los canales de contacto de PIEL360."
      ]
    },
    {
      title: "8. Aceptación",
      paragraphs: [
        "Al marcar la casilla de aceptación o continuar el uso de PIEL360 tras haber sido informado, usted autoriza el tratamiento de datos conforme a esta política y a los términos aplicables."
      ]
    }
  ]
};

export const TERMS_CHECK_LABEL = "He leído y acepto los Términos y Condiciones de PIEL360.";
export const PRIVACY_CHECK_LABEL = "He leído y acepto la Política de Tratamiento de Datos Personales.";

export interface AnalysisConsentText {
  title: string;
  paragraphs: string[];
  /** Frase en negrita dentro del texto. */
  emphasis: string;
  checkLabel: string;
  button: string;
}

export const DERM_ANALYSIS_CONSENT: AnalysisConsentText = {
  title: "Análisis dermatológico asistido por IA",
  paragraphs: [
    "PIEL360 utilizará inteligencia artificial para analizar la información e imágenes suministradas y generar resultados de apoyo para la valoración profesional.",
  ],
  emphasis: "Este resultado no sustituye el diagnóstico ni el criterio de un profesional de la salud.",
  checkLabel: "Acepto realizar el análisis y el tratamiento de mis datos para esta finalidad.",
  button: "Iniciar análisis",
};

export const AESTHETIC_ANALYSIS_CONSENT: AnalysisConsentText = {
  title: "Análisis Estético de la Piel",
  paragraphs: [
    "PIEL360 utilizará herramientas digitales e inteligencia artificial para analizar características visibles de su piel y generar un reporte orientativo para fines de cuidado, seguimiento y personalización de rutinas estéticas.",
  ],
  emphasis:
    "Este análisis no constituye un diagnóstico médico y no sustituye la valoración de un profesional de la salud.",
  checkLabel:
    "Acepto realizar el análisis y autorizo el tratamiento de la información necesaria para generar mi reporte.",
  button: "Iniciar análisis",
};
