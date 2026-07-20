import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('GatewayConfig admin CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@piel360.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
      });
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea un GatewayConfig sin devolver los secretos en claro', async () => {
    const res = await request(app.getHttpServer())
      .post('/payments/admin/gateway-configs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        environment: 'sandbox',
        publicKey: 'pub_test_123',
        privateKey: 'priv_test_secret',
        integritySecret: 'integrity_secret_value',
        webhookSecret: 'webhook_secret_value',
        isActive: false,
      })
      .expect(201);

    expect(res.body.publicKey).toBe('pub_test_123');
    expect(res.body.hasPrivateKey).toBe(true);
    expect(res.body.hasIntegritySecret).toBe(true);
    expect(res.body.hasWebhookSecret).toBe(true);
    expect(res.body.privateKey).toBeUndefined();
    expect(res.body.integritySecret).toBeUndefined();
    expect(res.body.webhookSecret).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('priv_test_secret');
    expect(JSON.stringify(res.body)).not.toContain('integrity_secret_value');
    expect(JSON.stringify(res.body)).not.toContain('webhook_secret_value');
  });

  it('lista GatewayConfigs sin exponer secretos y permite actualizar', async () => {
    const created = await request(app.getHttpServer())
      .post('/payments/admin/gateway-configs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        environment: 'sandbox',
        publicKey: 'pub_list_test',
        isActive: false,
      });

    const list = await request(app.getHttpServer())
      .get('/payments/admin/gateway-configs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain('priv_test_secret');

    const updated = await request(app.getHttpServer())
      .patch(`/payments/admin/gateway-configs/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publicKey: 'pub_list_test_updated' })
      .expect(200);
    expect(updated.body.publicKey).toBe('pub_list_test_updated');
  });

  it('rechaza el acceso de un no-admin', async () => {
    const doctor = await request(app.getHttpServer())
      .post('/auth/register/doctor')
      .send({
        email: `gwcfg-doctor-${Date.now()}@test.piel360.local`,
        password: 'SuperSecret123!',
        firstName: 'D',
        lastName: 'T',
      });

    await request(app.getHttpServer())
      .get('/payments/admin/gateway-configs')
      .set('Authorization', `Bearer ${doctor.body.accessToken}`)
      .expect(403);
  });
});
