import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  CLINICAL_OPTIONS,
  CLINICAL_TEXT_FIELDS,
  CONSENT_TYPES,
  type ConsentType,
  type PatientClinicalHistory,
  type PatientClinicalProfile,
} from '@piel360/shared';
import type { JwtPayload } from '../auth/types';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveClinicalHistoryDto } from './dto/save-clinical-history.dto';

const PROFILE_FIELDS = [
  ...CLINICAL_TEXT_FIELDS,
  ...(Object.keys(CLINICAL_OPTIONS) as (keyof typeof CLINICAL_OPTIONS)[]),
] as const;

const PATIENT_FORBIDDEN =
  'La historia clínica la consulta y edita el profesional.';

/** Historia clínica del profesional: `/patients/:id/clinical-history`. */
@Injectable()
export class PatientClinicalHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patients: PatientsService,
  ) {}

  /** Preguntas Sí/No sin respuestas: el alta del paciente las necesita antes de
   * que exista el paciente. */
  async catalog(user: JwtPayload): Promise<PatientClinicalHistory['groups']> {
    if (user.role === 'patient')
      throw new ForbiddenException(PATIENT_FORBIDDEN);
    return this.groupsWithAnswers(new Map());
  }

  async get(
    patientId: string,
    user: JwtPayload,
  ): Promise<PatientClinicalHistory> {
    await this.assertAccess(patientId, user);
    const id = BigInt(patientId);
    const [profile, consents, answers] = await Promise.all([
      this.prisma.patientClinicalProfile.findUnique({
        where: { patientId: id },
      }),
      this.prisma.patientConsent.findMany({ where: { patientId: id } }),
      this.prisma.patientClinicalHistoryAnswer.findMany({
        where: { patientId: id },
      }),
    ]);

    return {
      profile: Object.fromEntries(
        PROFILE_FIELDS.map((field) => [field, profile?.[field] ?? null]),
      ) as PatientClinicalProfile,
      consents: Object.fromEntries(
        CONSENT_TYPES.map(({ value }) => [
          value,
          consents.find((c) => c.consentType === value)?.granted ?? null,
        ]),
      ) as Record<ConsentType, boolean | null>,
      groups: await this.groupsWithAnswers(
        new Map(answers.map((a) => [a.itemId, a.answer])),
      ),
    };
  }

  private async groupsWithAnswers(answerByItem: Map<bigint, boolean>) {
    const groups = await this.prisma.clinicalHistoryGroup.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    return groups
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        key: g.key,
        label: g.label,
        items: g.items.map((item) => ({
          key: item.key,
          label: item.label,
          answer: answerByItem.get(item.id) ?? null,
        })),
      }));
  }

  async save(patientId: string, dto: SaveClinicalHistoryDto, user: JwtPayload) {
    await this.assertAccess(patientId, user);
    const id = BigInt(patientId);
    const userId = BigInt(user.sub);
    const answers = await this.resolveAnswers(dto.answers);
    const profile = Object.fromEntries(
      PROFILE_FIELDS.map((field) => [field, emptyToNull(dto.profile[field])]),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.patientClinicalProfile.upsert({
        where: { patientId: id },
        create: { patientId: id, ...profile, updatedByUserId: userId },
        update: { ...profile, updatedByUserId: userId },
      });

      await tx.patientClinicalHistoryAnswer.deleteMany({
        where: {
          patientId: id,
          itemId: {
            in: answers.filter((a) => a.answer === null).map((a) => a.itemId),
          },
        },
      });
      for (const { itemId, answer } of answers) {
        if (answer === null) continue;
        await tx.patientClinicalHistoryAnswer.upsert({
          where: { patientId_itemId: { patientId: id, itemId } },
          create: { patientId: id, itemId, answer },
          update: { answer },
        });
      }

      for (const { value: consentType } of CONSENT_TYPES) {
        const granted = dto.consents[consentType] ?? null;
        const where = { patientId_consentType: { patientId: id, consentType } };
        if (granted === null) {
          await tx.patientConsent.deleteMany({
            where: { patientId: id, consentType },
          });
          continue;
        }
        const current = await tx.patientConsent.findUnique({ where });
        // Quién y cuándo solo cambian si cambia la respuesta: volver a guardar
        // el formulario no debe parecer un consentimiento nuevo.
        if (current?.granted === granted) continue;
        const record = {
          granted,
          recordedByUserId: userId,
          recordedAt: new Date(),
        };
        await tx.patientConsent.upsert({
          where,
          create: { patientId: id, consentType, ...record },
          update: record,
        });
      }
    });

    return this.get(patientId, user);
  }

  /** Reutiliza el alcance de `GET /patients/:id` (dueño, equipo, admin). */
  private async assertAccess(patientId: string, user: JwtPayload) {
    if (user.role === 'patient')
      throw new ForbiddenException(PATIENT_FORBIDDEN);
    await this.patients.findOne(patientId, user);
  }

  /** Clave del catálogo → id. Una pregunta que no existe es un error, no se ignora. */
  private async resolveAnswers(raw: Record<string, boolean | null>) {
    const items = await this.prisma.clinicalHistoryItem.findMany({
      where: { key: { in: Object.keys(raw) }, active: true },
      select: { id: true, key: true },
    });
    const idByKey = new Map(items.map((i) => [i.key, i.id]));
    return Object.entries(raw).map(([key, answer]) => {
      const itemId = idByKey.get(key);
      if (itemId === undefined) {
        throw new BadRequestException(
          `Pregunta de historia clínica desconocida: ${key}`,
        );
      }
      if (answer !== null && typeof answer !== 'boolean') {
        throw new BadRequestException(
          `Respuesta no válida para ${key}: usa sí, no o vacío`,
        );
      }
      return { itemId, answer };
    });
  }
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
