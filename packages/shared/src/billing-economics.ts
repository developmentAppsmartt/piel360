/** Economía de venta de plan: IVA, pasarela, gasto op. %, tokens API, comisión aliada. */

export type PlanApiCostLine = {
  units: number;
  /** Precio por unidad en la moneda del proveedor (EUR Skiniver, USD YouCam/Fitzpatrick). */
  unitPrice: number;
};

export type PlanApiCosts = {
  skiniver?: PlanApiCostLine;
  youcam?: PlanApiCostLine;
  fitzpatrick?: PlanApiCostLine;
};

export type BillingRates = {
  usdToCop: number;
  eurToCop: number;
  /** % IVA por defecto (se aplica solo si el plan tiene ivaEnabled). */
  ivaPercentDefault: number;
};

export const DEFAULT_BILLING_RATES: BillingRates = {
  usdToCop: 3500,
  eurToCop: 3800,
  ivaPercentDefault: 19,
};

/** Unidades de bolsa consumidas por cada análisis. */
export const API_UNITS_PER_ANALYSIS = {
  skiniver: 1,
  youcam: 22,
  fitzpatrick: 10,
} as const;

export const BILLING_CONFIG_KEYS = {
  usdToCop: 'usd_to_cop',
  eurToCop: 'eur_to_cop',
  ivaPercentDefault: 'iva_percent_default',
} as const;

export function resolveApiUnitsForPlan(input: {
  selectedSlugs: string[];
  planType: 'individual' | 'business';
  analysisLimit: number;
  skiniverLimit: number;
  aestheticLimit: number;
}): {
  skiniverUnits: number;
  youcamUnits: number;
  fitzpatrickUnits: number;
  skiniverAnalyses: number;
  youcamAnalyses: number;
  fitzpatrickAnalyses: number;
} {
  const has = (slug: string) => input.selectedSlugs.includes(slug);
  const skiniverAnalyses =
    has('skiniver')
      ? input.planType === 'individual'
        ? Math.max(0, input.analysisLimit)
        : Math.max(0, input.skiniverLimit)
      : 0;
  const aestheticAnalyses =
    has('youcam') || has('fitzpatrick')
      ? input.planType === 'individual'
        ? Math.max(0, input.analysisLimit)
        : Math.max(0, input.aestheticLimit)
      : 0;
  const youcamAnalyses = has('youcam') ? aestheticAnalyses : 0;
  const fitzpatrickAnalyses = has('fitzpatrick') ? aestheticAnalyses : 0;

  return {
    skiniverAnalyses,
    youcamAnalyses,
    fitzpatrickAnalyses,
    skiniverUnits: skiniverAnalyses * API_UNITS_PER_ANALYSIS.skiniver,
    youcamUnits: youcamAnalyses * API_UNITS_PER_ANALYSIS.youcam,
    fitzpatrickUnits:
      fitzpatrickAnalyses * API_UNITS_PER_ANALYSIS.fitzpatrick,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function lineCost(
  line: PlanApiCostLine | undefined,
  rate: number,
): number {
  if (!line) return 0;
  const units = Number(line.units) || 0;
  const unitPrice = Number(line.unitPrice) || 0;
  if (units <= 0 || unitPrice <= 0 || rate <= 0) return 0;
  return units * unitPrice * rate;
}

/** Tokens COP = Σ (unidades × valor/unidad × TRM). */
export function computeApiTokenCostCop(
  apiCosts: PlanApiCosts | null | undefined,
  rates: Pick<BillingRates, 'usdToCop' | 'eurToCop'>,
): number {
  if (!apiCosts || typeof apiCosts !== 'object') return 0;
  const total =
    lineCost(apiCosts.skiniver, rates.eurToCop) +
    lineCost(apiCosts.youcam, rates.usdToCop) +
    lineCost(apiCosts.fitzpatrick, rates.usdToCop);
  return roundMoney(total);
}

export function parsePlanApiCosts(raw: unknown): PlanApiCosts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const out: PlanApiCosts = {};
  for (const key of ['skiniver', 'youcam', 'fitzpatrick'] as const) {
    const row = src[key];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    out[key] = {
      units: Math.max(0, Number(r.units) || 0),
      unitPrice: Math.max(0, Number(r.unitPrice) || 0),
    };
  }
  return out;
}

export type SaleEconomicsInput = {
  planPrice: number;
  ivaEnabled: boolean;
  ivaPercent: number;
  gatewayFeePercent: number;
  /** Preferido: % sobre neto tras pasarela. */
  operationalCostPercent: number;
  /** Legacy: solo si percent es 0. */
  operationalCostFixed?: number;
  apiTokenCostCop: number;
  alliedCommissionPercent?: number | null;
};

export type SaleEconomicsResult = {
  planBaseAmount: number;
  ivaPercent: number;
  ivaAmount: number;
  grossAmount: number;
  gatewayFeePercent: number;
  gatewayFeeAmount: number;
  netAfterGateway: number;
  operationalCostPercent: number;
  operationalCostAmount: number;
  apiTokenCostAmount: number;
  commissionBaseAmount: number;
  alliedCommissionPercent: number | null;
  alliedCommissionAmount: number;
  platformNetAmount: number;
  isReferredSale: boolean;
};

/**
 * brutoCliente = precio × (1 + IVA%) si IVA activo
 * − wompi% − gastoOp% − tokensCOP = base comisión
 * → aliada % + bolsa
 */
export function computeSaleEconomics(
  input: SaleEconomicsInput,
): SaleEconomicsResult {
  const planBaseAmount = roundMoney(Math.max(0, Number(input.planPrice) || 0));
  const ivaPercent =
    input.ivaEnabled && input.ivaPercent > 0
      ? roundMoney(Number(input.ivaPercent))
      : 0;
  const ivaAmount = roundMoney((planBaseAmount * ivaPercent) / 100);
  const grossAmount = roundMoney(planBaseAmount + ivaAmount);

  const gatewayFeePercent = roundMoney(
    Math.max(0, Number(input.gatewayFeePercent) || 0),
  );
  const gatewayFeeAmount = roundMoney((grossAmount * gatewayFeePercent) / 100);
  const netAfterGateway = roundMoney(Math.max(0, grossAmount - gatewayFeeAmount));

  const opPercent = roundMoney(
    Math.max(0, Number(input.operationalCostPercent) || 0),
  );
  let operationalCostAmount = 0;
  if (opPercent > 0) {
    operationalCostAmount = roundMoney((netAfterGateway * opPercent) / 100);
  } else if ((input.operationalCostFixed ?? 0) > 0) {
    operationalCostAmount = roundMoney(
      Math.min(Number(input.operationalCostFixed), netAfterGateway),
    );
  }

  const apiTokenCostAmount = roundMoney(
    Math.max(0, Number(input.apiTokenCostCop) || 0),
  );

  const afterOp = roundMoney(Math.max(0, netAfterGateway - operationalCostAmount));
  const commissionBaseAmount = roundMoney(
    Math.max(0, afterOp - apiTokenCostAmount),
  );

  const alliedPercent =
    input.alliedCommissionPercent != null &&
    Number(input.alliedCommissionPercent) > 0
      ? roundMoney(Number(input.alliedCommissionPercent))
      : null;
  const isReferredSale = alliedPercent != null;
  const alliedCommissionAmount = isReferredSale
    ? roundMoney((commissionBaseAmount * (alliedPercent as number)) / 100)
    : 0;
  const platformNetAmount = roundMoney(
    commissionBaseAmount - alliedCommissionAmount,
  );

  return {
    planBaseAmount,
    ivaPercent,
    ivaAmount,
    grossAmount,
    gatewayFeePercent,
    gatewayFeeAmount,
    netAfterGateway,
    operationalCostPercent: opPercent,
    operationalCostAmount,
    apiTokenCostAmount,
    commissionBaseAmount,
    alliedCommissionPercent: alliedPercent,
    alliedCommissionAmount,
    platformNetAmount,
    isReferredSale,
  };
}

/** Precio a cobrar al cliente (centavos Wompi = × 100). */
export function computeCheckoutGrossCop(
  planPrice: number,
  ivaEnabled: boolean,
  ivaPercent: number,
): number {
  return computeSaleEconomics({
    planPrice,
    ivaEnabled,
    ivaPercent,
    gatewayFeePercent: 0,
    operationalCostPercent: 0,
    apiTokenCostCop: 0,
  }).grossAmount;
}

/** Precio público del plan (con IVA si aplica). */
export function planCustomerPrice(
  planPrice: number,
  ivaEnabled: boolean,
  ivaPercent: number,
): number {
  return computeCheckoutGrossCop(planPrice, ivaEnabled, ivaPercent);
}

/** Si el UI muestra el bruto con IVA, recupera la base guardada en BD. */
export function stripIvaFromGross(
  grossPrice: number,
  ivaPercent: number,
): number {
  const gross = roundMoney(Math.max(0, Number(grossPrice) || 0));
  const pct = Number(ivaPercent) || 0;
  if (pct <= 0) return gross;
  return roundMoney(gross / (1 + pct / 100));
}
