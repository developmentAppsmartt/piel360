import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import './common/bigint-json.polyfill';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true — necesario para verificar firmas de los webhooks de Wompi
  // (sha256 sobre el body crudo) y YouCam (HMAC estilo Svix). Ver INTEGRACIONES-IA.md.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(cookieParser());
  // Los webhooks quedan fuera de /api: deben coincidir exactamente con las
  // URLs ya registradas en los dashboards de Wompi/YouCam
  // (`/webhooks/wompi`, `/webhooks/youcam` — mismo patrón que Laravel).
  app.setGlobalPrefix('api', {
    exclude: ['health', 'webhooks/wompi', 'webhooks/youcam'],
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Piel360 API')
    .setDescription('API de la plataforma de diagnóstico dermatológico Piel360')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
