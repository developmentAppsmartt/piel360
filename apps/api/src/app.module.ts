import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { AnalysesModule } from './analyses/analyses.module';
import { YoucamModule } from './youcam/youcam.module';
import { FitzpatrickModule } from './fitzpatrick/fitzpatrick.module';
import { SkiniverModule } from './skiniver/skiniver.module';
import { EncyclopediaModule } from './encyclopedia/encyclopedia.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { RolesModule } from './roles/roles.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { CommonModule } from './common/common.module';
import { MessagesModule } from './messages/messages.module';
import { ProductsModule } from './products/products.module';
import { RoutinesModule } from './routines/routines.module';
import { TreatmentsModule } from './treatments/treatments.module';
import { AnalysisConditionsModule } from './analysis-conditions/analysis-conditions.module';
import { AppConfigModule } from './app-config/app-config.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SpecialtyAccessModule } from './specialty-access/specialty-access.module';
import { ModeratorsModule } from './moderators/moderators.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { LaborTechnicianProfilesModule } from './labor-technician-profiles/labor-technician-profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
          // Sin tope, ioredis reintenta para siempre con backoff creciente —
          // en local/CI sin Redis eso deja timers de reconexión colgando
          // entre tests. Tras 5 intentos se rinde (BullMQ seguirá encolando
          // en memoria y lo reintentará cuando Redis vuelva a estar arriba).
          retryStrategy: (times: number) =>
            times > 5 ? null : Math.min(times * 200, 2000),
        },
      }),
    }),
    PrismaModule,
    SpecialtyAccessModule,
    CommonModule,
    MailModule,
    SmsModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    PatientsModule,
    MessagesModule,
    AnalysesModule,
    YoucamModule,
    FitzpatrickModule,
    SkiniverModule,
    EncyclopediaModule,
    SubscriptionsModule,
    PaymentsModule,
    PlansModule,
    StorageModule,
    AdminModule,
    RolesModule,
    HealthModule,
    ProductsModule,
    RoutinesModule,
    TreatmentsModule,
    AnalysisConditionsModule,
    AppConfigModule,
    OrganizationsModule,
    ModeratorsModule,
    SpecialtiesModule,
    LaborTechnicianProfilesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
