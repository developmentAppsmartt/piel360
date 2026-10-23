import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolverDiagnosticoFinal } from './final-diagnosis';

/**
 * Las correcciones guardadas antes de que existiera `final_diagnosis_code`
 * tienen el diagnóstico del profesional pero no su código, y los reportes las
 * seguían contando con el de la IA (una corrección de Melanoma a Queratosis
 * actínica no cambiaba nada). Al arrancar, les resuelve el código con la misma
 * función que usa `confirm`.
 *
 * Idempotente: una fila rellenada ya no vuelve a entrar. Las que quedan en
 * nulo (iguales a la IA o sin coincidencia) se reevalúan en cada arranque; son
 * pocas. No es una migración porque la resolución vive en TS (catálogo y
 * `topn`) y copiarla en SQL sería una segunda versión que mantener.
 */
@Injectable()
export class FinalDiagnosisBackfill implements OnApplicationBootstrap {
  private readonly logger = new Logger(FinalDiagnosisBackfill.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.rellenar();
    } catch (error) {
      // Un fallo aquí no puede impedir que el API arranque.
      this.logger.error('Relleno de diagnósticos corregidos falló', error);
    }
  }

  /** Devuelve cuántas filas rellenó. */
  async rellenar(): Promise<number> {
    const pendientes = await this.prisma.analysis.findMany({
      where: {
        finalDiagnosis: { not: null },
        finalDiagnosisCode: null,
        analisisPiel360TaskId: null,
        fitzpatrickTaskId: null,
      },
      select: { id: true, finalDiagnosis: true, aiRawResponse: true },
    });

    let rellenadas = 0;
    for (const fila of pendientes) {
      const clase = resolverDiagnosticoFinal(
        fila.aiRawResponse,
        fila.finalDiagnosis,
        null,
      );
      if (!clase.code) continue;
      await this.prisma.analysis.update({
        where: { id: fila.id },
        data: {
          finalDiagnosisCode: clase.code,
          finalDiagnosisCategory: clase.category,
        },
      });
      rellenadas++;
    }

    if (pendientes.length > 0) {
      this.logger.log(
        `Relleno de diagnósticos corregidos: ${rellenadas} rellenadas, ${pendientes.length - rellenadas} sin cambio`,
      );
    }
    return rellenadas;
  }
}
