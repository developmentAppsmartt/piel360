/** Textos cortos por métrica YouCam (vista de resultados). */

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

export function youcamMetricCopy(type: string | null | undefined): string {
  if (!type) return COPY.overview;
  return COPY[type] ?? COPY.overview;
}
