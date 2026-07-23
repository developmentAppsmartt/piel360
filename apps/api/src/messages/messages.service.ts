import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DoctorsService } from '../doctors/doctors.service';
import { StorageService } from '../storage/storage.service';
import type { JwtPayload } from '../auth/types';
import type {
  CreateConversationDto,
  SendMessageDto,
  UpdateConversationDto,
} from './dto/messages.dto';

type ConversationTab = 'recientes' | 'sin_leer' | 'archivados';

const ALLOWED_IMAGE = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const ALLOWED_PDF = new Set(['application/pdf']);
const MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctors: DoctorsService,
    private readonly storage: StorageService,
  ) {}

  /** Contactos con los que el usuario puede chatear. */
  async listContacts(user: JwtPayload) {
    if (user.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(user.sub);
      const patients = await this.prisma.patient.findMany({
        where: { doctorId: doctor.id },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
      return patients.map((p) => ({
        id: p.id.toString(),
        kind: 'patient' as const,
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`.trim(),
        email: p.email,
      }));
    }

    if (user.role === 'patient') {
      const patient = await this.requirePatientByUserId(user.sub);
      if (!patient.doctorId) return [];
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: patient.doctorId },
      });
      if (!doctor) return [];
      return [
        {
          id: doctor.id.toString(),
          kind: 'doctor' as const,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          name: `${doctor.firstName} ${doctor.lastName}`.trim(),
          email: null as string | null,
        },
      ];
    }

    throw new ForbiddenException('Solo doctores y pacientes pueden mensajear');
  }

  async listConversations(user: JwtPayload, tab: ConversationTab = 'recientes') {
    const ctx = await this.resolveParticipant(user);
    const conversations = await this.prisma.conversation.findMany({
      where:
        ctx.role === 'doctor'
          ? { doctorId: ctx.doctorId }
          : { patientId: ctx.patientId },
      include: {
        doctor: true,
        patient: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const mapped = conversations
      .map((c) => this.mapConversationSummary(c, ctx, user.sub))
      .filter((c) => {
        if (c.deletedForMe) return false;
        if (tab === 'archivados') return c.archived;
        if (c.archived) return false;
        if (tab === 'sin_leer') return c.unreadCount > 0;
        return true;
      });

    return mapped;
  }

  async getOrCreate(user: JwtPayload, dto: CreateConversationDto) {
    const ctx = await this.resolveParticipant(user);
    let doctorId: bigint;
    let patientId: bigint;

    if (ctx.role === 'doctor') {
      if (!dto.patientId) {
        throw new BadRequestException('patientId es obligatorio');
      }
      doctorId = ctx.doctorId;
      patientId = BigInt(dto.patientId);
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, doctorId },
      });
      if (!patient) {
        throw new ForbiddenException('Este paciente no pertenece a tu consulta');
      }
    } else {
      if (!dto.doctorId && !ctx.doctorId) {
        throw new BadRequestException('No tienes un doctor asignado');
      }
      patientId = ctx.patientId;
      doctorId = dto.doctorId ? BigInt(dto.doctorId) : ctx.doctorId!;
      if (ctx.doctorId && doctorId !== ctx.doctorId) {
        throw new ForbiddenException('Solo puedes chatear con tu doctor asignado');
      }
    }

    let conversation = await this.prisma.conversation.findUnique({
      where: {
        doctorId_patientId: { doctorId, patientId },
      },
      include: {
        doctor: true,
        patient: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { doctorId, patientId },
        include: {
          doctor: true,
          patient: true,
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 100,
          },
        },
      });
    } else {
      // Restaurar si el usuario la había borrado
      const data =
        ctx.role === 'doctor'
          ? { doctorDeletedAt: null }
          : { patientDeletedAt: null };
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data,
        include: {
          doctor: true,
          patient: true,
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 100,
          },
        },
      });
    }

    return this.mapConversationDetail(conversation, ctx, user.sub);
  }

  async getConversation(user: JwtPayload, id: string) {
    const ctx = await this.resolveParticipant(user);
    const conversation = await this.loadConversationForParticipant(id, ctx);
    return this.mapConversationDetail(conversation, ctx, user.sub);
  }

  async listMessages(
    user: JwtPayload,
    conversationId: string,
    cursor?: string,
    limit = 50,
  ) {
    const ctx = await this.resolveParticipant(user);
    await this.loadConversationForParticipant(conversationId, ctx);

    const take = Math.min(Math.max(limit, 1), 100);
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: BigInt(conversationId),
        deletedAt: null,
        ...(cursor ? { id: { lt: BigInt(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const mapped = await Promise.all(
      messages.map((m) => this.mapMessage(m, user.sub)),
    );
    return mapped.reverse();
  }

  async sendMessage(user: JwtPayload, conversationId: string, dto: SendMessageDto) {
    const ctx = await this.resolveParticipant(user);
    const conversation = await this.loadConversationForParticipant(
      conversationId,
      ctx,
    );

    if (dto.type === 'text' && !dto.body?.trim()) {
      throw new BadRequestException('El mensaje de texto no puede estar vacío');
    }
    if (dto.type !== 'text' && !dto.attachmentKey) {
      throw new BadRequestException('attachmentKey es obligatorio para adjuntos');
    }

    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId: BigInt(user.sub),
          type: dto.type,
          body: dto.body?.trim() || null,
          attachmentKey: dto.attachmentKey ?? null,
          attachmentName: dto.attachmentName ?? null,
          mimeType: dto.mimeType ?? null,
          sizeBytes: dto.sizeBytes ?? null,
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: now,
          doctorDeletedAt: null,
          patientDeletedAt: null,
          ...(ctx.role === 'doctor'
            ? { doctorLastReadAt: now, doctorArchivedAt: null }
            : { patientLastReadAt: now, patientArchivedAt: null }),
        },
      });

      return created;
    });

    return this.mapMessage(message, user.sub);
  }

  async uploadAttachment(
    user: JwtPayload,
    conversationId: string,
    file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta el archivo');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('El archivo supera el límite de 20 MB');
    }

    const mime = (file.mimetype || '').toLowerCase();
    let type: 'image' | 'pdf';
    if (ALLOWED_IMAGE.has(mime)) type = 'image';
    else if (ALLOWED_PDF.has(mime)) type = 'pdf';
    else {
      throw new BadRequestException(
        'Solo se permiten imágenes (JPEG/PNG/WebP/GIF) o PDF',
      );
    }

    const ext =
      type === 'pdf'
        ? 'pdf'
        : mime.includes('png')
          ? 'png'
          : mime.includes('webp')
            ? 'webp'
            : mime.includes('gif')
              ? 'gif'
              : 'jpg';

    const key = `messages/${conversationId}/${randomUUID()}.${ext}`;
    try {
      await this.storage.upload(key, file.buffer, mime);
    } catch {
      throw new BadRequestException(
        'No se pudo subir el archivo. Revisa la configuración de almacenamiento.',
      );
    }

    return this.sendMessage(user, conversationId, {
      type,
      attachmentKey: key,
      attachmentName: file.originalname || `archivo.${ext}`,
      mimeType: mime,
      sizeBytes: file.size,
    });
  }

  async updateConversation(
    user: JwtPayload,
    id: string,
    dto: UpdateConversationDto,
  ) {
    const ctx = await this.resolveParticipant(user);
    await this.loadConversationForParticipant(id, ctx);

    const archivedAt = dto.archived ? new Date() : null;
    const data =
      ctx.role === 'doctor'
        ? { doctorArchivedAt: archivedAt }
        : { patientArchivedAt: archivedAt };

    const updated = await this.prisma.conversation.update({
      where: { id: BigInt(id) },
      data,
      include: {
        doctor: true,
        patient: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.mapConversationSummary(updated, ctx, user.sub);
  }

  async softDeleteConversation(user: JwtPayload, id: string) {
    const ctx = await this.resolveParticipant(user);
    await this.loadConversationForParticipant(id, ctx);

    const data =
      ctx.role === 'doctor'
        ? { doctorDeletedAt: new Date(), doctorArchivedAt: null }
        : { patientDeletedAt: new Date(), patientArchivedAt: null };

    await this.prisma.conversation.update({
      where: { id: BigInt(id) },
      data,
    });

    return { ok: true };
  }

  /** Solo doctor: borra el hilo y todos los mensajes para ambas partes. */
  async hardDeleteConversation(user: JwtPayload, id: string) {
    const ctx = await this.resolveParticipant(user);
    if (ctx.role !== 'doctor') {
      throw new ForbiddenException(
        'Solo el doctor puede eliminar el chat por completo',
      );
    }
    await this.loadConversationForParticipant(id, ctx);
    await this.prisma.conversation.delete({
      where: { id: BigInt(id) },
    });
    return { ok: true };
  }

  async markRead(user: JwtPayload, id: string) {
    const ctx = await this.resolveParticipant(user);
    await this.loadConversationForParticipant(id, ctx);
    const now = new Date();
    const data =
      ctx.role === 'doctor'
        ? { doctorLastReadAt: now }
        : { patientLastReadAt: now };
    await this.prisma.conversation.update({
      where: { id: BigInt(id) },
      data,
    });
    return { ok: true };
  }

  private async requirePatientByUserId(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: BigInt(userId) },
    });
    if (!patient) {
      throw new ForbiddenException('El usuario no tiene un perfil de paciente');
    }
    return patient;
  }

  private async resolveParticipant(user: JwtPayload): Promise<
    | { role: 'doctor'; doctorId: bigint; patientId?: never }
    | { role: 'patient'; patientId: bigint; doctorId: bigint | null }
  > {
    if (user.role === 'doctor') {
      const doctor = await this.doctors.requireDoctorByUserId(user.sub);
      return { role: 'doctor', doctorId: doctor.id };
    }
    if (user.role === 'patient') {
      const patient = await this.requirePatientByUserId(user.sub);
      return {
        role: 'patient',
        patientId: patient.id,
        doctorId: patient.doctorId,
      };
    }
    throw new ForbiddenException('Solo doctores y pacientes pueden mensajear');
  }

  private async loadConversationForParticipant(
    id: string,
    ctx:
      | { role: 'doctor'; doctorId: bigint }
      | { role: 'patient'; patientId: bigint },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: BigInt(id) },
      include: {
        doctor: true,
        patient: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');

    const allowed =
      ctx.role === 'doctor'
        ? conversation.doctorId === ctx.doctorId
        : conversation.patientId === ctx.patientId;
    if (!allowed) {
      throw new ForbiddenException('No puedes acceder a esta conversación');
    }

    const deletedForMe =
      ctx.role === 'doctor'
        ? conversation.doctorDeletedAt != null
        : conversation.patientDeletedAt != null;
    if (deletedForMe) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return conversation;
  }

  private mapConversationSummary(
    c: {
      id: bigint;
      doctorId: bigint;
      patientId: bigint;
      doctorArchivedAt: Date | null;
      patientArchivedAt: Date | null;
      doctorDeletedAt: Date | null;
      patientDeletedAt: Date | null;
      doctorLastReadAt: Date | null;
      patientLastReadAt: Date | null;
      lastMessageAt: Date | null;
      updatedAt: Date;
      doctor: { firstName: string; lastName: string };
      patient: { firstName: string; lastName: string };
      messages: Array<{
        id: bigint;
        body: string | null;
        type: string;
        senderUserId: bigint;
        createdAt: Date;
        attachmentName: string | null;
      }>;
    },
    ctx: { role: 'doctor' | 'patient' },
    currentUserId: string,
  ) {
    const peer =
      ctx.role === 'doctor'
        ? {
            name: `${c.patient.firstName} ${c.patient.lastName}`.trim(),
            role: 'patient' as const,
            id: c.patientId.toString(),
          }
        : {
            name: `${c.doctor.firstName} ${c.doctor.lastName}`.trim(),
            role: 'doctor' as const,
            id: c.doctorId.toString(),
          };

    const last = c.messages.reduce<
      (typeof c.messages)[number] | undefined
    >((acc, m) => {
      if (!acc) return m;
      return m.createdAt > acc.createdAt ? m : acc;
    }, undefined);
    const archived =
      ctx.role === 'doctor'
        ? c.doctorArchivedAt != null
        : c.patientArchivedAt != null;
    const deletedForMe =
      ctx.role === 'doctor'
        ? c.doctorDeletedAt != null
        : c.patientDeletedAt != null;
    const lastReadAt =
      ctx.role === 'doctor' ? c.doctorLastReadAt : c.patientLastReadAt;

    let unreadCount = 0;
    const peerMessages = c.messages.filter(
      (m) => m.senderUserId.toString() !== currentUserId,
    );
    if (peerMessages.length) {
      unreadCount = peerMessages.filter(
        (m) => !lastReadAt || m.createdAt > lastReadAt,
      ).length;
      // En listado solo traemos el último mensaje; si hay unread al menos 1.
      if (c.messages.length === 1 && unreadCount > 0) unreadCount = 1;
    }

    const preview = last
      ? last.type === 'text'
        ? last.body ?? ''
        : last.attachmentName || `[${last.type}]`
      : 'Sin mensajes';

    return {
      id: c.id.toString(),
      peerId: peer.id,
      peerName: peer.name,
      peerRole: peer.role,
      peerInitials: this.initials(peer.name),
      preview,
      timeLabel: this.formatTime(last?.createdAt ?? c.lastMessageAt ?? c.updatedAt),
      lastMessageAt: (last?.createdAt ?? c.lastMessageAt ?? c.updatedAt).toISOString(),
      unreadCount,
      archived,
      deletedForMe,
    };
  }

  private async mapConversationDetail(
    c: {
      id: bigint;
      doctorId: bigint;
      patientId: bigint;
      doctorArchivedAt: Date | null;
      patientArchivedAt: Date | null;
      doctorDeletedAt: Date | null;
      patientDeletedAt: Date | null;
      doctorLastReadAt: Date | null;
      patientLastReadAt: Date | null;
      lastMessageAt: Date | null;
      updatedAt: Date;
      doctor: { firstName: string; lastName: string };
      patient: { firstName: string; lastName: string };
      messages: Array<{
        id: bigint;
        senderUserId: bigint;
        type: string;
        body: string | null;
        attachmentKey: string | null;
        attachmentName: string | null;
        mimeType: string | null;
        sizeBytes: number | null;
        createdAt: Date;
      }>;
    },
    ctx: { role: 'doctor' | 'patient' },
    currentUserId: string,
  ) {
    const summary = this.mapConversationSummary(c, ctx, currentUserId);
    const messages = await Promise.all(
      c.messages.map((m) => this.mapMessage(m, currentUserId)),
    );
    return {
      ...summary,
      messages,
    };
  }

  private async mapMessage(
    m: {
      id: bigint;
      senderUserId: bigint;
      type: string;
      body: string | null;
      attachmentKey: string | null;
      attachmentName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      createdAt: Date;
    },
    currentUserId: string,
  ) {
    const fromMe = m.senderUserId.toString() === currentUserId;
    let url: string | null = null;
    if (m.attachmentKey) {
      try {
        url = await this.storage.getSignedUrl(m.attachmentKey);
      } catch {
        url = null;
      }
    }
    return {
      id: m.id.toString(),
      type: m.type,
      text: m.body ?? undefined,
      attachment: m.attachmentKey
        ? {
            id: m.id.toString(),
            name: m.attachmentName ?? m.attachmentKey,
            kind:
              m.type === 'pdf'
                ? ('pdf' as const)
                : m.type === 'video'
                  ? ('video' as const)
                  : ('image' as const),
            key: m.attachmentKey,
            mimeType: m.mimeType,
            url,
          }
        : undefined,
      from: fromMe ? ('me' as const) : ('peer' as const),
      sentAt: this.formatTime(m.createdAt),
      createdAt: m.createdAt.toISOString(),
      status: 'sent' as const,
    };
  }

  private initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  private formatTime(date: Date) {
    const d = new Date(date);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
    });
  }
}
