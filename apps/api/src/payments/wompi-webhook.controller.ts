import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { WompiWebhookPayload } from './wompi-webhook.types';

/**
 * Ruta fija sin prefijo `/api` — debe coincidir exactamente con la URL
 * registrada en el dashboard de Wompi (mismo patrón `/webhooks/{proveedor}`
 * que usaba Laravel, ver `routes/web.php`). Público — la firma del payload
 * es la autenticación (MIGRACION.md §2.3).
 */
@Controller('webhooks/wompi')
export class WompiWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(200)
  handle(@Body() payload: WompiWebhookPayload) {
    return this.paymentsService.handleWompiWebhook(payload);
  }
}
