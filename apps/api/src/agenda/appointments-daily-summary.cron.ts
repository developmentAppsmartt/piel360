import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const ZONA = 'America/Bogota';
const TIPO = 'appointment_daily_summary';

/** Singular / plural, en el orden en que se leen en el resumen. */
const ESTADOS: [string, string, string][] = [
  ['requested', 'solicitada por paciente', 'solicitadas por pacientes'],
  [
    'proposed',
    'asignada pendiente del paciente',
    'asignadas pendientes del paciente',
  ],
  ['confirmed', 'confirmada', 'confirmadas'],
  ['completed', 'completada', 'completadas'],
  ['declined', 'rechazada', 'rechazadas'],
  ['cancelled', 'cancelada', 'canceladas'],
];

/**
 * Hoy en Colombia, como `YYYY-MM-DD` y como rango UTC. El contenedor corre en
 * UTC: con la fecha del servidor, una cita a las 19:00 de Bogotá ya sería
 * «mañana». Colombia no tiene horario de verano, así que el desfase es fijo.
 */
export function hoyEnColombia(ahora = new Date()) {
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(
    ahora,
  );
  const desde = new Date(`${fecha}T00:00:00-05:00`);
  const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);
  return { fecha, desde, hasta };
}

export function textoDelResumen(counts: Record<string, number>): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const partes = ESTADOS.filter(([estado]) => counts[estado]).map(
    ([estado, uno, varios]) =>
      `${counts[estado]} ${counts[estado] === 1 ? uno : varios}`,
  );
  const citas = total === 1 ? '1 cita' : `${total} citas`;
  return `Tienes ${citas} hoy: ${partes.join(', ')}.`;
}

/**
 * A las 5:00 de Colombia, cada profesional con citas hoy recibe un resumen por
 * estado en la campana. Va a la misma tabla `notifications` que los avisos en
 * tiempo real de la agenda, y al mismo destinatario: el dueño de la agenda.
 */
@Injectable()
export class AppointmentsDailySummaryCron {
  private readonly logger = new Logger(AppointmentsDailySummaryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 5 * * *', { timeZone: ZONA })
  async alAmanecer() {
    try {
      const enviados = await this.enviarResumenDeHoy();
      this.logger.log(`Resumen de citas de hoy: ${enviados} profesionales`);
    } catch (err) {
      this.logger.error(
        `Resumen de citas falló: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Devuelve cuántos resúmenes creó. Se puede ejecutar varias veces el mismo
   * día: el que ya existe no se repite. */
  async enviarResumenDeHoy(ahora = new Date()): Promise<number> {
    const { fecha, desde, hasta } = hoyEnColombia(ahora);
    const grupos = await this.prisma.appointment.groupBy({
      by: ['doctorId', 'status'],
      where: { startsAt: { gte: desde, lt: hasta } },
      _count: { _all: true },
    });

    const porAgenda = new Map<bigint, Record<string, number>>();
    for (const g of grupos) {
      const counts = porAgenda.get(g.doctorId) ?? {};
      counts[g.status] = g._count._all;
      porAgenda.set(g.doctorId, counts);
    }
    if (porAgenda.size === 0) return 0;

    const doctores = await this.prisma.doctor.findMany({
      where: { id: { in: [...porAgenda.keys()] } },
      select: { id: true, userId: true },
    });

    let enviados = 0;
    for (const doctor of doctores) {
      const counts = porAgenda.get(doctor.id);
      if (!counts) continue;
      const yaEsta = await this.prisma.notification.findFirst({
        where: {
          userId: doctor.userId,
          type: TIPO,
          data: { path: ['date'], equals: fecha },
        },
        select: { id: true },
      });
      if (yaEsta) continue;
      await this.notifications.create({
        userId: doctor.userId,
        type: TIPO,
        title: 'Tus citas de hoy',
        body: textoDelResumen(counts),
        data: { date: fecha, counts },
      });
      enviados++;
    }
    return enviados;
  }
}
