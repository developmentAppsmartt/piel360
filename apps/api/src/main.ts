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

  // Web usa FRONTEND_URL. RN/Expo a menudo no envían Origin; en dev
  // también permitimos localhost y redes LAN (emulador / dispositivo físico).
  const frontendUrl = process.env.FRONTEND_URL;
  const isProd = process.env.NODE_ENV === 'production';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (frontendUrl && origin === frontendUrl) {
        callback(null, true);
        return;
      }
      if (
        !isProd &&
        (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) ||
          /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(
            origin,
          ) ||
          origin.startsWith('exp://'))
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
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
