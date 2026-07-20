import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { JwtPayload } from '../auth/types';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { CreateYoucamAnalysisDto } from './dto/create-youcam-analysis.dto';
import { YOUCAM_POLL_QUEUE, type YoucamPollJobData } from './queues';
import { YouCamService } from './youcam.service';

const YOUCAM_PROVIDER_SLUG = 'youcam';
const POLL_ATTEMPTS = 20;
const POLL_BACKOFF_DELAY_MS = 30_000;

@Injectable()
export class YoucamAnalysesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youcam: YouCamService,
    private readonly subscriptions: SubscriptionsService,
    private readonly patients: PatientsService,
    @InjectQueue(YOUCAM_POLL_QUEUE)
    private readonly pollQueue: Queue<YoucamPollJobData>,
  ) {}

  /** `POST /youcam/analyses` — MIGRACION.md §2.5/§4.2. */
  async createAnalysis(
    dto: CreateYoucamAnalysisDto,
    image: Buffer,
    currentUser: JwtPayload,
  ) {
    await this.patients.findOne(dto.patientId, currentUser); // scoping, igual que Skiniver

    const userId = BigInt(currentUser.sub);
    const subscription = await this.subscriptions.findActiveForUser(
      this.prisma,
      userId,
      YOUCAM_PROVIDER_SLUG,
    );
    if (!subscription) {
      throw new BadRequestException(
        'No tienes una suscripción activa de YouCam',
      );
    }

    const remaining = await this.subscriptions.remainingCredits(
      this.prisma,
      subscription.id,
      subscription.plan.analysisLimit,
    );
    if (remaining <= 0) {
      throw new BadRequestException(
        'Has agotado los análisis disponibles de tu plan',
      );
    }
    // El crédito NO se consume aquí — se consume al completarse (asimetría
    // intencional vs. Skiniver, MIGRACION.md deuda #4).

    const fileId = await this.youcam.uploadImage(image);
    const taskId = await this.youcam.startAnalysis(fileId);

    const analysis = await this.prisma.analysis.create({
      data: {
        patientId: BigInt(dto.patientId),
        userId,
        youcamTaskId: taskId,
        // YouCam no requiere que persistamos la selfie original (a diferencia
        // de Skiniver): la imagen ya vive en el S3 propio de YouCam durante
        // el procesamiento y solo nos interesan los resultados/máscaras.
        imagePath: 'youcam',
        bodyRegion: dto.bodyRegion,
        xCoord: dto.xCoord,
        yCoord: dto.yCoord,
        zCoord: dto.zCoord,
        isValid: false,
      },
    });

    await this.pollQueue.add(
      'poll',
      { analysisId: analysis.id.toString(), taskId },
      {
        attempts: POLL_ATTEMPTS,
        backoff: { type: 'exponential', delay: POLL_BACKOFF_DELAY_MS },
        delay: POLL_BACKOFF_DELAY_MS,
      },
    );

    return { analysisId: analysis.id.toString() };
  }
}
