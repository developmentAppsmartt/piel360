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
  /** % comisión de la pasarela sobre el bruto. */
  feePercent?: number;
  /** Gasto operativo fijo (COP) — legacy. */
  operationalCostFixed?: number;
  /** Gasto operativo % sobre neto tras pasarela. */
  operationalCostPercent?: number;
  hasPayoutApiKey?: boolean;
  hasPayoutUserPrincipalId?: boolean;
  payoutAccountId?: string | null;
  payoutsConfigured?: boolean;
  /** false si los secretos existen pero no se pueden descifrar con ENCRYPTION_KEY. */
  secretsReadable?: boolean;
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
  feePercent?: number;
  operationalCostFixed?: number;
  operationalCostPercent?: number;
  payoutApiKey?: string;
  payoutUserPrincipalId?: string;
  payoutAccountId?: string;
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
export interface PlanFeature {
  label: string;
  /** true = incluido (✓), false = no incluido (✗) */
  included: boolean;
}

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
  /** Virtudes comerciales (✓ / ✗) para la card del catálogo. */
  features?: PlanFeature[];
  /**
   * Cobertura comercial: condiciones estéticas y clases/enfermedades
   * dermatológicas mostradas en el modal de la card.
   */
  coverage?: {
    aesthetic?: { key: string; label: string; description: string }[];
    dermatologyClasses?: { key: string; label: string; description: string }[];
    dermatologyDiseases?: { key: string; label: string; description: string }[];
    aestheticHtml?: string;
    dermatologyClassesHtml?: string;
    dermatologyDiseasesHtml?: string;
  } | null;
  /** Color del header de la card (id de paleta o hex). */
  headerColor?: string | null;
  /** Costos API por proveedor (unidades × precio unitario). */
  apiCosts?: {
    skiniver?: { units: number; unitPrice: number };
    youcam?: { units: number; unitPrice: number };
    fitzpatrick?: { units: number; unitPrice: number };
  };
  /** Si true, el checkout suma IVA (% global). */
  ivaEnabled?: boolean;
  /** % IVA usado para calcular `customerPrice` (config global). */
  ivaPercent?: number;
  /**
   * Precio que ve el cliente / se cobra en checkout.
   * = `price` + IVA si `ivaEnabled`; si no, igual a `price`.
   */
  customerPrice?: string;
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
