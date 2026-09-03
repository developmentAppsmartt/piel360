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
import type { UpdateDoctorAddressVerificationDto } from './dto/update-doctor-address-verification.dto';
import { AuthService } from '../auth/auth.service';
import { assertDocumentNumberAvailable } from '../common/document-number.util';
import { SpecialtyAccessService } from '../specialty-access/specialty-access.service';

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
    private readonly specialtyAccess: SpecialtyAccessService,
    private readonly authService: AuthService,
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
      where: {
        NOT: {
          OR: [
            { empresa: true },
            { empresaReferida: true },
            { membershipType: { in: ['empresa', 'empresa_aliada'] } },
          ],
        },
      },
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

    const existing = await this.prisma.doctor.findUnique({
      where: { id: BigInt(id) },
      select: {
        address: true,
        lat: true,
        lng: true,
        addressVerificationStatus: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Doctor no encontrado');
    }

    const hasGeo =
      Boolean(existing.address?.trim()) &&
      existing.lat != null &&
      existing.lng != null;

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
        ...(approved &&
        hasGeo &&
        existing.addressVerificationStatus !== 'verified'
          ? {
              addressVerificationStatus: 'verified',
              addressVerifiedAt: new Date(),
              addressVerificationMethod: 'google_maps',
            }
          : {}),
      },
      include: {
        user: { select: { id: true, email: true, avatarKey: true, name: true } },
      },
    });

    if (approved && doctor.user?.id) {
      await this.prisma.organization.updateMany({
        where: { ownerUserId: doctor.user.id, status: 'pending' },
        data: { status: 'active' },
      });
    } else if (status === 'rejected' && doctor.user?.id) {
      await this.prisma.organization.updateMany({
        where: { ownerUserId: doctor.user.id, status: 'active' },
        data: { status: 'pending' },
      });
    }

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

  async updateAddressVerification(
    id: string,
    dto: UpdateDoctorAddressVerificationDto,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException('Doctor no encontrado');
    }

    if (dto.status === 'verified' && !dto.method) {
      throw new BadRequestException(
        'Indica el método de verificación (visit, google_maps o photo_evidence).',
      );
    }

    if (dto.status === 'verified' && dto.method === 'photo_evidence') {
      const current = await this.prisma.doctor.findUnique({
        where: { id: BigInt(id) },
        select: { addressVerificationEvidenceKey: true },
      });
      if (!current?.addressVerificationEvidenceKey) {
        throw new BadRequestException(
          'Sube una imagen o video corto como evidencia antes de marcar la dirección como verificada con este método.',
        );
      }
    }

    const doctor = await this.prisma.doctor.update({
      where: { id: BigInt(id) },
      data: {
        addressVerificationStatus: dto.status,
        ...(dto.status === 'verified'
          ? {
              addressVerifiedAt: new Date(),
              addressVerificationMethod: dto.method ?? 'google_maps',
            }
          : {
              addressVerifiedAt: null,
              addressVerificationMethod: null,
            }),
      },
      include: {
        user: { select: { email: true, avatarKey: true, name: true } },
      },
    });

    return this.withVerificationPayload(doctor);
  }

  private static readonly EVIDENCE_MIME = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ]);
  private static readonly EVIDENCE_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

  /** Evidencia de dirección (imagen o video corto) — admin verificación. */
  async uploadAddressVerificationEvidence(
    id: string,
    file: Express.Multer.File | undefined,
  ) {
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException('Doctor no encontrado');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta el archivo de evidencia');
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (!DoctorsService.EVIDENCE_MIME.has(mime)) {
      throw new BadRequestException(
        `Formato no soportado (${file.mimetype}). Usa imagen (jpg/png/webp) o video corto (mp4/webm/mov).`,
      );
    }
    if (file.size > DoctorsService.EVIDENCE_MAX_BYTES) {
      throw new BadRequestException(
        'El archivo supera el tamaño máximo (25 MB). Usa un video corto o comprime la imagen.',
      );
    }

    const existing = await this.prisma.doctor.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, addressVerificationStatus: true },
    });
    if (!existing) throw new NotFoundException('Doctor no encontrado');

    const ext =
      mime.includes('png')
        ? 'png'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('webm')
            ? 'webm'
            : mime.includes('quicktime')
              ? 'mov'
              : mime.startsWith('video/')
                ? 'mp4'
                : 'jpg';

    const key = `doctors/${id}/address-evidence/${Date.now()}.${ext}`;
    await this.storage.upload(key, file.buffer, mime);

    const addrStatus = (
      existing.addressVerificationStatus ?? 'pending'
    ).toLowerCase();
    const promoteToReview = addrStatus === 'pending' || !addrStatus;

    const doctor = await this.prisma.doctor.update({
      where: { id: BigInt(id) },
      data: {
        addressVerificationEvidenceKey: key,
        ...(promoteToReview
          ? { addressVerificationStatus: 'in_review' }
          : {}),
      },
      include: {
        user: { select: { email: true, avatarKey: true, name: true } },
      },
    });

    return this.withVerificationPayload(doctor);
  }

  /** Quita la evidencia de dirección (archivo + key en BD). */
  async deleteAddressVerificationEvidence(id: string) {
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException('Doctor no encontrado');
    }
    const existing = await this.prisma.doctor.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        addressVerificationEvidenceKey: true,
        addressVerificationStatus: true,
        addressVerificationMethod: true,
      },
    });
    if (!existing) throw new NotFoundException('Doctor no encontrado');

    const key = existing.addressVerificationEvidenceKey;
    if (key) {
      await this.storage.delete(key);
    }

    const wasPhotoVerified =
      (existing.addressVerificationStatus ?? '').toLowerCase() ===
        'verified' &&
      (existing.addressVerificationMethod ?? '') === 'photo_evidence';

    const doctor = await this.prisma.doctor.update({
      where: { id: BigInt(id) },
      data: {
        addressVerificationEvidenceKey: null,
        ...(wasPhotoVerified
          ? {
              addressVerificationStatus: 'in_review',
              addressVerificationMethod: null,
              addressVerifiedAt: null,
            }
          : {}),
      },
      include: {
        user: { select: { email: true, avatarKey: true, name: true } },
      },
    });

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
    const allowedProviderSlugs =
      await this.specialtyAccess.getAllowedProviderSlugs(BigInt(userId));
    const base = this.isEnterpriseDoctor(doctor)
      ? await this.withVerificationPayload(doctor)
      : await this.withDocumentUrls(doctor);
    return {
      ...base,
      allowedProviderSlugs,
    };
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
    const existing = await this.findOne(id);
    const { birthDate, specialty, ...rest } = dto;
    if (dto.docNumber !== undefined) {
      await assertDocumentNumberAvailable(this.prisma, dto.docNumber, {
        doctorId: BigInt(id),
      });
    }
    const doctor = await this.prisma.doctor.update({
      where: { id: BigInt(id) },
      data: {
        ...rest,
        ...(specialty !== undefined ? { specialty } : {}),
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
      include: { user: { select: { email: true, avatarKey: true } } },
    });
    if (specialty !== undefined) {
      await this.specialtyAccess.assignSpecialtyRole(
        BigInt(existing.userId),
        specialty,
      );
    }
    return this.withDocumentUrls(doctor);
  }

  async updateMe(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.requireDoctorByUserId(userId);
    if (this.isEnterpriseDoctor(doctor)) {
      throw new BadRequestException(
        'Las cuentas empresa se editan en Configuración → Información de la empresa.',
      );
    }
    const { birthDate, firstName, lastName, phone, phoneTicket, ...rest } =
      dto;

    if (rest.docNumber !== undefined) {
      await assertDocumentNumberAvailable(this.prisma, rest.docNumber, {
        doctorId: doctor.id,
      });
    }

    let phoneVerifiedAt: Date | undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { phone: true },
    });
    const currentPhone = (user?.phone ?? doctor.phone ?? '').replace(
      /\D/g,
      '',
    );

    if (phone !== undefined) {
      const normalized = phone.replace(/\D/g, '');
      if (normalized !== currentPhone) {
        if (!phoneTicket?.trim()) {
          throw new BadRequestException(
            'Debes verificar el nuevo celular con el código enviado por SMS.',
          );
        }
        await this.authService.assertAndConsumePhoneTicket(
          phoneTicket,
          normalized,
        );
        phoneVerifiedAt = new Date();
      } else if (phoneTicket?.trim()) {
        await this.authService.assertAndConsumePhoneTicket(
          phoneTicket,
          normalized,
        );
        phoneVerifiedAt = new Date();
      }
    } else if (phoneTicket?.trim() && currentPhone) {
      await this.authService.assertAndConsumePhoneTicket(
        phoneTicket,
        currentPhone,
      );
      phoneVerifiedAt = new Date();
    }

    const addressFieldsTouched =
      rest.address !== undefined ||
      rest.city !== undefined ||
      rest.department !== undefined ||
      rest.country !== undefined ||
      rest.lat !== undefined ||
      rest.lng !== undefined ||
      rest.locationType !== undefined;

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
        ...(addressFieldsTouched &&
        doctor.addressVerificationStatus === 'verified'
          ? {
              addressVerificationStatus: 'in_review',
              addressVerifiedAt: null,
              addressVerificationMethod: null,
            }
          : {}),
        ...(addressFieldsTouched &&
        doctor.addressVerificationStatus === 'pending' &&
        (rest.address?.trim() || doctor.address?.trim()) &&
        (rest.lat ?? doctor.lat) != null &&
        (rest.lng ?? doctor.lng) != null
          ? { addressVerificationStatus: 'in_review' }
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
      phoneVerifiedAt?: Date;
    } = {};
    if (firstName !== undefined) userPatch.firstName = firstName;
    if (lastName !== undefined) userPatch.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      userPatch.name =
        `${firstName ?? updated.firstName} ${lastName ?? updated.lastName}`.trim();
    }
    if (phone !== undefined) userPatch.phone = phone;
    if (phoneVerifiedAt) userPatch.phoneVerifiedAt = phoneVerifiedAt;

    if (Object.keys(userPatch).length > 0) {
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: userPatch,
      });
    }

    if (rest.specialty !== undefined) {
      await this.specialtyAccess.assignSpecialtyRole(
        BigInt(userId),
        rest.specialty,
      );
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
      address: org.address,
      city: org.city,
      department: org.department,
      country: org.country,
      zip: org.zip,
      lat: org.lat != null ? Number(org.lat) : null,
      lng: org.lng != null ? Number(org.lng) : null,
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
      addressVerificationEvidenceKey?: string | null;
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
      addressVerificationEvidenceKey?: string | null;
      user?: { email: string; avatarKey?: string | null } | null;
    },
  >(doctor: T) {
    const [
      cedulaDocUrl,
      medicalRegistryDocUrl,
      diplomaDocUrl,
      avatarUrl,
      addressVerificationEvidenceUrl,
    ] = await Promise.all([
      this.signDoc(doctor.cedulaDocKey),
      this.signDoc(doctor.medicalRegistryDocKey),
      this.signDoc(doctor.diplomaDocKey),
      this.signDoc(doctor.user?.avatarKey),
      this.signDoc(doctor.addressVerificationEvidenceKey),
    ]);
    const { user, ...rest } = doctor;
    return {
      ...rest,
      user: user ? { email: user.email } : null,
      avatarUrl,
      cedulaDocUrl,
      medicalRegistryDocUrl,
      diplomaDocUrl,
      addressVerificationEvidenceUrl,
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
