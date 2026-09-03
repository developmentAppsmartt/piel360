import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | {
  $queryRaw: Prisma.TransactionClient['$queryRaw'];
};

export type DocumentNumberExcept = {
  doctorId?: bigint;
  patientId?: bigint;
  moderatorId?: bigint;
  organizationId?: bigint;
};

/** Quita espacios, puntos y guiones; deja letras/números en mayúsculas. */
export function normalizeDocumentNumber(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Falla si el número de documento ya existe en doctores, pacientes,
 * moderadores u organizaciones (representante legal).
 */
export async function assertDocumentNumberAvailable(
  db: DbClient,
  docNumber: string | null | undefined,
  except: DocumentNumberExcept = {},
): Promise<void> {
  const raw = docNumber?.trim();
  if (!raw) return;

  const normalized = normalizeDocumentNumber(raw);
  if (!normalized) return;

  const rows = await db.$queryRaw<
    Array<{ source: string; id: bigint }>
  >`
    SELECT 'doctor'::text AS source, id
    FROM doctors
    WHERE doc_number IS NOT NULL
      AND btrim(doc_number) <> ''
      AND regexp_replace(upper(doc_number), '[^A-Z0-9]', '', 'g') = ${normalized}
    UNION ALL
    SELECT 'patient'::text AS source, id
    FROM patients
    WHERE doc_number IS NOT NULL
      AND btrim(doc_number) <> ''
      AND regexp_replace(upper(doc_number), '[^A-Z0-9]', '', 'g') = ${normalized}
    UNION ALL
    SELECT 'moderator'::text AS source, id
    FROM moderators
    WHERE doc_number IS NOT NULL
      AND btrim(doc_number) <> ''
      AND regexp_replace(upper(doc_number), '[^A-Z0-9]', '', 'g') = ${normalized}
    UNION ALL
    SELECT 'organization'::text AS source, id
    FROM organizations
    WHERE legal_rep_doc_number IS NOT NULL
      AND btrim(legal_rep_doc_number) <> ''
      AND regexp_replace(upper(legal_rep_doc_number), '[^A-Z0-9]', '', 'g') = ${normalized}
  `;

  const conflict = rows.find((row) => {
    if (row.source === 'doctor' && except.doctorId === row.id) return false;
    if (row.source === 'patient' && except.patientId === row.id) return false;
    if (row.source === 'moderator' && except.moderatorId === row.id) {
      return false;
    }
    if (row.source === 'organization' && except.organizationId === row.id) {
      return false;
    }
    return true;
  });

  if (conflict) {
    throw new ConflictException(
      'Ya existe un registro con ese número de documento',
    );
  }
}
