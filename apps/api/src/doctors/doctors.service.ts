import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.doctor.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: BigInt(id) },
    });
    if (!doctor) throw new NotFoundException('Doctor no encontrado');
    return doctor;
  }

  async update(id: string, dto: UpdateDoctorDto) {
    await this.findOne(id);
    return this.prisma.doctor.update({ where: { id: BigInt(id) }, data: dto });
  }

  async updateMe(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.requireDoctorByUserId(userId);
    return this.prisma.doctor.update({
      where: { id: doctor.id },
      data: dto,
    });
  }
}
