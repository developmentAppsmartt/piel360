import type { StorageService } from '../storage/storage.service';

/** Lo que cada lectura de paciente trae de su usuario y de su profesional. */
export const PATIENT_USER_SELECT = {
  select: { avatarKey: true, avatarThumbKey: true },
} as const;

export const PATIENT_RELATIONS = {
  user: PATIENT_USER_SELECT,
  doctor: { include: { user: { select: { id: true, name: true } } } },
} as const;

async function sign(storage: StorageService, key: string | null | undefined) {
  if (!key) return null;
  try {
    return await storage.getSignedUrl(key);
  } catch {
    return null;
  }
}

/**
 * Paciente listo para responder: foto firmada (`avatarUrl`), su miniatura
 * para las listas (`avatarThumbUrl`) y, si se pide, el profesional. Firmar es
 * un cálculo local (sin red), así que con 1000 pacientes no pesa.
 */
export async function serializePatient<
  T extends {
    user?: { avatarKey: string | null; avatarThumbKey?: string | null } | null;
    doctor?: { user?: { id: bigint; name: string } | null } | null;
  },
>(storage: StorageService, row: T, includeProfessional = false) {
  const { user, doctor, ...patient } = row;
  const [avatarUrl, avatarThumbUrl] = await Promise.all([
    sign(storage, user?.avatarKey),
    sign(storage, user?.avatarThumbKey),
  ]);
  const professional =
    includeProfessional && doctor?.user
      ? {
          professionalUserId: doctor.user.id.toString(),
          professionalName: doctor.user.name,
        }
      : {};
  return { ...patient, avatarUrl, avatarThumbUrl, ...professional };
}
