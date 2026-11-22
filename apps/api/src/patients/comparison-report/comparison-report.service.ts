import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  buildComparisonRows,
  chronologicalAgeYears,
  comparisonOverallScore,
  dermaOutcome,
} from '@piel360/shared';
import sharp from 'sharp';
import type { JwtPayload } from '../../auth/types';
import { PrismaService } from '../../prisma/prisma.service';
import { htmlToPdf } from '../../reports/pdf-render';
import { StorageService } from '../../storage/storage.service';
import type { ComparisonReportDto } from '../dto/comparison-report.dto';
import { PatientsService } from '../patients.service';
import { buildAestheticComparisonHtml } from './aesthetic-report-html';
import { buildDermComparisonHtml } from './derm-report-html';
import type { ReportPatientInfo, ReportPhoto } from './report-layout';

const GENDER_LABELS: Record<string, string> = {
  female: 'Femenino',
  male: 'Masculino',
  other: 'Otro',
};

/** Fechas de Colombia: el contenedor corre en UTC. */
function colombiaDateTime(date: Date): string {
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ANALYSIS_SELECT = {
  id: true,
  patientId: true,
  createdAt: true,
  analisisPiel360TaskId: true,
  fitzpatrickTaskId: true,
  isValid: true,
  imagePath: true,
  imagePreviewPath: true,
  aiDiagnosis: true,
  aiRawResponse: true,
  finalDiagnosis: true,
  finalDiagnosisCode: true,
  isConfirmed: true,
  isCorrected: true,
  doctorNotes: true,
} as const;

type ComparedAnalysis = NonNullable<
  Awaited<ReturnType<ComparisonReportService['loadAnalysis']>>
>;

/**
 * Reporte comparativo en PDF entre dos análisis del mismo paciente (estético
 * o dermatológico), con el diseño que mandó el cliente. Se regenera en cada
 * descarga porque las notas cambian, y se guarda con una key fija por par.
 */
@Injectable()
export class ComparisonReportService {
  private readonly logger = new Logger(ComparisonReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly patients: PatientsService,
  ) {}

  async generate(
    patientId: string,
    dto: ComparisonReportDto,
    user: JwtPayload,
  ): Promise<{ url: string }> {
    // Mismo acceso que la ficha del paciente.
    await this.patients.findOne(patientId, user);
    const [initial, current] = await Promise.all([
      this.loadAnalysis(dto.initialId),
      this.loadAnalysis(dto.currentId),
    ]);
    for (const a of [initial, current]) {
      if (!a || a.patientId.toString() !== patientId) {
        throw new BadRequestException('Los análisis no son de este paciente');
      }
      if (this.modeOf(a) !== dto.mode) {
        throw new BadRequestException(
          'Los análisis no son del tipo de comparación elegido',
        );
      }
    }
    const pair = [initial!, current!] as const;

    try {
      const patient = await this.patientInfo(patientId);
      const [initialPhoto, currentPhoto] = await Promise.all(
        pair.map((a) => this.photo(a)),
      );
      const generatedAt = colombiaDateTime(new Date());
      const html =
        dto.mode === 'aesthetic'
          ? buildAestheticComparisonHtml({
              patient,
              initial: {
                ...initialPhoto,
                overall: comparisonOverallScore(pair[0].aiRawResponse),
              },
              current: {
                ...currentPhoto,
                overall: comparisonOverallScore(pair[1].aiRawResponse),
              },
              rows: buildComparisonRows(
                pair[0].aiRawResponse,
                pair[1].aiRawResponse,
              ),
              generalNote: dto.generalNote ?? '',
              categoryNotes: dto.categoryNotes ?? {},
              generatedAt,
            })
          : buildDermComparisonHtml({
              patient,
              initial: { ...initialPhoto, outcome: dermaOutcome(pair[0]) },
              current: { ...currentPhoto, outcome: dermaOutcome(pair[1]) },
              comments: [
                dto.generalNote?.trim(),
                pair[0].doctorNotes?.trim() &&
                  `Análisis inicial: ${pair[0].doctorNotes.trim()}`,
                pair[1].doctorNotes?.trim() &&
                  `Análisis actual: ${pair[1].doctorNotes.trim()}`,
              ].filter((c): c is string => !!c),
              generatedAt,
            });
      const pdf = await htmlToPdf(html);
      const key = `patients/${patientId}/comparisons/${dto.mode}-${dto.initialId}-${dto.currentId}.pdf`;
      await this.storage.upload(key, pdf, 'application/pdf');
      return { url: await this.storage.getSignedUrl(key) };
    } catch (error) {
      this.logger.error(
        `No se pudo generar el reporte comparativo del paciente ${patientId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'No se pudo generar el reporte comparativo. Inténtalo de nuevo en unos minutos; si el problema sigue, avisa a soporte.',
      );
    }
  }

  private loadAnalysis(id: string) {
    return this.prisma.analysis.findUnique({
      where: { id: BigInt(id) },
      select: ANALYSIS_SELECT,
    });
  }

  /** Mismo criterio que el filtro de Comparaciones del web. */
  private modeOf(a: ComparedAnalysis): 'aesthetic' | 'derm' | null {
    if (a.analisisPiel360TaskId) return a.isValid ? 'aesthetic' : null;
    if (a.fitzpatrickTaskId) return null;
    return 'derm';
  }

  private async patientInfo(patientId: string): Promise<ReportPatientInfo> {
    const p = await this.prisma.patient.findUniqueOrThrow({
      where: { id: BigInt(patientId) },
      select: {
        firstName: true,
        lastName: true,
        docType: true,
        docNumber: true,
        birthDate: true,
        gender: true,
        doctor: { select: { user: { select: { name: true } } } },
      },
    });
    return {
      name: `${p.firstName} ${p.lastName}`.trim(),
      document: p.docNumber
        ? `${p.docType ? `${p.docType} ` : ''}${p.docNumber}`
        : null,
      age: chronologicalAgeYears(p.birthDate, new Date()),
      gender: p.gender ? (GENDER_LABELS[p.gender] ?? p.gender) : null,
      clinic: p.doctor?.user.name?.trim() || 'Piel360',
    };
  }

  /** La foto achicada a ~700 px: los originales pesan MB y el PDF los embebe. */
  private async photo(a: ComparedAnalysis): Promise<ReportPhoto> {
    const date = colombiaDateTime(a.createdAt);
    // En el estético `imagePath` es 'youcam' cuando no se guardó la selfie.
    const key =
      a.imagePath && a.imagePath !== 'youcam'
        ? (a.imagePreviewPath ?? a.imagePath)
        : null;
    if (!key) return { dataUri: null, date };
    try {
      const jpeg = await sharp(await this.storage.read(key))
        .rotate()
        .resize(700, 700, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
      return {
        dataUri: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
        date,
      };
    } catch (error) {
      this.logger.warn(
        `Foto del análisis ${a.id} no disponible para el reporte: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { dataUri: null, date };
    }
  }
}
