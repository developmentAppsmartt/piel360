import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../common/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  copToWompiCents,
  WompiPayoutsClient,
  type WompiPayoutCredentials,
} from './wompi-payouts.client';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeLegalIdType(value: string | null | undefined): string {
  const v = (value ?? 'NIT').trim().toUpperCase();
  if (v === 'CC' || v === 'NIT' || v === 'CE') return v;
  if (v === 'CEDULA' || v === 'CÉDULA') return 'CC';
  return 'NIT';
}

export type RecordSubscriptionSaleInput = {
  subscriptionId: bigint;
  userId: bigint;
  planId: bigint;
  planPrice: Prisma.Decimal | number;
  wompiTransactionId: string | null;
  /** % fee de la pasarela; si null se lee de GatewayConfig activa. */
  gatewayFeePercent?: number | null;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Crea factura interna al activar una suscripción pagada.
   * Fórmula: bruto − fee pasarela − gastos operativos = base;
   * si hay referido aliado, comisión = base × % aliado; resto → plataforma.
   */
  async recordSubscriptionSale(input: RecordSubscriptionSaleInput) {
    const existing = await this.prisma.subscriptionInvoice.findUnique({
      where: { subscriptionId: input.subscriptionId },
    });
    if (existing) return existing;

    const gross = roundMoney(Number(input.planPrice));
    const gateway = await this.prisma.gatewayConfig.findFirst({
      where: { isActive: true },
      orderBy: { id: 'desc' },
    });

    let feePercent = input.gatewayFeePercent;
    if (feePercent == null) {
      feePercent = gateway?.feePercent != null ? Number(gateway.feePercent) : 2.99;
    }
    feePercent = roundMoney(Number(feePercent));

    const gatewayFeeAmount = roundMoney((gross * feePercent) / 100);
    const netAfterGateway = roundMoney(gross - gatewayFeeAmount);

    const operationalCostConfigured = roundMoney(
      gateway?.operationalCostFixed != null
        ? Number(gateway.operationalCostFixed)
        : 0,
    );
    const operationalCostAmount = roundMoney(
      Math.min(Math.max(0, operationalCostConfigured), Math.max(0, netAfterGateway)),
    );
    const commissionBaseAmount = roundMoney(
      Math.max(0, netAfterGateway - operationalCostAmount),
    );

    const referral = await this.prisma.referral.findFirst({
      where: {
        referredUserId: input.userId,
        organization: { type: 'empresa_aliada' },
      },
      include: {
        organization: {
          select: {
            id: true,
            referralCommissionPercent: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const org = referral?.organization ?? null;
    const alliedPercent =
      org?.referralCommissionPercent != null
        ? Number(org.referralCommissionPercent)
        : null;
    const isReferredSale = Boolean(org && alliedPercent != null && alliedPercent > 0);
    const alliedCommissionAmount = isReferredSale
      ? roundMoney((commissionBaseAmount * (alliedPercent as number)) / 100)
      : 0;
    const platformNetAmount = roundMoney(
      commissionBaseAmount - alliedCommissionAmount,
    );

    return this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: input.subscriptionId,
        userId: input.userId,
        planId: input.planId,
        organizationId: isReferredSale ? org!.id : null,
        grossAmount: new Prisma.Decimal(gross),
        gatewayFeePercent: new Prisma.Decimal(feePercent),
        gatewayFeeAmount: new Prisma.Decimal(gatewayFeeAmount),
        netAfterGateway: new Prisma.Decimal(netAfterGateway),
        operationalCostAmount: new Prisma.Decimal(operationalCostAmount),
        commissionBaseAmount: new Prisma.Decimal(commissionBaseAmount),
        isReferredSale,
        alliedCommissionPercent: isReferredSale
          ? new Prisma.Decimal(alliedPercent as number)
          : null,
        alliedCommissionAmount: new Prisma.Decimal(alliedCommissionAmount),
        platformNetAmount: new Prisma.Decimal(platformNetAmount),
        currency: 'COP',
        wompiTransactionId: input.wompiTransactionId,
        alliedPayoutStatus: isReferredSale ? 'pending' : 'none',
      },
    });
  }

  async getAdminDashboard() {
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      include: {
        plan: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        subscription: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const money = (v: Prisma.Decimal | number) => Number(v);

    let grossTotal = 0;
    let gatewayFeesTotal = 0;
    let platformNetTotal = 0;
    let alliedCommissionsTotal = 0;
    let alliedPendingTotal = 0;
    let alliedDispersedTotal = 0;
    let referredSalesCount = 0;
    let commonSalesCount = 0;

    const byPlan = new Map<
      string,
      {
        planId: string;
        planName: string;
        salesCount: number;
        grossTotal: number;
        platformNetTotal: number;
        alliedCommissionTotal: number;
        referredSalesCount: number;
      }
    >();

    for (const inv of invoices) {
      const gross = money(inv.grossAmount);
      const fee = money(inv.gatewayFeeAmount);
      const platform = money(inv.platformNetAmount);
      const allied = money(inv.alliedCommissionAmount);

      grossTotal += gross;
      gatewayFeesTotal += fee;
      platformNetTotal += platform;
      alliedCommissionsTotal += allied;
      if (inv.alliedPayoutStatus === 'pending') alliedPendingTotal += allied;
      if (inv.alliedPayoutStatus === 'dispersed') alliedDispersedTotal += allied;
      if (inv.isReferredSale) referredSalesCount += 1;
      else commonSalesCount += 1;

      const planKey = inv.planId.toString();
      const current = byPlan.get(planKey) ?? {
        planId: planKey,
        planName: inv.plan.name,
        salesCount: 0,
        grossTotal: 0,
        platformNetTotal: 0,
        alliedCommissionTotal: 0,
        referredSalesCount: 0,
      };
      current.salesCount += 1;
      current.grossTotal += gross;
      current.platformNetTotal += platform;
      current.alliedCommissionTotal += allied;
      if (inv.isReferredSale) current.referredSalesCount += 1;
      byPlan.set(planKey, current);
    }

    return {
      metrics: {
        invoiceCount: invoices.length,
        grossTotal: roundMoney(grossTotal),
        gatewayFeesTotal: roundMoney(gatewayFeesTotal),
        platformNetTotal: roundMoney(platformNetTotal),
        alliedCommissionsTotal: roundMoney(alliedCommissionsTotal),
        alliedPendingTotal: roundMoney(alliedPendingTotal),
        alliedDispersedTotal: roundMoney(alliedDispersedTotal),
        referredSalesCount,
        commonSalesCount,
      },
      byPlan: [...byPlan.values()].map((row) => ({
        ...row,
        grossTotal: roundMoney(row.grossTotal),
        platformNetTotal: roundMoney(row.platformNetTotal),
        alliedCommissionTotal: roundMoney(row.alliedCommissionTotal),
      })),
      invoices: invoices.map((inv) => this.serializeInvoice(inv)),
    };
  }

  async listInvoices() {
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      include: {
        plan: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        subscription: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map((inv) => this.serializeInvoice(inv));
  }

  async getAlliedBalances() {
    const orgs = await this.prisma.organization.findMany({
      where: { type: 'empresa_aliada' },
      orderBy: { name: 'asc' },
    });

    const pending = await this.prisma.subscriptionInvoice.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { not: null },
        alliedPayoutStatus: { in: ['pending', 'processing'] },
      },
      _sum: { alliedCommissionAmount: true },
      _count: { id: true },
    });
    const dispersed = await this.prisma.subscriptionInvoice.groupBy({
      by: ['organizationId'],
      where: {
        organizationId: { not: null },
        alliedPayoutStatus: 'dispersed',
      },
      _sum: { alliedCommissionAmount: true },
      _count: { id: true },
    });

    const pendingMap = new Map(
      pending.map((p) => [
        p.organizationId!.toString(),
        {
          amount: Number(p._sum.alliedCommissionAmount ?? 0),
          count: p._count.id,
        },
      ]),
    );
    const dispersedMap = new Map(
      dispersed.map((p) => [
        p.organizationId!.toString(),
        {
          amount: Number(p._sum.alliedCommissionAmount ?? 0),
          count: p._count.id,
        },
      ]),
    );

    return orgs.map((org) => {
      const id = org.id.toString();
      const pend = pendingMap.get(id) ?? { amount: 0, count: 0 };
      const disp = dispersedMap.get(id) ?? { amount: 0, count: 0 };
      return {
        id,
        name: org.name,
        bankName: org.bankName,
        bankId: org.bankId,
        bankAccountType: org.bankAccountType,
        bankAccountNumber: org.bankAccountNumber,
        referralCommissionPercent:
          org.referralCommissionPercent != null
            ? Number(org.referralCommissionPercent)
            : null,
        earnedPending: roundMoney(pend.amount),
        earnedDispersed: roundMoney(disp.amount),
        earnedTotal: roundMoney(pend.amount + disp.amount),
        pendingInvoiceCount: pend.count,
        dispersedInvoiceCount: disp.count,
        canDisperse: this.orgReadyForPayout(org) && pend.count > 0,
        payoutReady: this.orgReadyForPayout(org),
      };
    });
  }

  async listWompiPayoutBanks() {
    const client = await this.getPayoutsClient();
    return client.listBanks();
  }

  /** Igual que listWompiPayoutBanks pero sin lanzar si payouts no está configurado. */
  async listWompiPayoutBanksSafe() {
    try {
      return await this.listWompiPayoutBanks();
    } catch (err) {
      this.logger.warn(
        `Catálogo Wompi banks no disponible: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
    }
  }

  async disperseAlliedCommissions(
    organizationId: string,
    adminUserId: string | null,
    triggeredBy: 'manual' | 'cron' = 'manual',
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: BigInt(organizationId) },
      include: {
        owner: { select: { email: true, name: true } },
      },
    });
    if (!org || org.type !== 'empresa_aliada') {
      throw new NotFoundException('Empresa aliada no encontrada');
    }
    this.assertOrgReadyForPayout(org);

    const pending = await this.prisma.subscriptionInvoice.findMany({
      where: {
        organizationId: org.id,
        alliedPayoutStatus: 'pending',
      },
    });
    if (pending.length === 0) {
      return {
        organizationId: org.id.toString(),
        dispersedCount: 0,
        dispersedAmount: 0,
        status: 'noop',
        bankName: org.bankName,
        bankAccountNumber: org.bankAccountNumber,
      };
    }

    const amount = roundMoney(
      pending.reduce((sum, inv) => sum + Number(inv.alliedCommissionAmount), 0),
    );
    if (amount <= 0) {
      throw new BadRequestException('El monto a dispersar debe ser mayor a 0');
    }

    const reference = `ALI-${org.id}-${Date.now()}`;
    const beneficiaryName = org.payoutBeneficiaryName!.trim();
    const beneficiaryEmail = org.payoutBeneficiaryEmail!.trim();
    const legalIdType = normalizeLegalIdType(org.payoutLegalIdType);
    const legalId = (org.payoutLegalId ?? '').replace(/\D/g, '');
    if (!legalId) {
      throw new BadRequestException(
        'La empresa aliada necesita documento del beneficiario (NIT/CC) en la cuenta de dispersión.',
      );
    }

    const batch = await this.prisma.alliedPayoutBatch.create({
      data: {
        organizationId: org.id,
        reference,
        status: 'submitted',
        totalAmount: new Prisma.Decimal(amount),
        triggeredBy,
        adminUserId: adminUserId ? BigInt(adminUserId) : null,
      },
    });

    await this.prisma.subscriptionInvoice.updateMany({
      where: { id: { in: pending.map((p) => p.id) } },
      data: {
        alliedPayoutStatus: 'processing',
        alliedPayoutBatchId: batch.id,
      },
    });

    try {
      const client = await this.getPayoutsClient();
      const accountType =
        org.bankAccountType === 'CORRIENTE' ? 'CORRIENTE' : 'AHORROS';
      const wompi = await client.createPayoutBatch({
        reference,
        paymentType: 'PROVIDERS',
        transactionStatus:
          (await this.getActiveGatewayEnvironment()) === 'sandbox'
            ? 'APPROVED'
            : undefined,
        transactions: [
          {
            legalIdType,
            legalId,
            bankId: org.bankId!,
            accountType,
            accountNumber: org.bankAccountNumber!.replace(/\D/g, ''),
            name: beneficiaryName,
            email: beneficiaryEmail,
            amount: copToWompiCents(amount),
            reference: `${reference}-TX`,
          },
        ],
      });

      const wompiStatus = (wompi.status ?? 'PENDING').toUpperCase();
      const finalized = this.mapWompiBatchStatus(wompiStatus);

      await this.prisma.alliedPayoutBatch.update({
        where: { id: batch.id },
        data: {
          wompiPayoutId: wompi.id ?? null,
          status: finalized.batchStatus,
        },
      });

      if (finalized.invoiceStatus === 'dispersed') {
        const now = new Date();
        await this.prisma.subscriptionInvoice.updateMany({
          where: { alliedPayoutBatchId: batch.id },
          data: {
            alliedPayoutStatus: 'dispersed',
            alliedDispersedAt: now,
            alliedDispersedByUserId: adminUserId
              ? BigInt(adminUserId)
              : null,
          },
        });
      } else if (finalized.invoiceStatus === 'pending') {
        await this.prisma.subscriptionInvoice.updateMany({
          where: { alliedPayoutBatchId: batch.id },
          data: {
            alliedPayoutStatus: 'pending',
            alliedPayoutBatchId: null,
          },
        });
      }

      this.logger.log(
        `Dispersión Wompi org=${org.id} batch=${batch.id} status=${finalized.batchStatus} amount=${amount}`,
      );

      return {
        organizationId: org.id.toString(),
        organizationName: org.name,
        batchId: batch.id.toString(),
        wompiPayoutId: wompi.id ?? null,
        reference,
        dispersedCount: pending.length,
        dispersedAmount: amount,
        status: finalized.batchStatus,
        bankName: org.bankName,
        bankAccountNumber: org.bankAccountNumber,
        dispersedAt:
          finalized.invoiceStatus === 'dispersed'
            ? new Date().toISOString()
            : null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.alliedPayoutBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: message.slice(0, 2000) },
      });
      await this.prisma.subscriptionInvoice.updateMany({
        where: { alliedPayoutBatchId: batch.id },
        data: {
          alliedPayoutStatus: 'pending',
          alliedPayoutBatchId: null,
        },
      });
      this.logger.error(`Fallo dispersión Wompi org=${org.id}: ${message}`);
      throw new BadRequestException(
        `No se pudo crear el lote de pago en Wompi: ${message}`,
      );
    }
  }

  /** Cron / disperse-all: un solo lote Wompi con N transacciones (una por aliada). */
  async disperseAllPendingCommissions(
    triggeredBy: 'cron' | 'manual' = 'cron',
    adminUserId: string | null = null,
  ) {
    const orgs = await this.prisma.organization.findMany({
      where: { type: 'empresa_aliada' },
      include: {
        owner: { select: { email: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });

    type ReadyOrg = {
      org: (typeof orgs)[number];
      pending: Array<{ id: bigint; alliedCommissionAmount: Prisma.Decimal }>;
      amount: number;
      legalId: string;
      legalIdType: string;
      beneficiaryName: string;
      beneficiaryEmail: string;
    };

    const ready: ReadyOrg[] = [];
    const skipped: Array<Record<string, unknown>> = [];

    for (const org of orgs) {
      if (!this.orgReadyForPayout(org)) {
        const pendingCount = await this.prisma.subscriptionInvoice.count({
          where: { organizationId: org.id, alliedPayoutStatus: 'pending' },
        });
        if (pendingCount > 0) {
          skipped.push({
            organizationId: org.id.toString(),
            name: org.name,
            reason: 'datos_bancarios_incompletos',
            pendingInvoiceCount: pendingCount,
          });
        }
        continue;
      }

      const legalId = (org.payoutLegalId ?? '').replace(/\D/g, '');
      if (!legalId) {
        skipped.push({
          organizationId: org.id.toString(),
          name: org.name,
          reason: 'sin_documento_beneficiario',
        });
        continue;
      }

      const pending = await this.prisma.subscriptionInvoice.findMany({
        where: { organizationId: org.id, alliedPayoutStatus: 'pending' },
      });
      if (pending.length === 0) continue;

      const amount = roundMoney(
        pending.reduce((sum, inv) => sum + Number(inv.alliedCommissionAmount), 0),
      );
      if (amount <= 0) continue;

      ready.push({
        org,
        pending,
        amount,
        legalId,
        legalIdType: normalizeLegalIdType(org.payoutLegalIdType),
        beneficiaryName: org.payoutBeneficiaryName!.trim(),
        beneficiaryEmail: org.payoutBeneficiaryEmail!.trim(),
      });
    }

    if (ready.length === 0) {
      return {
        processed: 0,
        beneficiaryCount: 0,
        totalAmount: 0,
        wompiPayoutId: null,
        reference: null,
        results: [],
        skipped,
      };
    }

    const reference = `ALI-MULTI-${Date.now()}`;
    const totalAmount = roundMoney(
      ready.reduce((sum, row) => sum + row.amount, 0),
    );

    const localBatches: Array<{
      batchId: bigint;
      organizationId: bigint;
      invoiceIds: bigint[];
      amount: number;
    }> = [];

    for (const row of ready) {
      const batch = await this.prisma.alliedPayoutBatch.create({
        data: {
          organizationId: row.org.id,
          reference: `${reference}-ORG${row.org.id}`,
          status: 'submitted',
          totalAmount: new Prisma.Decimal(row.amount),
          triggeredBy,
          adminUserId: adminUserId ? BigInt(adminUserId) : null,
        },
      });
      await this.prisma.subscriptionInvoice.updateMany({
        where: { id: { in: row.pending.map((p) => p.id) } },
        data: {
          alliedPayoutStatus: 'processing',
          alliedPayoutBatchId: batch.id,
        },
      });
      localBatches.push({
        batchId: batch.id,
        organizationId: row.org.id,
        invoiceIds: row.pending.map((p) => p.id),
        amount: row.amount,
      });
    }

    try {
      const client = await this.getPayoutsClient();
      const wompi = await client.createPayoutBatch({
        reference,
        paymentType: 'PROVIDERS',
        transactionStatus:
          (await this.getActiveGatewayEnvironment()) === 'sandbox'
            ? 'APPROVED'
            : undefined,
        transactions: ready.map((row, index) => ({
          legalIdType: row.legalIdType,
          legalId: row.legalId,
          bankId: row.org.bankId!,
          accountType:
            row.org.bankAccountType === 'CORRIENTE' ? 'CORRIENTE' : 'AHORROS',
          accountNumber: row.org.bankAccountNumber!.replace(/\D/g, ''),
          name: row.beneficiaryName,
          email: row.beneficiaryEmail,
          amount: copToWompiCents(row.amount),
          reference: `${reference}-TX${index + 1}-ORG${row.org.id}`,
        })),
      });

      const wompiStatus = (wompi.status ?? 'PENDING').toUpperCase();
      const finalized = this.mapWompiBatchStatus(wompiStatus);
      const now = new Date();

      for (const local of localBatches) {
        await this.prisma.alliedPayoutBatch.update({
          where: { id: local.batchId },
          data: {
            wompiPayoutId: wompi.id ?? null,
            status: finalized.batchStatus,
          },
        });

        if (finalized.invoiceStatus === 'dispersed') {
          await this.prisma.subscriptionInvoice.updateMany({
            where: { alliedPayoutBatchId: local.batchId },
            data: {
              alliedPayoutStatus: 'dispersed',
              alliedDispersedAt: now,
              alliedDispersedByUserId: adminUserId
                ? BigInt(adminUserId)
                : null,
            },
          });
        } else if (finalized.invoiceStatus === 'pending') {
          await this.prisma.subscriptionInvoice.updateMany({
            where: { alliedPayoutBatchId: local.batchId },
            data: {
              alliedPayoutStatus: 'pending',
              alliedPayoutBatchId: null,
            },
          });
        }
      }

      this.logger.log(
        `Dispersión multi Wompi: ${ready.length} aliadas, COP ${totalAmount}, status=${finalized.batchStatus}, payout=${wompi.id ?? 'n/a'}`,
      );

      return {
        processed: ready.length,
        beneficiaryCount: ready.length,
        totalAmount,
        wompiPayoutId: wompi.id ?? null,
        reference,
        status: finalized.batchStatus,
        results: ready.map((row, i) => ({
          organizationId: row.org.id.toString(),
          organizationName: row.org.name,
          batchId: localBatches[i]!.batchId.toString(),
          dispersedCount: row.pending.length,
          dispersedAmount: row.amount,
          bankName: row.org.bankName,
          bankAccountNumber: row.org.bankAccountNumber,
        })),
        skipped,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const local of localBatches) {
        await this.prisma.alliedPayoutBatch.update({
          where: { id: local.batchId },
          data: { status: 'failed', errorMessage: message.slice(0, 2000) },
        });
        await this.prisma.subscriptionInvoice.updateMany({
          where: { alliedPayoutBatchId: local.batchId },
          data: {
            alliedPayoutStatus: 'pending',
            alliedPayoutBatchId: null,
          },
        });
      }
      this.logger.error(`Fallo dispersión multi Wompi: ${message}`);
      throw new BadRequestException(
        `No se pudo crear el lote multi-beneficiario en Wompi: ${message}`,
      );
    }
  }

  /** Reconcilia lotes en processing consultando Wompi. */
  async reconcileProcessingPayouts() {
    const batches = await this.prisma.alliedPayoutBatch.findMany({
      where: {
        status: { in: ['submitted', 'processing', 'PENDING', 'PENDING_APPROVAL'] },
        wompiPayoutId: { not: null },
      },
      take: 50,
      orderBy: { id: 'asc' },
    });
    if (batches.length === 0) return { updated: 0 };

    let client: WompiPayoutsClient;
    try {
      client = await this.getPayoutsClient();
    } catch {
      return { updated: 0, skipped: 'payouts_not_configured' };
    }

    let updated = 0;
    for (const batch of batches) {
      try {
        const remote = await client.getPayoutBatch(batch.wompiPayoutId!);
        const mapped = this.mapWompiBatchStatus(
          (remote.status ?? batch.status).toUpperCase(),
        );
        if (mapped.batchStatus === batch.status) continue;

        await this.prisma.alliedPayoutBatch.update({
          where: { id: batch.id },
          data: { status: mapped.batchStatus },
        });

        if (mapped.invoiceStatus === 'dispersed') {
          await this.prisma.subscriptionInvoice.updateMany({
            where: {
              alliedPayoutBatchId: batch.id,
              alliedPayoutStatus: 'processing',
            },
            data: {
              alliedPayoutStatus: 'dispersed',
              alliedDispersedAt: new Date(),
            },
          });
        } else if (mapped.invoiceStatus === 'pending') {
          await this.prisma.subscriptionInvoice.updateMany({
            where: {
              alliedPayoutBatchId: batch.id,
              alliedPayoutStatus: 'processing',
            },
            data: {
              alliedPayoutStatus: 'pending',
              alliedPayoutBatchId: null,
            },
          });
        }
        updated += 1;
      } catch (err) {
        this.logger.warn(
          `No se pudo reconciliar batch ${batch.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { updated };
  }

  private orgReadyForPayout(org: {
    bankId: string | null;
    bankAccountNumber: string | null;
    bankAccountType: string | null;
    payoutBeneficiaryName: string | null;
    payoutBeneficiaryEmail: string | null;
    payoutLegalId: string | null;
  }) {
    return Boolean(
      org.bankId?.trim() &&
        org.bankAccountNumber?.trim() &&
        org.bankAccountType?.trim() &&
        org.payoutBeneficiaryName?.trim() &&
        org.payoutBeneficiaryEmail?.trim() &&
        org.payoutLegalId?.trim(),
    );
  }

  private assertOrgReadyForPayout(org: {
    bankId: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountType: string | null;
    payoutBeneficiaryName: string | null;
    payoutBeneficiaryEmail: string | null;
    payoutLegalId: string | null;
  }) {
    if (!this.orgReadyForPayout(org)) {
      throw new BadRequestException(
        'Configura beneficiario (nombre, email, documento), banco Wompi, tipo y número de cuenta antes de dispersar.',
      );
    }
  }

  private mapWompiBatchStatus(status: string): {
    batchStatus: string;
    invoiceStatus: 'processing' | 'dispersed' | 'pending';
  } {
    const s = status.toUpperCase();
    if (s === 'TOTAL_PAYMENT' || s === 'APPROVED') {
      return { batchStatus: 'total_payment', invoiceStatus: 'dispersed' };
    }
    if (
      s === 'REJECTED' ||
      s === 'NOT_APPROVED' ||
      s === 'FAILED' ||
      s === 'CANCELLED' ||
      s === 'PARTIAL_PAYMENT'
    ) {
      return { batchStatus: s.toLowerCase(), invoiceStatus: 'pending' };
    }
    return { batchStatus: 'processing', invoiceStatus: 'processing' };
  }

  private async getActiveGatewayEnvironment(): Promise<'sandbox' | 'production'> {
    const gateway = await this.prisma.gatewayConfig.findFirst({
      where: { isActive: true },
      orderBy: { id: 'desc' },
    });
    return gateway?.environment === 'production' ? 'production' : 'sandbox';
  }

  private async getPayoutCredentials(): Promise<WompiPayoutCredentials> {
    const gateway = await this.prisma.gatewayConfig.findFirst({
      where: { isActive: true },
      orderBy: { id: 'desc' },
    });
    if (!gateway) {
      throw new BadRequestException(
        'No hay pasarela Wompi activa. Configúrala en Admin → Pasarelas.',
      );
    }
    if (
      !gateway.payoutApiKey ||
      !gateway.payoutUserPrincipalId ||
      !gateway.payoutAccountId
    ) {
      throw new BadRequestException(
        'Faltan credenciales de Pagos a Terceros (API key, user principal id y accountId) en la pasarela activa.',
      );
    }
    try {
      return {
        apiKey: this.encryption.decrypt(gateway.payoutApiKey),
        userPrincipalId: this.encryption.decrypt(gateway.payoutUserPrincipalId),
        accountId: gateway.payoutAccountId,
        environment:
          gateway.environment === 'production' ? 'production' : 'sandbox',
      };
    } catch {
      throw new BadRequestException(
        'No se pudieron leer las credenciales de Pagos a Terceros. Vuelve a guardarlas en Pasarelas.',
      );
    }
  }

  private async getPayoutsClient() {
    return new WompiPayoutsClient(await this.getPayoutCredentials());
  }

  private serializeInvoice(
    inv: Prisma.SubscriptionInvoiceGetPayload<{
      include: {
        plan: { select: { id: true; name: true } };
        user: { select: { id: true; name: true; email: true } };
        organization: { select: { id: true; name: true } };
        subscription: { select: { id: true; status: true } };
      };
    }>,
  ) {
    return {
      id: inv.id.toString(),
      subscriptionId: inv.subscriptionId.toString(),
      subscriptionStatus: inv.subscription.status,
      user: {
        id: inv.user.id.toString(),
        name: inv.user.name,
        email: inv.user.email,
      },
      plan: {
        id: inv.plan.id.toString(),
        name: inv.plan.name,
      },
      organization: inv.organization
        ? {
            id: inv.organization.id.toString(),
            name: inv.organization.name,
          }
        : null,
      grossAmount: Number(inv.grossAmount),
      gatewayFeePercent: Number(inv.gatewayFeePercent),
      gatewayFeeAmount: Number(inv.gatewayFeeAmount),
      netAfterGateway: Number(inv.netAfterGateway),
      operationalCostAmount: Number(inv.operationalCostAmount),
      commissionBaseAmount: Number(inv.commissionBaseAmount),
      isReferredSale: inv.isReferredSale,
      alliedCommissionPercent:
        inv.alliedCommissionPercent != null
          ? Number(inv.alliedCommissionPercent)
          : null,
      alliedCommissionAmount: Number(inv.alliedCommissionAmount),
      platformNetAmount: Number(inv.platformNetAmount),
      currency: inv.currency,
      wompiTransactionId: inv.wompiTransactionId,
      alliedPayoutStatus: inv.alliedPayoutStatus as
        | 'none'
        | 'pending'
        | 'dispersed',
      alliedDispersedAt: inv.alliedDispersedAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    };
  }
}
