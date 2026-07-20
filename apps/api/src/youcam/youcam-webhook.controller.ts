import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { YoucamWebhookService } from './youcam-webhook.service';

/**
 * Ruta fija sin prefijo `/api` — debe coincidir exactamente con la URL
 * registrada en el dashboard de YouCam/Perfect Corp
 * (`https://piel360.com/webhooks/youcam`, mismo patrón `/webhooks/{proveedor}`
 * que usaba Laravel). Público — sin `JwtAuthGuard`, la firma Svix es la autenticación.
 */
@Controller('webhooks/youcam')
export class YoucamWebhookController {
  constructor(private readonly youcamWebhookService: YoucamWebhookService) {}

  @Post()
  @HttpCode(200)
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    return this.youcamWebhookService.handle(req.rawBody!, headers);
  }
}
