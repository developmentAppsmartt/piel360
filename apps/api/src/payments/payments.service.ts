import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { GatewayConfig } from '@prisma/client';
import type { JwtPayload } from '../auth/types';
import { isEnterpriseDoctor } from '../doctors/doctor-account.util';
import { EncryptionService } from '../common/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanPoolAvailabilityService } from '../plans/plan-pool-availability.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { CreateCheckoutDto } from './dto/create-checkout.dto';
import type { CreateGatewayConfigDto } from './dto/create-gateway-config.dto';
import type { UpdateGatewayConfigDto } from './dto/update-gateway-config.dto';
import type { WompiWebhookPayload } from './wompi-webhook.types';
import {
  buildWompiIntegritySignature,
  buildWompiWebhookChecksum,
  generateWompiReference,
} from './wompi.util';

const WOMPI_CURRENCY = 'COP';

/** Nunca se devuelven los secretos en claro por API, ni siquiera a un admin. */
function toSafeGatewayConfig(
  config: GatewayConfig,
  options?: { secretsReadable?: boolean },
) {
  const {
    privateKey,
    integritySecret,
    webhookSecret,
    payoutApiKey,
    payoutUserPrincipalId,
    ...rest
  } = config;
  return {
    ...rest,
    hasPrivateKey: Boolean(privateKey),
    hasIntegritySecret: Boolean(integritySecret),
    hasWebhookSecret: Boolean(webhookSecret),
    feePercent: config.feePercent != null ? Number(config.feePercent) : 2.99,
    operationalCostFixed:
      config.operationalCostFixed != null
        ? Number(config.operationalCostFixed)
        : 0,
    hasPayoutApiKey: Boolean(payoutApiKey),
    hasPayoutUserPrincipalId: Boolean(payoutUserPrincipalId),
    payoutAccountId: config.payoutAccountId ?? null,
    payoutsConfigured: Boolean(
      payoutApiKey && payoutUserPrincipalId && config.payoutAccountId,
    ),
    /** false = hay secretos pero ENCRYPTION_KEY no los puede leer. */
    secretsReadable: options?.secretsReadable ?? true,
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly subscriptions: SubscriptionsService,
    private readonly planPool: PlanPoolAvailabilityService,
  ) {}

  async createGatewayConfig(dto: CreateGatewayConfigDto) {
    const config = await this.prisma.gatewayConfig.create({
      data: {
        gatewayName: dto.gatewayName ?? 'wompi',
        environment: dto.environment,
        publicKey: dto.publicKey,
        privateKey: dto.privateKey
          ? this.encryption.encrypt(dto.privateKey)
          : undefined,
        integritySecret: dto.integritySecret
          ? this.encryption.encrypt(dto.integritySecret)
          : undefined,
        webhookSecret: dto.webhookSecret
          ? this.encryption.encrypt(dto.webhookSecret)
          : undefined,
        feePercent: dto.feePercent ?? 2.99,
        operationalCostFixed: dto.operationalCostFixed ?? 0,
        payoutApiKey: dto.payoutApiKey
          ? this.encryption.encrypt(dto.payoutApiKey)
          : undefined,
        payoutUserPrincipalId: dto.payoutUserPrincipalId
          ? this.encryption.encrypt(dto.payoutUserPrincipalId)
          : undefined,
        payoutAccountId: dto.payoutAccountId?.trim() || undefined,
        isActive: dto.isActive ?? true,
      },
    });
    return toSafeGatewayConfig(config, { secretsReadable: true });
  }

  async listGatewayConfigs() {
    const configs = await this.prisma.gatewayConfig.findMany({
      orderBy: { id: 'asc' },
    });
    return configs.map((config) =>
      toSafeGatewayConfig(config, {
        secretsReadable: this.canDecryptGatewaySecrets(config),
      }),
    );
  }

  async updateGatewayConfig(id: string, dto: UpdateGatewayConfigDto) {
    const config = await this.prisma.gatewayConfig.update({
      where: { id: BigInt(id) },
      data: {
        gatewayName: dto.gatewayName,
        environment: dto.environment,
        publicKey: dto.publicKey,
        isActive: dto.isActive,
        privateKey: dto.privateKey
          ? this.encryption.encrypt(dto.privateKey)
          : undefined,
        integritySecret: dto.integritySecret
          ? this.encryption.encrypt(dto.integritySecret)
          : undefined,
        webhookSecret: dto.webhookSecret
          ? this.encryption.encrypt(dto.webhookSecret)
          : undefined,
        feePercent: dto.feePercent,
        operationalCostFixed: dto.operationalCostFixed,
        payoutApiKey: dto.payoutApiKey
          ? this.encryption.encrypt(dto.payoutApiKey)
          : undefined,
        payoutUserPrincipalId: dto.payoutUserPrincipalId
          ? this.encryption.encrypt(dto.payoutUserPrincipalId)
          : undefined,
        payoutAccountId:
          dto.payoutAccountId !== undefined
            ? dto.payoutAccountId.trim() || null
            : undefined,
      },
    });
    return toSafeGatewayConfig(config, {
      secretsReadable: this.canDecryptGatewaySecrets(config),
    });
  }

  /** `POST /payments/wompi/checkout` — MIGRACION.md §2.4/§4 (Subscription.php). */
  async createWompiCheckout(dto: CreateCheckoutDto, currentUser: JwtPayload) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: BigInt(dto.planId) },
    });
    if (!plan || !plan.isActive) {
      throw new BadRequestException('Plan no disponible');
    }

    await this.planPool.assertPlanPurchasable(plan);

    if (currentUser.role === 'doctor') {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: BigInt(currentUser.sub) },
        select: { membershipType: true, empresa: true, empresaReferida: true },
      });
      if (doctor) {
        const expectedPlanType = isEnterpriseDoctor(doctor) ? 'business' : 'individual';
        if (plan.planType !== expectedPlanType) {
          throw new BadRequestException('Este plan no está disponible para tu tipo de cuenta');
        }
      }
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: BigInt(currentUser.sub) },
    });

    const config = await this.getActiveWompiConfig();
    if (!config.integritySecret) {
      throw new BadRequestException(
        'La pasarela Wompi no tiene firma de integridad configurada',
      );
    }

    const reference = generateWompiReference(
      currentUser.role === 'patient' ? 'SUB-PAT' : 'SUB',
    );
    // Siempre entero — corrige el bug del panel doctor de Laravel (no casteaba).
    const amountInCents = Math.round(Number(plan.price) * 100);
    const integrity = buildWompiIntegritySignature(
      reference,
      amountInCents,
      WOMPI_CURRENCY,
      config.integritySecret,
    );

    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'pending',
        wompiTransactionId: reference,
      },
    });

    return {
      publicKey: config.publicKey,
      amount: amountInCents,
      currency: WOMPI_CURRENCY,
      reference,
      integrity,
      customerEmail: user.email,
      customerFullName: `${user.firstName} ${user.lastName}`,
      // El webhook sobreescribe wompiTransactionId con el id real de la
      // transacción al aprobar — por eso el frontend necesita este id propio
      // (estable) para poder hacer polling de GET /me/subscriptions.
      subscriptionId: subscription.id.toString(),
    };
  }

  /** `POST /payments/wompi/webhook` — sin guards, la firma es la autenticación. */
  async handleWompiWebhook(payload: WompiWebhookPayload) {
    if (payload.event !== 'transaction.updated') {
      return { ignored: true };
    }

    const config = await this.getActiveWompiConfig();
    if (!config.webhookSecret) {
      throw new BadRequestException(
        'La pasarela Wompi no tiene webhook secret configurado',
      );
    }

    const { transaction } = payload.data;
    const checksum = buildWompiWebhookChecksum(
      transaction.id,
      transaction.status,
      transaction.amount_in_cents,
      payload.timestamp,
      config.webhookSecret,
    );
    if (checksum !== payload.signature.checksum) {
      throw new ForbiddenException('Firma de webhook inválida');
    }

    await this.subscriptions.activateFromWompi(
      transaction.reference,
      transaction.id,
      transaction.status,
    );
    return { received: true };
  }

  private canDecryptGatewaySecrets(config: GatewayConfig): boolean {
    const secrets = [
      config.privateKey,
      config.integritySecret,
      config.webhookSecret,
      config.payoutApiKey,
      config.payoutUserPrincipalId,
    ].filter((value): value is string => Boolean(value));
    if (secrets.length === 0) return true;
    try {
      for (const secret of secrets) {
        this.encryption.decrypt(secret);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async getActiveWompiConfig() {
    const config = await this.prisma.gatewayConfig.findFirst({
      where: { gatewayName: 'wompi', isActive: true },
    });
    if (!config) {
      throw new BadRequestException(
        'No hay una pasarela Wompi activa configurada',
      );
    }
    try {
      return {
        ...config,
        privateKey: config.privateKey
          ? this.encryption.decrypt(config.privateKey)
          : null,
        integritySecret: config.integritySecret
          ? this.encryption.decrypt(config.integritySecret)
          : null,
        webhookSecret: config.webhookSecret
          ? this.encryption.decrypt(config.webhookSecret)
          : null,
      };
    } catch {
      throw new BadRequestException(
        'Los secretos de Wompi no se pueden leer con la ENCRYPTION_KEY actual. En Admin → Pasarelas, vuelve a pegar private key, integrity secret y webhook secret y guarda.',
      );
    }
  }
}
