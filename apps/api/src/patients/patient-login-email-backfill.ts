import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Desfasado = {
  patient_id: bigint;
  user_id: bigint;
  email: string;
  taken: boolean;
};

/**
 * Hasta que la edición del paciente sincronizó `users.email`
 * (`patient-login-email.ts`), cambiar el correo en la ficha dejaba el inicio
 * de sesión con el viejo. Al arrancar, copia el de la ficha a la cuenta.
 *
 * Si el correo nuevo ya lo usa otra cuenta, ese paciente se salta y queda en
 * el log para revisarlo a mano. Idempotente: uno sincronizado ya no entra.
 */
@Injectable()
export class PatientLoginEmailBackfill implements OnApplicationBootstrap {
  private readonly logger = new Logger(PatientLoginEmailBackfill.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.sincronizar();
    } catch (error) {
      // Un fallo aquí no puede impedir que el API arranque.
      this.logger.error('Sincronizar correos de pacientes falló', error);
    }
  }

  async sincronizar(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Desfasado[]>`
      select p.id as patient_id, u.id as user_id, lower(trim(p.email)) as email,
        exists (
          select 1 from users o
          where lower(o.email) = lower(trim(p.email)) and o.id <> u.id
        ) as taken
      from patients p
      join users u on u.id = p.user_id
      where p.email is not null and trim(p.email) <> ''
        and lower(trim(p.email)) <> lower(coalesce(u.email, ''))`;
    if (rows.length === 0) return 0;

    const libres = rows.filter((r) => !r.taken);
    const saltados = rows.filter((r) => r.taken);
    for (const row of libres) {
      await this.prisma.user.update({
        where: { id: row.user_id },
        data: { email: row.email },
      });
    }
    this.logger.log(
      `Correos de inicio de sesión sincronizados: ${libres.length}` +
        (saltados.length
          ? ` (saltados por duplicado: ${saltados.length}, pacientes ${saltados
              .map((r) => r.patient_id.toString())
              .join(', ')})`
          : ''),
    );
    return libres.length;
  }
}
