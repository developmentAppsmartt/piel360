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
import { SkiniverModule } from './skiniver/skiniver.module';
import { EncyclopediaModule } from './encyclopedia/encyclopedia.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { CommonModule } from './common/common.module';
import { MessagesModule } from './messages/messages.module';

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
    CommonModule,
    MailModule,
    AuthModule,
    UsersModule,
    DoctorsModule,
    PatientsModule,
    MessagesModule,
    AnalysesModule,
    YoucamModule,
    SkiniverModule,
    EncyclopediaModule,
    SubscriptionsModule,
    PaymentsModule,
    PlansModule,
    StorageModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
