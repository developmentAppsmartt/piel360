-- Historia clínica que llena el profesional, aparte de `patients` y de la
-- encuesta del paciente (`patients.survey_responses`):
--   patient_clinical_profiles        1:1, valores únicos por paciente
--   clinical_history_groups / items  catálogo de preguntas Sí/No
--   patient_clinical_history_answers respuestas (sin fila = sin responder)
--   patient_consents                 consentimientos con quién y cuándo
-- Los valores de los CHECK son los de packages/shared/src/patient-clinical-history.ts.

CREATE TABLE "patient_clinical_profiles" (
    "patient_id" BIGINT NOT NULL,
    "consultation_reason" TEXT,
    "sun_exposure" TEXT,
    "cosmetic_routine" TEXT,
    "recent_procedures" TEXT,
    "relevant_medication" TEXT,
    "known_allergies" TEXT,
    "dermatological_history" TEXT,
    "frequent_sensitivity" TEXT,
    "pregnancy_lactation" TEXT,
    "smoking" TEXT,
    "alcohol" TEXT,
    "sleep_quality" TEXT,
    "stress_level" TEXT,
    "menopause" TEXT,
    "pcos" TEXT,
    "contraceptive_method" TEXT,
    "expectations" TEXT,
    "recovery_availability" TEXT,
    "aesthetic_history_detail" TEXT,
    "updated_by_user_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_clinical_profiles_pkey" PRIMARY KEY ("patient_id"),
    CONSTRAINT "patient_clinical_profiles_sun_exposure_check" CHECK ("sun_exposure" IN ('low', 'moderate', 'high', 'very_high')),
    CONSTRAINT "patient_clinical_profiles_frequent_sensitivity_check" CHECK ("frequent_sensitivity" IN ('yes', 'no', 'sometimes')),
    CONSTRAINT "patient_clinical_profiles_pregnancy_lactation_check" CHECK ("pregnancy_lactation" IN ('yes', 'no', 'not_applicable')),
    CONSTRAINT "patient_clinical_profiles_menopause_check" CHECK ("menopause" IN ('yes', 'no', 'not_applicable')),
    CONSTRAINT "patient_clinical_profiles_pcos_check" CHECK ("pcos" IN ('yes', 'no', 'not_applicable')),
    CONSTRAINT "patient_clinical_profiles_smoking_check" CHECK ("smoking" IN ('none', 'occasional', 'frequent')),
    CONSTRAINT "patient_clinical_profiles_alcohol_check" CHECK ("alcohol" IN ('none', 'occasional', 'frequent')),
    CONSTRAINT "patient_clinical_profiles_sleep_quality_check" CHECK ("sleep_quality" IN ('good', 'regular', 'poor')),
    CONSTRAINT "patient_clinical_profiles_stress_level_check" CHECK ("stress_level" IN ('low', 'medium', 'high')),
    CONSTRAINT "patient_clinical_profiles_recovery_availability_check" CHECK ("recovery_availability" IN ('immediate', 'few_days', 'one_two_weeks', 'over_two_weeks'))
);

CREATE TABLE "clinical_history_groups" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "clinical_history_groups_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "clinical_history_items" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "group_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clinical_history_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patient_clinical_history_answers" (
    "patient_id" BIGINT NOT NULL,
    "item_id" BIGINT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_clinical_history_answers_pkey" PRIMARY KEY ("patient_id","item_id")
);

CREATE TABLE "patient_consents" (
    "id" BIGSERIAL NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "consent_type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "recorded_by_user_id" BIGINT,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patient_consents_consent_type_check" CHECK ("consent_type" IN ('photos', 'informed'))
);

CREATE UNIQUE INDEX "clinical_history_items_key_key" ON "clinical_history_items"("key");
CREATE UNIQUE INDEX "patient_consents_patient_id_consent_type_key" ON "patient_consents"("patient_id", "consent_type");

ALTER TABLE "patient_clinical_profiles" ADD CONSTRAINT "patient_clinical_profiles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_clinical_profiles" ADD CONSTRAINT "patient_clinical_profiles_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinical_history_items" ADD CONSTRAINT "clinical_history_items_group_key_fkey" FOREIGN KEY ("group_key") REFERENCES "clinical_history_groups"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patient_clinical_history_answers" ADD CONSTRAINT "patient_clinical_history_answers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_clinical_history_answers" ADD CONSTRAINT "patient_clinical_history_answers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "clinical_history_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "clinical_history_groups" ("key", "label", "sort_order") VALUES
    ('general', 'Historia clínica general', 1),
    ('medication_allergies', 'Medicación y alergias específicas', 2),
    ('aesthetic', 'Antecedentes estéticos previos', 3),
    ('family', 'Antecedentes familiares', 4);

INSERT INTO "clinical_history_items" ("key", "group_key", "label", "sort_order") VALUES
    ('chronic_diseases', 'general', 'Enfermedades crónicas (diabetes, tiroides, hipertensión, autoinmunes)', 1),
    ('anticoagulants', 'general', 'Anticoagulantes o antiagregantes', 2),
    ('keloids', 'general', 'Tendencia a queloides o cicatrización anormal', 3),
    ('epilepsy_photosensitivity', 'general', 'Epilepsia o fotosensibilidad', 4),
    ('pacemaker_metal_implants', 'general', 'Marcapasos o implantes metálicos', 5),
    ('oncological_history', 'general', 'Antecedentes oncológicos (incluye cáncer de piel)', 6),
    ('bloodborne_conditions', 'general', 'VIH, hepatitis u otra condición de bioseguridad', 7),
    ('isotretinoin', 'medication_allergies', 'Isotretinoína actual o reciente', 1),
    ('corticosteroids', 'medication_allergies', 'Uso de corticoides', 2),
    ('hormonal_contraceptives', 'medication_allergies', 'Anticonceptivos hormonales', 3),
    ('local_anesthetic_allergy', 'medication_allergies', 'Alergia a anestésicos locales (lidocaína)', 4),
    ('latex_allergy', 'medication_allergies', 'Alergia al látex', 5),
    ('metal_allergy', 'medication_allergies', 'Alergia a metales (níquel)', 6),
    ('previous_aesthetic_treatments', 'aesthetic', 'Tratamientos estéticos previos (bótox, rellenos, láser, peeling)', 1),
    ('adverse_reactions', 'aesthetic', 'Reacciones adversas a tratamientos anteriores', 2),
    ('facial_body_implants', 'aesthetic', 'Implantes faciales o corporales (silicona, hidrogel, biopolímeros)', 3),
    ('tattoos_treatment_area', 'aesthetic', 'Tatuajes en la zona a tratar', 4),
    ('family_skin_cancer', 'family', 'Cáncer de piel en la familia', 1),
    ('family_autoimmune', 'family', 'Enfermedades autoinmunes en la familia', 2),
    ('family_premature_aging', 'family', 'Envejecimiento cutáneo precoz en la familia', 3);
