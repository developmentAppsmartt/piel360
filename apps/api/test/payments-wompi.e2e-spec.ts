import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

const INTEGRITY_SECRET = 'test-integrity-secret';
const WEBHOOK_SECRET = 'test-webhook-secret';

function integritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
) {
  return createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${INTEGRITY_SECRET}`)
    .digest('hex');
}

function webhookChecksum(
  transactionId: string,
  status: string,
  amountInCents: number,
  timestamp: number,
) {
  return createHash('sha256')
    .update(
      `${transactionId}${status}${amountInCents}${timestamp}${WEBHOOK_SECRET}`,
    )
    .digest('hex');
}

describe('Wompi checkout + webhook (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let doctorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    const server = app.getHttpServer();

    const login = await request(server)
      .post('/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@piel360.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
      });
    adminToken = login.body.accessToken;

    const doctor = await request(server)
      .post('/auth/register/doctor')
      .send({
        email: `wompi-doctor-${Date.now()}@test.piel360.local`,
        password: 'SuperSecret123!',
        firstName: 'W',
        lastName: 'D',
      });
    doctorToken = doctor.body.accessToken;

    // Desactiva cualquier GatewayConfig 'wompi' activo de corridas anteriores
    // para que la búsqueda "activo" del servicio sea determinística.
    const existing = await request(server)
      .get('/payments/admin/gateway-configs')
      .set('Authorization', `Bearer ${adminToken}`);
    for (const config of existing.body as Array<{
      id: string;
      gatewayName: string;
      isActive: boolean;
    }>) {
      if (config.gatewayName === 'wompi' && config.isActive) {
        await request(server)
          .patch(`/payments/admin/gateway-configs/${config.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isActive: false });
      }
    }

    await request(server)
      .post('/payments/admin/gateway-configs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        gatewayName: 'wompi',
        environment: 'sandbox',
        publicKey: 'pub_test_wompi',
        integritySecret: INTEGRITY_SECRET,
        webhookSecret: WEBHOOK_SECRET,
        isActive: true,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('el checkout genera una firma de integridad correcta', async () => {
    const res = await request(app.getHttpServer())
      .post('/payments/wompi/checkout')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ planId: '1' })
      .expect(201);

    expect(res.body.currency).toBe('COP');
    expect(res.body.publicKey).toBe('pub_test_wompi');
    expect(res.body.integrity).toBe(
      integritySignature(
        res.body.reference,
        res.body.amount,
        res.body.currency,
      ),
    );
  });

  it('el webhook activa la suscripción pendiente con firma válida', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/payments/wompi/checkout')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ planId: '1' })
      .expect(201);

    const { reference, amount } = checkout.body;
    const timestamp = Math.floor(Date.now() / 1000);
    const wompiTransactionId = `wompi-tx-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .send({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: wompiTransactionId,
            status: 'APPROVED',
            amount_in_cents: amount,
            reference,
          },
        },
        signature: {
          checksum: webhookChecksum(
            wompiTransactionId,
            'APPROVED',
            amount,
            timestamp,
          ),
          properties: [
            'transaction.id',
            'transaction.status',
            'transaction.amount_in_cents',
          ],
        },
        timestamp,
      })
      .expect(200);

    const subs = await request(app.getHttpServer())
      .get('/me/subscriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);
    const activated = subs.body.find(
      (s: { wompiTransactionId: string }) =>
        s.wompiTransactionId === wompiTransactionId,
    );
    expect(activated).toBeDefined();
    expect(activated.status).toBe('active');

    // Reentrega del webhook sobre una suscripción ya activa -> no-op, no debe fallar.
    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .send({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: wompiTransactionId,
            status: 'APPROVED',
            amount_in_cents: amount,
            reference,
          },
        },
        signature: {
          checksum: webhookChecksum(
            wompiTransactionId,
            'APPROVED',
            amount,
            timestamp,
          ),
          properties: [],
        },
        timestamp,
      })
      .expect(200);
  });

  it('rechaza una firma de webhook inválida', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/payments/wompi/checkout')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ planId: '1' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .send({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'wompi-tx-bad-signature',
            status: 'APPROVED',
            amount_in_cents: checkout.body.amount,
            reference: checkout.body.reference,
          },
        },
        signature: { checksum: 'not-a-valid-checksum', properties: [] },
        timestamp: Math.floor(Date.now() / 1000),
      })
      .expect(403);
  });

  it('no falla ante una referencia desconocida (idempotencia/no-op)', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    await request(app.getHttpServer())
      .post('/webhooks/wompi')
      .send({
        event: 'transaction.updated',
        data: {
          transaction: {
            id: 'wompi-tx-unknown',
            status: 'APPROVED',
            amount_in_cents: 29900,
            reference: 'SUB-UNKNOWN-REF',
          },
        },
        signature: {
          checksum: webhookChecksum(
            'wompi-tx-unknown',
            'APPROVED',
            29900,
            timestamp,
          ),
          properties: [],
        },
        timestamp,
      })
      .expect(200);
  });
});
