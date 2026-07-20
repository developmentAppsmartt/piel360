import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Webhook } from 'svix';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { YouCamService } from '../src/youcam/youcam.service';

const TEST_WEBHOOK_SECRET = `whsec_${Buffer.from('test-youcam-webhook-secret-32by').toString('base64')}`;

const youCamServiceStub: Partial<YouCamService> = {
  // Puerto sin listener en localhost -> ECONNREFUSED inmediato (sin
  // resolución DNS), a diferencia de un dominio inexistente que puede
  // tardar varios segundos en fallar bajo carga.
  checkStatus: jest.fn().mockResolvedValue({
    output: [
      { type: 'hd_wrinkle', mask_urls: ['http://127.0.0.1:1/mask.jpg'] },
    ],
  }),
};

function signPayload(payload: object) {
  const rawBody = JSON.stringify(payload);
  const msgId = `msg-${Date.now()}`;
  const timestamp = new Date();
  const webhook = new Webhook(TEST_WEBHOOK_SECRET);
  const signature = webhook.sign(msgId, timestamp, rawBody);
  return {
    headers: {
      'webhook-id': msgId,
      'webhook-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'webhook-signature': signature,
    },
  };
}

describe('YouCam webhook (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let doctorToken: string;
  let doctorUserId: string;
  let patientId: string;

  beforeAll(async () => {
    process.env.YOUCAM_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(YouCamService)
      .useValue(youCamServiceStub)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();
    prisma = app.get(PrismaService);
    const server = app.getHttpServer();

    const doctor = await request(server)
      .post('/auth/register/doctor')
      .send({
        email: `youcam-doctor-${Date.now()}@test.piel360.local`,
        password: 'SuperSecret123!',
        firstName: 'Y',
        lastName: 'D',
      });
    doctorToken = doctor.body.accessToken;
    doctorUserId = doctor.body.user.id;

    const patient = await request(server)
      .post('/patients')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ firstName: 'Paciente', lastName: 'YouCam' });
    patientId = patient.body.id;

    const login = await request(server)
      .post('/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@piel360.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
      });
    await request(server)
      .post('/admin/subscriptions')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ userId: doctorUserId, planId: '2' }) // Plan YouCam Básico (seed.ts)
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAnalysis(taskId: string) {
    return prisma.analysis.create({
      data: {
        patientId: BigInt(patientId),
        userId: BigInt(doctorUserId),
        youcamTaskId: taskId,
        imagePath: 'youcam',
        isValid: false,
      },
    });
  }

  // Timeout mayor: el path de éxito descarga la máscara con un fetch real a
  // un dominio inválido (a propósito, ver mock de arriba) — la resolución
  // DNS que falla puede tardar más que el timeout por defecto de Jest (5s)
  // bajo carga (toda la suite e2e corriendo junta).
  it('procesa un webhook exitoso: actualiza el análisis y consume un crédito', async () => {
    const taskId = `task-success-${Date.now()}`;
    const analysis = await createAnalysis(taskId);

    const payload = { data: { taskId, taskStatus: 'success' } };
    const { headers } = signPayload(payload);

    await request(app.getHttpServer())
      .post('/webhooks/youcam')
      .set(headers)
      .send(payload)
      .expect(200);

    const updated = await prisma.analysis.findUniqueOrThrow({
      where: { id: analysis.id },
    });
    expect(updated.isValid).toBe(true);

    const usage = await prisma.subscriptionUsage.findFirst({
      where: { analysisId: analysis.id },
    });
    expect(usage).not.toBeNull();
  }, 15000);

  it('marca is_valid=false en un webhook de error, sin consumir crédito', async () => {
    const taskId = `task-error-${Date.now()}`;
    const analysis = await createAnalysis(taskId);

    const payload = { data: { taskId, taskStatus: 'error' } };
    const { headers } = signPayload(payload);

    await request(app.getHttpServer())
      .post('/webhooks/youcam')
      .set(headers)
      .send(payload)
      .expect(200);

    const updated = await prisma.analysis.findUniqueOrThrow({
      where: { id: analysis.id },
    });
    expect(updated.isValid).toBe(false);

    const usage = await prisma.subscriptionUsage.findFirst({
      where: { analysisId: analysis.id },
    });
    expect(usage).toBeNull();
  });

  it('responde 200 sin efecto ante un taskId desconocido', async () => {
    const payload = {
      data: { taskId: 'task-does-not-exist', taskStatus: 'success' },
    };
    const { headers } = signPayload(payload);

    await request(app.getHttpServer())
      .post('/webhooks/youcam')
      .set(headers)
      .send(payload)
      .expect(200);
  });

  it('rechaza una firma inválida', async () => {
    const payload = { data: { taskId: 'irrelevant', taskStatus: 'success' } };

    await request(app.getHttpServer())
      .post('/webhooks/youcam')
      .set('webhook-id', 'msg-bad')
      .set('webhook-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('webhook-signature', 'v1,not-a-valid-signature')
      .send(payload)
      .expect(403);
  });
});
