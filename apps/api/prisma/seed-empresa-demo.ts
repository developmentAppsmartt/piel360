/**
 * Cuenta de empresa de DEMO para la base local: dueño + 2 miembros con
 * permisos distintos, 4 planes adquiridos (uno por cada estado del hub de
 * facturación), pacientes y análisis que ya consumieron créditos.
 *
 * Existe para poder probar a mano lo que depende de un equipo —alcance de
 * pacientes y reportes, desglose del consumo por profesional, permisos de
 * miembro— sin tener que montarlo cada vez.
 *
 * Uso (desde apps/api/):
 *   pnpm run seed:empresa-demo          crea (borra y recrea: es idempotente)
 *   pnpm run seed:empresa-demo -- clean borra
 *
 * SOLO para la base local. Las credenciales están en el README a propósito.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  DEFAULT_TEAM_MEMBER_PERMISSIONS,
  type TeamMemberPermission,
} from '@piel360/shared';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASS = 'Piel360Demo!2026';
const ORG = 'Dermacenter Demo S.A.S.';
const CUENTAS = {
  dueno: 'empresa.demo@piel360.local',
  ana: 'ana.gomez@piel360.local',
  luis: 'luis.perez@piel360.local',
};
/** Luis no lleva `billing`: sirve para comprobar que no ve Consumo ni Facturación. */
const LIMITADOS: TeamMemberPermission[] = ['patients', 'analyses', 'reports'];

const hoy = new Date();
const diasAtras = (n: number) => new Date(hoy.getTime() - n * 86_400_000);
const diasAdelante = (n: number) => new Date(hoy.getTime() + n * 86_400_000);

/** Respuesta de Skiniver con la forma real: `class_raw` es la identidad del
 * diagnóstico y `desease` su categoría — de ahí sale la clase del reporte. */
const prediccion = (
  clase: string,
  classRaw: string,
  desease: string,
  icd: string,
) => ({
  class: clase,
  class_raw: classRaw,
  desease,
  prob: 0.86,
  risk: 'medium',
  high_risk_prob: 0.28,
  lesion_code: icd,
  topn: [
    {
      class: clase,
      class_raw: classRaw,
      desease,
      prob: 0.86,
      risk: 'medium',
      risk_level: 'medium',
      description:
        'Evaluación de riesgos: lesión con bordes definidos, sin signos de alarma. ' +
        'Diagnóstico preciso: después de la dermatoscopia. ' +
        'Tratamiento: tópico según criterio clínico. ' +
        'Consejo: control en 3 meses y fotoprotección diaria.',
    },
    {
      class: 'Nevus benigno',
      class_raw: '1B_benign_nevus',
      desease: 'Lesiones benignas',
      prob: 0.08,
      risk: 'low',
      risk_level: 'low',
      description:
        'Evaluación de riesgos: lesión benigna. Diagnóstico preciso: clínico. ' +
        'Tratamiento: ninguno. Consejo: vigilar cambios de forma o color.',
    },
  ],
});

async function borrar() {
  // La organización cuelga del dueño por cascada, pero se borra primero para
  // que no quede huérfana si cambia el owner.
  await prisma.organization.deleteMany({ where: { name: ORG } });
  await prisma.user.deleteMany({
    where: { email: { in: Object.values(CUENTAS) } },
  });
}

async function crearProfesional(
  email: string,
  nombre: string,
  apellido: string,
  rol: string,
  membership: string,
) {
  const user = await prisma.user.create({
    data: {
      email,
      password: await argon2.hash(PASS),
      name: `${nombre} ${apellido}`,
      firstName: nombre,
      lastName: apellido,
      phone: '+573001112233',
      emailVerifiedAt: diasAtras(120),
      createdAt: diasAtras(120),
      roles: { connect: [{ name: rol }] },
      doctor: {
        create: {
          firstName: nombre,
          lastName: apellido,
          specialty: 'Dermatología',
          professionalKind: 'specialty',
          membershipType: membership,
          empresa: membership !== 'solo_doctor',
          verificationStatus: 'active',
          city: 'Bogotá',
          department: 'Cundinamarca',
          country: 'Colombia',
          address: 'Calle 100 # 15-20',
          createdAt: diasAtras(120),
        },
      },
    },
    include: { doctor: { select: { id: true } } },
  });
  return { userId: user.id, doctorId: user.doctor!.id, email };
}

async function main() {
  if (process.argv.includes('clean')) {
    await borrar();
    const usuarios = await prisma.user.count({
      where: { email: { in: Object.values(CUENTAS) } },
    });
    const orgs = await prisma.organization.count({ where: { name: ORG } });
    console.log(JSON.stringify({ usuarios, orgs }));
    console.log(usuarios + orgs === 0 ? 'LIMPIEZA OK' : 'QUEDARON FILAS');
    process.exitCode = usuarios + orgs === 0 ? 0 : 1;
    return;
  }

  await borrar();

  const dueno = await crearProfesional(
    CUENTAS.dueno, 'Dermacenter', 'Demo', 'empresa', 'empresa',
  );
  const ana = await crearProfesional(
    CUENTAS.ana, 'Ana', 'Gómez', 'dermatologo', 'solo_doctor',
  );
  const luis = await crearProfesional(
    CUENTAS.luis, 'Luis', 'Pérez', 'dermatologo', 'solo_doctor',
  );

  const org = await prisma.organization.create({
    data: {
      type: 'empresa',
      name: ORG,
      ownerUserId: dueno.userId,
      seatPlan: 'five',
      seatLimit: 5,
      status: 'active',
      businessEmail: CUENTAS.dueno,
      businessPhone: '+573001112233',
      city: 'Bogotá',
      department: 'Cundinamarca',
      country: 'Colombia',
      address: 'Calle 100 # 15-20',
      legalRepName: 'Dermacenter Demo',
      createdAt: diasAtras(120),
      members: {
        create: [
          { userId: dueno.userId, memberRole: 'owner', permissions: [] },
          {
            userId: ana.userId,
            memberRole: 'member',
            permissions: [
              ...DEFAULT_TEAM_MEMBER_PERMISSIONS,
            ] as unknown as Prisma.InputJsonValue,
          },
          {
            userId: luis.userId,
            memberRole: 'member',
            permissions: LIMITADOS as unknown as Prisma.InputJsonValue,
          },
        ],
      },
    },
  });

  // ---- Planes adquiridos: uno por cada estado del hub de facturación ----
  const planes = await prisma.plan.findMany({ orderBy: { id: 'asc' } });
  const plan = (nombre: string) =>
    planes.find((p) => p.name === nombre) ?? planes[0];
  if (!plan('')) throw new Error('No hay planes: corre `prisma db seed` antes.');

  const crearSuscripcion = async (opts: {
    planId: bigint;
    precio: Prisma.Decimal;
    status: 'active' | 'cancelled' | 'pending';
    endsAt: Date | null;
    diasCompra: number;
    conFactura: boolean;
  }) => {
    const sub = await prisma.subscription.create({
      data: {
        userId: dueno.userId,
        planId: opts.planId,
        status: opts.status,
        endsAt: opts.endsAt,
        wompiTransactionId:
          opts.status === 'pending'
            ? null
            : `demo-wompi-${opts.planId}-${opts.status}`,
        createdAt: diasAtras(opts.diasCompra),
      },
    });
    if (opts.conFactura) {
      const bruto = Number(opts.precio) || 100_000;
      const base = Math.round(bruto / 1.19);
      const comision = Math.round(bruto * 0.0265);
      await prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: sub.id,
          userId: dueno.userId,
          planId: opts.planId,
          organizationId: org.id,
          planBaseAmount: base,
          ivaPercent: 19,
          ivaAmount: bruto - base,
          grossAmount: bruto,
          gatewayFeePercent: 2.65,
          gatewayFeeAmount: comision,
          netAfterGateway: bruto - comision,
          commissionBaseAmount: base,
          platformNetAmount: bruto - comision,
          currency: 'COP',
          wompiTransactionId: `demo-wompi-${opts.planId}-${opts.status}`,
          createdAt: diasAtras(opts.diasCompra),
        },
      });
    }
    return sub.id;
  };

  const planDerm = plan('Skiniver Básico');
  const planEstetico = plan('YouCam Básico');
  const planFototipo = plan('Fototipo Básico');

  const subActiva = await crearSuscripcion({
    planId: planDerm.id, precio: planDerm.price, status: 'active',
    endsAt: diasAdelante(20), diasCompra: 10, conFactura: true,
  });
  const subConsumida = await crearSuscripcion({
    planId: planEstetico.id, precio: planEstetico.price, status: 'active',
    endsAt: diasAdelante(15), diasCompra: 15, conFactura: true,
  });
  await crearSuscripcion({
    planId: planFototipo.id, precio: planFototipo.price, status: 'cancelled',
    endsAt: diasAtras(5), diasCompra: 40, conFactura: true,
  });
  await crearSuscripcion({
    planId: planDerm.id, precio: planDerm.price, status: 'pending',
    endsAt: null, diasCompra: 1, conFactura: false,
  });

  // ---- Pacientes ----
  const crearPaciente = (
    doctorId: bigint,
    nombre: string,
    apellido: string,
    gender: string,
    birthDate: string,
    fitzpatrickType: string,
  ) =>
    prisma.patient.create({
      data: {
        doctorId,
        firstName: nombre,
        lastName: apellido,
        gender,
        birthDate: new Date(birthDate),
        fitzpatrickType,
        email: `${nombre.toLowerCase()}.paciente@piel360.local`,
        phone: '+573004445566',
        createdAt: diasAtras(60),
      },
    });

  const marta = await crearPaciente(ana.doctorId, 'Marta', 'Rivera', 'female', '1992-05-14', 'III');
  const jorge = await crearPaciente(ana.doctorId, 'Jorge', 'Salazar', 'male', '1978-11-02', 'IV');
  const sofia = await crearPaciente(luis.doctorId, 'Sofía', 'Castro', 'female', '2005-03-21', 'II');

  const skiniver = await prisma.analysisProvider.findUnique({
    where: { slug: 'skiniver' },
  });
  const youcam = await prisma.analysisProvider.findUnique({
    where: { slug: 'youcam' },
  });

  // ---- Análisis dermatológicos, repartidos entre los dos miembros ----
  const DERM: [bigint, bigint, string, string, string, string, number][] = [
    [marta.id, ana.userId, 'Acné común', '2A_acne_vulgaris', 'Acné', 'L70', 2],
    [marta.id, ana.userId, 'Rosácea', '2A_rosacea', 'Acné', 'L71', 9],
    [jorge.id, ana.userId, 'Queratosis actínica', '2P_actinic_keratosis', 'Condiciones precancerosas', 'L57', 3],
    [sofia.id, luis.userId, 'Dermatitis atópica', '2D_atopic_dermatitis', 'Dermatitis', 'L20', 2],
    [sofia.id, luis.userId, 'Nevus displásico', '2P_dysplastic_nevus', 'Condiciones precancerosas', 'D22', 16],
  ];

  let n = 0;
  for (const [patientId, userId, clase, classRaw, desease, icd, dias] of DERM) {
    n += 1;
    const createdAt = diasAtras(dias);
    const imagen = `demo/empresa/derm-${n}.jpg`;
    const analysis = await prisma.analysis.create({
      data: {
        patientId,
        userId,
        providerId: skiniver?.id,
        imagePath: imagen,
        coloredS3Url: imagen,
        maskedS3Url: imagen,
        bodyRegion: 'rostro',
        isValid: true,
        isConfirmed: true,
        aiDiagnosis: clase,
        aiProbability: 0.86,
        aiRawResponse: prediccion(clase, classRaw, desease, icd),
        createdAt,
      },
    });
    await prisma.subscriptionUsage.create({
      data: { subscriptionId: subActiva, analysisId: analysis.id, quantity: 1, createdAt },
    });
  }

  // ---- Un análisis estético que agota el plan de YouCam ----
  // `quantity` gasta el plan completo sin sembrar 50 análisis: es el mismo
  // campo que usa el API al descontar créditos.
  const estetico = await prisma.analysis.create({
    data: {
      patientId: marta.id,
      userId: ana.userId,
      providerId: youcam?.id,
      youcamTaskId: 'demo-youcam-task-1',
      imagePath: 'demo/empresa/estetico-1.jpg',
      bodyRegion: 'rostro',
      isValid: true,
      aiRawResponse: {},
      createdAt: diasAtras(4),
    },
  });
  await prisma.subscriptionUsage.create({
    data: {
      subscriptionId: subConsumida,
      analysisId: estetico.id,
      quantity: planEstetico.analysisLimit,
      createdAt: diasAtras(4),
    },
  });

  const resumen = await prisma.subscription.findMany({
    where: { userId: dueno.userId },
    include: { plan: { select: { name: true, analysisLimit: true } }, usages: true },
    orderBy: { id: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        password: PASS,
        organizacion: { nombre: ORG, tipo: 'empresa', asientos: '3/5' },
        dueno: `${CUENTAS.dueno} — entra por /doctor/login/empresa`,
        miembros: [
          `${CUENTAS.ana} — todos los permisos de equipo`,
          `${CUENTAS.luis} — sin facturación`,
        ],
        planes: resumen.map((s) => ({
          plan: s.plan.name,
          estado: s.status,
          creditos:
            s.plan.analysisLimit -
            s.usages.reduce((a, u) => a + (u.quantity ?? 1), 0),
        })),
        pacientes: 3,
        analisis: { dermatologicos: DERM.length, esteticos: 1 },
      },
      (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
      1,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error('ERROR:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
