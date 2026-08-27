import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import type { UpdateDoctorDto } from './dto/update-doctor.dto';

const DOC_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  /** Resuelve el `Doctor.id` a partir del `sub` (User.id) del JWT — usado
   * por PatientsService/AnalysesService para el scoping por doctor. */
  async requireDoctorByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (!doctor) {
      throw new ForbiddenException('El usuario no tiene un perfil de doctor');
    }
    return doctor;
  }

  findAll() {
    return this.prisma.doctor.findMany({
      include: { user: { select: { email: true, avatarKey: true } } },
      orderBy: { id: 'asc' },
    });
  }

  /** Doctores pendientes de validación (cola del moderador). */
  findPendingVerification() {
    return this.findForVerification('pending');
  }

  /**
   * Cola/listados del panel de verificación (mutuamente excluyentes).
   * - pending:   pending | in_review
   * - active:    active | approved | verified   (aprobados / verificados)
   * - rejected:  rejected
   */
  findForVerification(status: 'pending' | 'active' | 'rejected' = 'pending') {
    const statuses =
      status === 'pending'
        ? (['pending', 'in_review'] as const)
        : status === 'active'
          ? (['active', 'approved', 'verified'] as const)
          : (['rejected'] as const);

    return this.prisma.doctor
      .findMany({
        where: { verificationStatus: { in: [...statuses] } },
        include: { user: { select: { email: true, avatarKey: true } } },
        orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
      })
      .then((rows) =>
        Promise.all(rows.map((d) => this.withVerificationPayload(d))),
      );
  }

  async verificationStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const APPROVED = ['active', 'approved', 'verified'] as const;

    const [grouped, verifiedToday, rejectedToday] = await Promise.all([
      this.prisma.doctor.groupBy({
        by: ['verificationStatus'],
        _count: { _all: true },
      }),
      this.prisma.doctor.count({
        where: {
          verificationStatus: { in: [...APPROVED] },
          updatedAt: { gte: startOfDay },
        },
      }),
      this.prisma.doctor.count({
        where: {
          verificationStatus: 'rejected',
          updatedAt: { gte: startOfDay },
        },
      }),
    ]);

    const countOf = (statuses: readonly string[]) =>
      grouped
        .filter((g) => statuses.includes(g.verificationStatus))
        .reduce((sum, g) => sum + g._count._all, 0);

    const approved = countOf(APPROVED);

    return {
      pending: countOf(['pending', 'in_review']),
      approved,
      rejected: countOf(['rejected']),
      totalVerified: approved,
      verifiedToday,
      rejectedToday,
    };
  }

  async updateVerification(
    id: string,
    status: 'active' | 'rejected' | 'approved' | 'pending' | 'in_review',
    note?: string,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException('Doctor no encontrado');
    }
    const trimmed = note?.trim() || null;

    if (status === 'in_review' && !trimmed) {
      throw new BadRequestException(
        'Incluye una observación para que el profesional sepa qué corregir.',
      );
    }

    const approved = status === 'active' || status === 'approved';

    const doctor = await this.prisma.doctor.update({
      where: { id: BigInt(id) },
      data: {
        verificationStatus: status,
        ...(approved
          ? { verificationNote: null, verificationNoteAt: null }
          : trimmed
            ? {
                verificationNote: trimmed,
                verificationNoteAt: new Date(),
              }
            : {}),
      },
      include: {
        user: { select: { email: true, avatarKey: true, name: true } },
      },
    });

    if (
      (status === 'in_review' || status === 'rejected') &&
      trimmed &&
      doctor.user?.email
    ) {
      const subject =
        status === 'in_review'
          ? 'Piel360 — Se solicitaron ajustes a tu cuenta'
          : 'Piel360 — Tu solicitud de verificación fue rechazada';
      const heading =
        status === 'in_review'
          ? 'Necesitamos que revises tu perfil'
          : 'Tu solicitud fue rechazada';
      const cta =
        status === 'in_review'
          ? 'Entra a tu perfil en Piel360, corrige lo indicado y guarda los cambios para que el equipo vuelva a revisar.'
          : 'Puedes corregir tu información y contactar soporte si consideras que hubo un error.';

      void this.mail
        .send({
          to: doctor.user.email,
          subject,
          html: `
            <p>Hola ${doctor.firstName || doctor.user.name || ''},</p>
            <p><strong>${heading}</strong></p>
            <p>Observación del equipo de verificación:</p>
            <blockquote style="border-left:3px solid #0ea5e9;padding-left:12px;color:#334155;">
              ${trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </blockquote>
            <p>${cta}</p>
            <p>— Equipo Piel360</p>
          `,
        })
        .catch(() => undefined);
    }

    return this.withVerificationPayload(doctor);
  }

  /** Perfil del doctor autenticado (incluye email y URLs firmadas de docs). */
  async findMe(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: BigInt(userId) },
      include: { user: { select: { email: true, avatarKey: true } } },
    });
    if (!doctor) {
      throw new ForbiddenException('El usuario no tiene un perfil de doctor');
    }
    return this.withDocumentUrls(doctor);
  }

  async findOne(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException('Doctor no encontrado');
    }
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: BigInt(id) },
      include: { user: { select: { email: true, avatarKey: true } } },
    });
    if (!doctor) throw new NotFoundException('Doctor no encontrado');
    return this.withVerificationPayload(doctor);
  }

  async update(id: string, dto: UpdateDoctorDto) {
    await this.findOne(id);
    const { birthDate, ...rest } = dto;
    const doctor = await this.prisma.doctor.update({
      where: { id: BigInt(id) },
      data: {
        ...rest,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
      include: { user: { select: { email: true, avatarKey: true } } },
    });
    return this.withDocumentUrls(doctor);
  }

  async updateMe(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.requireDoctorByUserId(userId);
    const { birthDate, firstName, lastName, phone, ...rest } = dto;

    const updated = await this.prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        ...rest,
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
        // Tras corregir datos, vuelve a la cola de pendientes.
        ...(doctor.verificationStatus === 'in_review'
          ? { verificationStatus: 'pending' }
          : {}),
      },
      include: { user: { select: { email: true, avatarKey: true } } },
    });

    const userPatch: {
      firstName?: string;
      lastName?: string;
      name?: string;
      phone?: string | null;
    } = {};
    if (firstName !== undefined) userPatch.firstName = firstName;
    if (lastName !== undefined) userPatch.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      userPatch.name =
        `${firstName ?? updated.firstName} ${lastName ?? updated.lastName}`.trim();
    }
    if (phone !== undefined) userPatch.phone = phone;

    if (Object.keys(userPatch).length > 0) {
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: userPatch,
      });
    }

    return this.withDocumentUrls(updated);
  }

  private async signDoc(key: string | null | undefined) {
    if (!key) return null;
    try {
      return await this.storage.getSignedUrl(key);
    } catch {
      return null;
    }
  }

  private isEnterpriseDoctor(doctor: {
    membershipType: string;
    empresa: boolean;
    empresaReferida: boolean;
  }) {
    const type = (doctor.membershipType ?? '').trim().toLowerCase();
    return (
      type === 'empresa' ||
      type === 'empresa_aliada' ||
      doctor.empresa ||
      doctor.empresaReferida
    );
  }

  private async loadOrganizationForUser(userId: bigint) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { ownerUserId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!org) return null;

    const [legalRepCedulaDocUrl, rutDocUrl, existenceCertDocUrl] =
      await Promise.all([
        this.signDoc(org.legalRepCedulaDocKey),
        this.signDoc(org.rutDocKey),
        this.signDoc(org.existenceCertDocKey),
      ]);

    return {
      id: org.id.toString(),
      type: org.type,
      name: org.name,
      status: org.status,
      ciiuCode: org.ciiuCode,
      businessEmail: org.businessEmail,
      businessPhone: org.businessPhone,
      website: org.website,
      employeeCountRange: org.employeeCountRange,
      legalRepName: org.legalRepName,
      legalRepDocType: org.legalRepDocType,
      legalRepDocNumber: org.legalRepDocNumber,
      legalRepCedulaDocKey: org.legalRepCedulaDocKey,
      rutDocKey: org.rutDocKey,
      existenceCertDocKey: org.existenceCertDocKey,
      legalRepCedulaDocUrl,
      rutDocUrl,
      existenceCertDocUrl,
    };
  }

  /** Perfil + URLs de docs (+ organización si es cuenta empresa). */
  private async withVerificationPayload<
    T extends {
      userId: bigint;
      membershipType: string;
      empresa: boolean;
      empresaReferida: boolean;
      cedulaDocKey: string | null;
      medicalRegistryDocKey: string | null;
      diplomaDocKey: string | null;
      user?: { email: string; avatarKey?: string | null } | null;
    },
  >(doctor: T) {
    const base = await this.withDocumentUrls(doctor);
    if (!this.isEnterpriseDoctor(doctor)) {
      return { ...base, organization: null };
    }
    const organization = await this.loadOrganizationForUser(doctor.userId);
    return { ...base, organization };
  }

  private async withDocumentUrls<
    T extends {
      cedulaDocKey: string | null;
      medicalRegistryDocKey: string | null;
      diplomaDocKey: string | null;
      user?: { email: string; avatarKey?: string | null } | null;
    },
  >(doctor: T) {
    const [cedulaDocUrl, medicalRegistryDocUrl, diplomaDocUrl, avatarUrl] =
      await Promise.all([
        this.signDoc(doctor.cedulaDocKey),
        this.signDoc(doctor.medicalRegistryDocKey),
        this.signDoc(doctor.diplomaDocKey),
        this.signDoc(doctor.user?.avatarKey),
      ]);
    const { user, ...rest } = doctor;
    return {
      ...rest,
      user: user ? { email: user.email } : null,
      avatarUrl,
      cedulaDocUrl,
      medicalRegistryDocUrl,
      diplomaDocUrl,
    };
  }

  async uploadRegistrationDocuments(
    userId: string,
    files: {
      cedula?: Express.Multer.File[];
      medicalRegistryDoc?: Express.Multer.File[];
      diploma?: Express.Multer.File[];
    },
  ) {
    const doctor = await this.requireDoctorByUserId(userId);
    const data: {
      cedulaDocKey?: string;
      medicalRegistryDocKey?: string;
      diplomaDocKey?: string;
    } = {};

    const uploadOne = async (
      file: Express.Multer.File | undefined,
      kind: string,
    ) => {
      if (!file) return undefined;
      if (!DOC_MIME.has(file.mimetype)) {
        throw new BadRequestException(
          `${kind}: formato no permitido (PDF, JPG o PNG)`,
        );
      }
      const ext =
        file.mimetype === 'application/pdf'
          ? 'pdf'
          : file.mimetype === 'image/png'
            ? 'png'
            : 'jpg';
      const key = `doctors/${doctor.id}/${kind}.${ext}`;
      await this.storage.upload(key, file.buffer, file.mimetype);
      return key;
    };

    const cedulaKey = await uploadOne(files.cedula?.[0], 'cedula');
    const registryKey = await uploadOne(
      files.medicalRegistryDoc?.[0],
      'medical-registry',
    );
    const diplomaKey = await uploadOne(files.diploma?.[0], 'diploma');

    if (cedulaKey) data.cedulaDocKey = cedulaKey;
    if (registryKey) data.medicalRegistryDocKey = registryKey;
    if (diplomaKey) data.diplomaDocKey = diplomaKey;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No se recibieron documentos');
    }

    return this.prisma.doctor.update({
      where: { id: doctor.id },
      data,
      include: { user: { select: { email: true, avatarKey: true } } },
    }).then((d) => this.withDocumentUrls(d));
  }
}
