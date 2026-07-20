import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const email = `doctor-${randomUUID()}@test.piel360.local`;
  const password = 'SuperSecret123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra un doctor nuevo', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register/doctor')
      .send({ email, password, firstName: 'Ana', lastName: 'Pérez' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe('doctor');
  });

  it('rechaza un email duplicado', async () => {
    await request(app.getHttpServer())
      .post('/auth/register/doctor')
      .send({ email, password, firstName: 'Ana', lastName: 'Pérez' })
      .expect(409);
  });

  it('loguea con credenciales correctas', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('rechaza credenciales inválidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });
});
