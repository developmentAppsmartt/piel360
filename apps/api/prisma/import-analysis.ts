import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';
import { normalizeYoucamResults } from './youcam-normalize';

// Prisma 7: el cliente necesita un driver adapter explícito (ver src/prisma/prisma.service.ts).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_PROVIDER_SLUG = 'youcam';

interface AnalysisPayload {
  id?: string | number;
  youcamTaskId?: string | null;
  patientId?: string | number | null;
  userId?: string | number | null;
  imagePath?: string | null;
  coloredS3Url?: string | null;
  maskedS3Url?: string | null;
  bodyRegion?: string | null;
  xCoord?: number | null;
  yCoord?: number | null;
  zCoord?: number | null;
  isValid?: boolean;
  validationScore?: number | null;
  aiDiagnosis?: string | null;
  aiProbability?: number | null;
  aiRawResponse?: unknown;
  finalDiagnosis?: string | null;
  isConfirmed?: boolean;
  isCorrected?: boolean;
  doctorNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  patient?: {
    id?: string | number;
    doctorId?: string | number | null;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    docType?: string | null;
    docNumber?: string | null;
    address?: string | null;
  } | null;
}

function flag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match?.split('=', 2)[1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function toBigIntOrNull(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function toDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function readPayload(): AnalysisPayload[] {
  const file = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed)
    ? (parsed as AnalysisPayload[])
    : [parsed as AnalysisPayload];
}

/**
 * Los ids explícitos no avanzan la secuencia de BIGSERIAL, así que el
 * siguiente INSERT autogenerado chocaría con una PK ya usada.
 */
async function resyncSequence(tx: Prisma.TransactionClient, table: string) {
  await tx.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM "${table}"), 1), 1))`,
  );
}

async function resolvePatientId(
  tx: Prisma.TransactionClient,
  payload: AnalysisPayload,
  keepIds: boolean,
): Promise<bigint> {
  const override = toBigIntOrNull(flag('patient-id'));
  if (override !== null) {
    const exists = await tx.patient.findUnique({ where: { id: override } });
    if (!exists) throw new Error(`El paciente ${override} no existe`);
    return override;
  }

  const payloadPatientId = toBigIntOrNull(
    payload.patient?.id ?? payload.patientId,
  );
  if (payloadPatientId !== null) {
    const existing = await tx.patient.findUnique({
      where: { id: payloadPatientId },
    });
    if (existing) return existing.id;

    if (keepIds && payload.patient) {
      // `doctorId` es opcional: si el doctor del origen no existe aquí, se deja
      // sin asignar en vez de inventar un doctor que no corresponde.
      const doctorId = toBigIntOrNull(payload.patient.doctorId);
      const doctor =
        doctorId === null
          ? null
          : await tx.doctor.findUnique({ where: { id: doctorId } });

      const created = await tx.patient.create({
        data: {
          id: payloadPatientId,
          doctorId: doctor?.id ?? null,
          firstName: payload.patient.firstName ?? 'Paciente',
          lastName: payload.patient.lastName ?? 'Importado',
          email: payload.patient.email ?? null,
          phone: payload.patient.phone ?? null,
          docType: payload.patient.docType ?? null,
          docNumber: payload.patient.docNumber ?? null,
          address: payload.patient.address ?? null,
        },
      });
      await resyncSequence(tx, 'patients');
      console.log(
        `  + Paciente ${created.id} creado${doctor ? ` (doctor ${doctor.id})` : ' (sin doctor)'}`,
      );
      return created.id;
    }
  }

  throw new Error(
    'No se pudo resolver el paciente. Usa --patient-id=N con un paciente existente, o --keep-ids si el JSON trae el objeto "patient".',
  );
}

async function resolveUserId(
  tx: Prisma.TransactionClient,
  payload: AnalysisPayload,
): Promise<bigint | null> {
  const override = toBigIntOrNull(flag('user-id'));
  const candidate = override ?? toBigIntOrNull(payload.userId);
  if (candidate === null) return null;

  const exists = await tx.user.findUnique({ where: { id: candidate } });
  if (exists) return candidate;

  if (override !== null) throw new Error(`El usuario ${override} no existe`);
  console.log(
    `  ! Usuario ${candidate} no existe aquí — el análisis queda sin usuario`,
  );
  return null;
}

async function importOne(payload: AnalysisPayload, providerId: bigint | null) {
  const keepIds = hasFlag('keep-ids');

  return prisma.$transaction(
    async (tx) => {
      const patientId = await resolvePatientId(tx, payload, keepIds);
      const userId = await resolveUserId(tx, payload);
      const explicitId = keepIds ? toBigIntOrNull(payload.id) : null;

      const data = {
        youcamTaskId: payload.youcamTaskId ?? null,
        patientId,
        userId,
        providerId,
        imagePath: payload.imagePath ?? 'youcam',
        coloredS3Url: payload.coloredS3Url ?? null,
        maskedS3Url: payload.maskedS3Url ?? null,
        bodyRegion: payload.bodyRegion ?? null,
        xCoord: payload.xCoord ?? null,
        yCoord: payload.yCoord ?? null,
        zCoord: payload.zCoord ?? null,
        isValid: payload.isValid ?? false,
        validationScore: payload.validationScore ?? null,
        aiDiagnosis: payload.aiDiagnosis ?? null,
        aiProbability: payload.aiProbability ?? null,
        aiRawResponse: (payload.aiRawResponse ??
          undefined) as Prisma.InputJsonValue,
        finalDiagnosis: payload.finalDiagnosis ?? null,
        isConfirmed: payload.isConfirmed ?? false,
        isCorrected: payload.isCorrected ?? false,
        doctorNotes: payload.doctorNotes ?? null,
        createdAt: toDate(payload.createdAt),
        updatedAt: toDate(payload.updatedAt),
      };

      const analysis =
        explicitId === null
          ? await tx.analysis.create({ data })
          : await tx.analysis.upsert({
              where: { id: explicitId },
              update: data,
              create: { id: explicitId, ...data },
            });

      if (explicitId !== null) await resyncSequence(tx, 'analyses');

      const counts = await normalizeYoucamResults(
        tx,
        analysis.id,
        providerId,
        payload.aiRawResponse,
      );

      console.log(
        `  ✓ Análisis ${analysis.id} (paciente ${patientId}): ${counts.results} resultados, ${counts.masks} máscaras`,
      );
      return counts;
    },
    { timeout: 30_000 },
  );
}

async function main() {
  const slug = flag('provider') ?? DEFAULT_PROVIDER_SLUG;
  const provider = await prisma.analysisProvider.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!provider) {
    console.warn(
      `Proveedor "${slug}" no encontrado — se deja provider_id en NULL (corre el seed primero).`,
    );
  }

  const payloads = readPayload();
  console.log(`Importando ${payloads.length} análisis...`);

  for (const payload of payloads) {
    await importOne(payload, provider?.id ?? null);
  }

  console.log('Listo.');
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? `Error: ${error.message}` : String(error),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
