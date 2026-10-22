import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { AnalisisPiel360WebhookService } from './youcam-webhook.service';

/**
 * Ruta fija sin prefijo `/api` — debe coincidir exactamente con la URL
 * registrada en el dashboard de YouCam/Perfect Corp
 * (`https://piel360.com/webhooks/youcam`, mismo patrón `/webhooks/{proveedor}`
 * que usaba Laravel). Público — sin `JwtAuthGuard`, la firma Svix es la autenticación.
 */
@Controller('webhooks/youcam')
export class AnalisisPiel360WebhookController {
  constructor(private readonly analisisPiel360WebhookService: AnalisisPiel360WebhookService) {}

  @Post()
  @HttpCode(200)
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    return this.analisisPiel360WebhookService.handle(req.rawBody!, headers);
  }
}
