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

export type PoolProvider = 'skiniver' | 'perfectcorp';

/** Disponibilidad de créditos en bolsa para contratar un plan. */
export interface PlanPoolAvailability {
  poolProvider: PoolProvider;
  poolAvailable: number;
  poolRequired: number;
  poolPurchasable: boolean;
  poolUnavailableReason: string | null;
}

/** `GET /plans` — catálogo de planes activos por proveedor. */
export interface Plan extends PlanPoolAvailability {
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
  /** Límites por bolsa (Skiniver vs Estético/Fototipo). */
  analysisLimits?: {
    skiniver?: number;
    aesthetic?: number;
  };
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
