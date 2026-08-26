/** Textos descriptivos y consejos por métrica YouCam (reporte / detalle). */

const COPY: Record<string, string> = {
  overview:
    'Piel 360 usa modelos de aprendizaje profundo entrenados con decenas de miles de imágenes para estimar la edad de la piel y asignar un puntaje de salud facial.',
  hd_skin_type:
    'El diagnóstico identifica zonas T y U para clasificar el tipo de piel (grasa, normal o seca) y orientar el cuidado diario.',
  hd_acne:
    'La IA localiza puntos negros, espinillas y erupciones para cuantificar el nivel de acné visible en el rostro.',
  hd_age_spot:
    'Se identifican manchas pigmentadas excluyendo lunares y vello facial, para medir el nivel de manchas de edad.',
  hd_dark_circle:
    'El algoritmo analiza la zona bajo los ojos para cuantificar la severidad de las ojeras.',
  hd_droopy_lower_eyelid:
    'Se examina la flacidez del párpado inferior para estimar el grado de caída o flacidez.',
  hd_droopy_upper_eyelid:
    'Se examina la flacidez del párpado superior para estimar el grado de caída.',
  hd_wrinkle:
    'Se detectan líneas y arrugas en frente, entrecejo, patas de gallo y otras zonas del rostro.',
  hd_texture:
    'Se evalúa la rugosidad y uniformidad superficial de la piel en el área analizada.',
  hd_pore:
    'Se cuantifica la visibilidad de poros, especialmente en zona T y mejillas.',
  hd_firmness:
    'Se estima la firmeza cutánea a partir de la tensión y el contorno facial.',
  hd_moisture:
    'Se estima el nivel de hidratación aparente de la piel en la imagen analizada.',
  hd_oiliness:
    'Se mide la oleosidad visible, útil para distinguir piel grasa o mixta.',
  hd_radiance:
    'Se evalúa el brillo y la luminosidad aparente de la piel.',
  hd_redness:
    'Se detectan zonas de enrojecimiento que pueden indicar sensibilidad o irritación.',
  hd_eye_bag:
    'Se identifica el volumen y la presencia de bolsas bajo los ojos.',
  hd_tear_trough:
    'Se analiza el surco lagrimal y su profundidad relativa en el contorno ocular.',
};

/** Textos por zona (type:region) — se muestran al elegir un pill de subzona. */
const REGION_COPY: Record<string, string> = {
  'hd_wrinkle:whole':
    'Vista general de arrugas en todo el rostro. Combina frente, entrecejo, ojos y surcos alrededor de la boca.',
  'hd_wrinkle:forehead':
    'Líneas horizontales de la frente. Suelen aparecer con expresiones de sorpresa o tensión y con la exposición solar acumulada.',
  'hd_wrinkle:glabellar':
    'Arrugas del entrecejo (líneas de expresión al fruncir el ceño). Son frecuentes con estrés o concentración prolongada.',
  'hd_wrinkle:crowfeet':
    'Patas de gallo: líneas en el extremo externo de los ojos al sonreír o entrecerrar. La zona es fina y muy expuesta al sol.',
  'hd_wrinkle:periocular':
    'Arrugas del contorno de ojos. La piel periocular es delicada y muestra pronto deshidratación o fatiga.',
  'hd_wrinkle:nasolabial':
    'Surcos nasolabiales (de la nariz a las comisuras). Marcan el pliegue de la sonrisa y el soporte de los tejidos.',
  'hd_wrinkle:marionette':
    'Líneas de marioneta: de las comisuras hacia la mandíbula. Influyen en la expresión de fatiga o caída del tercio inferior.',
  'hd_pore:whole':
    'Visibilidad general de poros en el rostro. Útil para priorizar limpieza e hidratación equilibrada.',
  'hd_pore:forehead':
    'Poros en la frente (zona T superior). Suele concentrar sebo y residual de maquillaje o protector solar.',
  'hd_pore:nose':
    'Poros en la nariz. Es una de las zonas con más actividad sebácea; la limpieza suave marca la diferencia.',
  'hd_pore:cheek':
    'Poros en mejillas. Pueden verse más con deshidratación o productos comedogénicos.',
  'hd_skin_type:whole':
    'Clasificación global del tipo de piel combinando zona T y zona U.',
  'hd_skin_type:t_zone':
    'Zona T (frente, nariz y mentón): suele ser más grasa. Ayuda a elegir limpiadores y productos oil-control.',
  'hd_skin_type:u_zone':
    'Zona U (mejillas): suele ser más seca o sensible. Guía la hidratación y el cuidado calmante.',
};

/** Consejos accionables según banda de puntuación (estilo reporte Perfect). */
const ADVICE: Record<string, { regular: string; promedio: string; buena: string }> = {
  hd_wrinkle: {
    regular:
      'La exposición solar acelera las arrugas. Usa protector solar SPF 30 o superior a diario y reaplícalo. Un retinoide nocturno puede ayudar bajo supervisión profesional.',
    promedio:
      'Vas por buen camino. Refuerza SPF a diario y considera un sérum con péptidos o retinol suave para mejorar la apariencia de las líneas.',
    buena:
      '¡Se ve muy bien! Mantén el SPF para proteger esa piel suave y evita hábitos que sequen o irradien el rostro.',
  },
  hd_age_spot: {
    regular:
      'Las manchas suelen relacionarse con el sol. Prioriza SPF diario y consulta opciones de despigmentación (vitamina C, niacinamida) con tu dermatólogo.',
    promedio:
      'Hay algo de pigmentación. Un antioxidante por la mañana y SPF constante ayudan a uniformar el tono con el tiempo.',
    buena:
      'Tu tono se ve uniforme. Sigue con protección solar para evitar nuevas manchas.',
  },
  hd_texture: {
    regular:
      'La textura irregular mejora con hidratación constante y exfoliación suave (AHA/BHA) 1–2 veces por semana, según tolerancia.',
    promedio:
      'Un poco de cuidado extra puede alisar zonas ásperas: hidratante rico y exfoliación suave ocasional.',
    buena:
      'La superficie se ve pareja. Mantén hidratación y SPF para conservar ese acabado.',
  },
  hd_dark_circle: {
    regular:
      'Las ojeras mejoran con sueño, menos sal y un contorno con cafeína o vitamina K. Si persisten, valora valoración clínica.',
    promedio:
      'Un contorno de ojos hidratante y descanso regular pueden suavizar la zona periocular.',
    buena:
      'La zona bajo los ojos se ve descansada. Mantén la rutina de contorno y descanso.',
  },
  hd_firmness: {
    regular:
      'La firmeza responde a SPF, hábitos saludables y activos como péptidos o retinoides. Evita el tabaco y la deshidratación.',
    promedio:
      'Un sérum reafirmante y masajes faciales suaves pueden apoyar el contorno con el tiempo.',
    buena:
      'Buen tono y soporte cutáneo. Mantén hidratación y protección solar.',
  },
  hd_pore: {
    regular:
      'Limpieza suave dos veces al día y niacinamida ayudan a que los poros se vean menos. Evita productos comedogénicos.',
    promedio:
      'Equilibra grasa e hidratación: limpia sin resecar y usa un tónico con BHA si tu piel lo tolera.',
    buena:
      'Los poros se ven controlados. Mantén una limpieza consistente y no abuses de la exfoliación.',
  },
  hd_acne: {
    regular:
      'Mantén una rutina suave (limpiador + hidratante no graso). Evita exprimir lesiones y consulta si el acné es inflamatorio.',
    promedio:
      'Controla el exceso de grasa sin resecar. Un tratamiento local con ácido salicílico puede ayudar en brotes leves.',
    buena:
      'Pocos signos de acné. Sigue una rutina limpia y no abrasiva para prevenir brotes.',
  },
  hd_moisture: {
    regular:
      'Tu piel parece necesitar más agua. Usa un hidratante con humectantes (glicerina, ácido hialurónico) mañana y noche.',
    promedio:
      'Un poco más de hidratación podría mejorar la suavidad. No olvides beber agua y usar crema tras limpiar.',
    buena:
      'Buen nivel de hidratación aparente. Mantén tu crema habitual y ajusta en climas secos.',
  },
  hd_oiliness: {
    regular:
      'Exceso de brillo: limpia con gel suave, evita cremas muy oclusivas y prueba niacinamida para equilibrar sebo.',
    promedio:
      'Brillo moderado. Usa hidratante en gel y un protector oil-free.',
    buena:
      'Sebo bien controlado. Mantén la rutina equilibrada sin resecar.',
  },
  hd_radiance: {
    regular:
      'Para más luminosidad: exfoliación suave, vitamina C por la mañana y buena hidratación.',
    promedio:
      'Un boost de antioxidantes y SPF puede potenciar el brillo saludable.',
    buena:
      'La piel se ve luminosa. Mantén antioxidantes y protección solar.',
  },
  hd_redness: {
    regular:
      'Prioriza productos calmantes (centella, ceramidas) y evita alcohol/fragancias. Usa SPF mineral si hay sensibilidad.',
    promedio:
      'Calma la piel con hidratantes barrera y reduce exfoliantes fuertes unos días.',
    buena:
      'Poco enrojecimiento. Sigue con productos suaves y protección solar.',
  },
  hd_eye_bag: {
    regular:
      'Reduce sal y eleva la cabecera al dormir. Contornos fríos y cafeína pueden aliviar temporalmente.',
    promedio:
      'Descanso y drenaje suave ayudan. Mantén el contorno de ojos hidratante.',
    buena:
      'Poca evidencia de bolsas. Mantén hábitos de sueño y cuidado periocular.',
  },
  hd_tear_trough: {
    regular:
      'Hidrata el contorno y evita frotar. Si el surco es profundo, un especialista puede orientar opciones.',
    promedio:
      'Un contorno nutritivo y SPF ayudan a que la zona se vea más uniforme.',
    buena:
      'El contorno se ve suave. Mantén la rutina periocular.',
  },
  hd_droopy_upper_eyelid: {
    regular:
      'La flacidez del párpado superior suele ser multifactorial. SPF y hábitos saludables ayudan; valora valoración clínica si molesta.',
    promedio:
      'Mantén el contorno hidratado y protección solar en la zona ocular.',
    buena:
      'Buen soporte del párpado superior. Continúa con cuidado suave.',
  },
  hd_droopy_lower_eyelid: {
    regular:
      'Cuida la zona con contorno hidratante y evita tirones. Consulta si hay cambios notables.',
    promedio:
      'Hidratación y descanso apoyan el contorno inferior.',
    buena:
      'El párpado inferior se ve firme. Mantén tu rutina actual.',
  },
  hd_skin_type: {
    regular:
      'Adapta limpiador e hidratante a tu tipo de piel y evita productos que la desequilibren.',
    promedio:
      'Elige productos acordes a tu tipo (grasa, seca o mixta) para mantener el equilibrio.',
    buena:
      'Tu tipo de piel está bien caracterizado. Mantén una rutina coherente con él.',
  },
};

const DEFAULT_ADVICE = {
  regular:
    'Con un poco más de cuidado enfocado puedes mejorar esta área. Revisa la rutina y la protección solar diaria.',
  promedio:
    'Vas en buen camino. Pequeños ajustes en hidratación y SPF pueden llevarte al siguiente nivel.',
  buena:
    '¡Excelente resultado en esta métrica! Mantén tu rutina y la protección solar.',
};

export function youcamMetricCopy(
  type: string | null | undefined,
  region?: string | null,
): string {
  if (!type) return COPY.overview;
  if (region) {
    const key = `${type}:${region}`;
    if (REGION_COPY[key]) return REGION_COPY[key];
  }
  return COPY[type] ?? COPY.overview;
}

export function youcamMetricAdvice(
  type: string | null | undefined,
  band: 'regular' | 'promedio' | 'buena',
  regionLabel?: string | null,
): string {
  const base = !type
    ? DEFAULT_ADVICE[band]
    : (ADVICE[type]?.[band] ?? DEFAULT_ADVICE[band]);
  if (!regionLabel || regionLabel === 'General') return base;
  return `${regionLabel}: ${base}`;
}
