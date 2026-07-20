import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Patients scoping (e2e)', () => {
  let app: INestApplication<App>;
  const password = 'SuperSecret123!';

  let doctorAToken: string;
  let doctorBToken: string;
  let patientToken: string;
  let patientOfDoctorAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const server = app.getHttpServer();

    const doctorA = await request(server)
      .post('/auth/register/doctor')
      .send({
        email: `doctor-a-${randomUUID()}@test.piel360.local`,
        password,
        firstName: 'DoctorA',
        lastName: 'Test',
      });
    doctorAToken = doctorA.body.accessToken;

    const doctorB = await request(server)
      .post('/auth/register/doctor')
      .send({
        email: `doctor-b-${randomUUID()}@test.piel360.local`,
        password,
        firstName: 'DoctorB',
        lastName: 'Test',
      });
    doctorBToken = doctorB.body.accessToken;

    const patient = await request(server)
      .post('/auth/register/patient')
      .send({
        email: `patient-${randomUUID()}@test.piel360.local`,
        password,
        firstName: 'Patient',
        lastName: 'Test',
      });
    patientToken = patient.body.accessToken;

    const created = await request(server)
      .post('/patients')
      .set('Authorization', `Bearer ${doctorAToken}`)
      .send({ firstName: 'Juan', lastName: 'Lesión' });
    patientOfDoctorAId = created.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('el doctor A puede leer su propio paciente', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patientOfDoctorAId}`)
      .set('Authorization', `Bearer ${doctorAToken}`)
      .expect(200);
  });

  it('el doctor B NO puede leer el paciente del doctor A', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patientOfDoctorAId}`)
      .set('Authorization', `Bearer ${doctorBToken}`)
      .expect(403);
  });

  it('un paciente no puede leer el registro de otro paciente', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patientOfDoctorAId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(403);
  });

  it('un paciente puede completar su encuesta y luego verla reflejada', async () => {
    const before = await request(app.getHttpServer())
      .get('/me/survey')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);
    expect(before.body.surveyCompletedAt).toBeNull();

    await request(app.getHttpServer())
      .post('/me/survey')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        skinType: 'mixta',
        fitzpatrickType: 'III',
        surveyResponses: { q1: 'no' },
      })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/me/survey')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);
    expect(after.body.surveyCompletedAt).not.toBeNull();
  });
});
