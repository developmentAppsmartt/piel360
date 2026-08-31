/** Respuesta de `POST /payments/wompi/checkout` — payload que necesita el
 * widget de Wompi (`WidgetCheckout`) más el id de la suscripción `pending`
 * recién creada, usado por el frontend para hacer polling de su activación. */
export interface WompiCheckoutResponse {
  publicKey: string;
  amount: number;
  currency: string;
  reference: string;
  integrity: string;
  customerEmail: string;
  customerFullName: string;
  subscriptionId: string;
}

/** `GatewayConfig` sin los secretos en claro — igual que `toSafeGatewayConfig`
 * en `payments.service.ts`. */
export interface GatewayConfigSafe {
  id: string;
  gatewayName: string;
  environment: "sandbox" | "production";
  publicKey: string;
  isActive: boolean;
  hasPrivateKey: boolean;
  hasIntegritySecret: boolean;
  hasWebhookSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGatewayConfigInput {
  gatewayName?: string;
  environment: "sandbox" | "production";
  publicKey: string;
  privateKey?: string;
  integritySecret?: string;
  webhookSecret?: string;
  isActive?: boolean;
}

export type UpdateGatewayConfigInput = Partial<CreateGatewayConfigInput>;

export type PlanType = 'individual' | 'business';

/** `GET /plans` — catálogo de planes activos por proveedor. */
export interface Plan {
  id: string;
  analysisProviderId: string;
  analysisProviderIds: string[];
  name: string;
  planType: PlanType;
  analysisLimit: number;
  price: string;
  durationDays: number;
  maxUsers: number;
  modules: string[];
  roleLimits: Record<string, number>;
  isActive: boolean;
  description: string | null;
  provider: {
    id: string;
    name: string;
    slug: string;
  };
  /** Proveedores incluidos en el paquete (planes empresas con 1–3 análisis). */
  providers?: {
    id: string;
    name: string;
    slug: string;
    displayLabel: string | null;
  }[];
}
