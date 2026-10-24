import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgContextService } from '../organizations/org-context.service';
import { PrismaService } from '../prisma/prisma.service';
import type { DoctorIds } from './doctor-reports.queries';

/** Qué pacientes cubre un reporte del admin: toda la plataforma, una empresa o
 * un profesional. */
@Injectable()
export class AdminReportScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgContext: OrgContextService,
  ) {}

  /**
   * Una empresa se resuelve desde su dueño con el mismo cálculo que usa su
   * panel (`resolvePatientDoctorScope`), para que el admin vea exactamente lo
   * que ve la empresa.
   */
  async doctorIds(query: {
    organizationId?: string;
    professionalUserId?: string;
  }): Promise<DoctorIds> {
    if (query.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: BigInt(query.organizationId) },
        select: { ownerUserId: true },
      });
      if (!org) throw new BadRequestException('Empresa no encontrada');
      const scope = await this.orgContext.resolvePatientDoctorScope(
        org.ownerUserId.toString(),
      );
      return scope.visibleDoctorIds.map((id) => id.toString());
    }

    if (query.professionalUserId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: BigInt(query.professionalUserId) },
        select: { id: true },
      });
      if (!doctor) throw new BadRequestException('Profesional no encontrado');
      return [doctor.id.toString()];
    }

    return null;
  }

  /** Lo justo para el selector de alcance (sin correos ni datos de contacto). */
  async options() {
    const [organizations, doctors] = await Promise.all([
      this.prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.doctor.findMany({
        select: {
          user: {
            select: {
              id: true,
              name: true,
              organizationMembers: {
                select: { organization: { select: { name: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      }),
    ]);

    return {
      organizations: organizations.map((o) => ({
        id: o.id.toString(),
        name: o.name,
      })),
      professionals: doctors.map(({ user }) => ({
        userId: user.id.toString(),
        name: user.name,
        organizationName:
          user.organizationMembers[0]?.organization.name ?? null,
      })),
    };
  }
}
