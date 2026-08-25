import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// Prisma 7: el cliente necesita un driver adapter explícito (ver src/prisma/prisma.service.ts).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

/**
 * Recursos administrables desde el panel admin (equivalente a los ->Resources
 * de Filament Shield). Cada uno recibe las 6 acciones estándar de abajo.
 * MIGRACION.md §5: RBAC simplificado sin polimorfismo de Spatie.
 */
const RESOURCES = [
  'user',
  'doctor',
  'patient',
  'plan',
  'subscription',
  'gateway_config',
  'role',
  'analysis',
  'encyclopedia_entry',
  'organization',
] as const;

const ACTIONS = [
  'view_any',
  'view',
  'create',
  'update',
  'delete',
  'delete_any',
] as const;

const ORG_OWNER_PERMS = [
  'view_organization',
  'create_organization',
  'update_organization',
] as const;

async function main() {
  // --- Analysis providers (MIGRACION.md §3.1) ---
  const [skiniver, youcam, fitzpatrick] = await Promise.all([
    prisma.analysisProvider.upsert({
      where: { slug: 'skiniver' },
      update: { displayLabel: 'Análisis Dermatológico' },
      create: {
        name: 'Skiniver',
        slug: 'skiniver',
        displayLabel: 'Análisis Dermatológico',
      },
    }),
    prisma.analysisProvider.upsert({
      where: { slug: 'youcam' },
      update: { displayLabel: 'Análisis Estético' },
      create: {
        name: 'YouCam',
        slug: 'youcam',
        displayLabel: 'Análisis Estético',
      },
    }),
    prisma.analysisProvider.upsert({
      where: { slug: 'fitzpatrick' },
      update: { displayLabel: 'Análisis Fitzpatrick' },
      create: {
        name: 'Fitzpatrick',
        slug: 'fitzpatrick',
        displayLabel: 'Análisis Fitzpatrick',
      },
    }),
  ]);

  // Compat: si quedó el rol legacy `admin`, renómbralo antes del upsert.
  await prisma.$executeRawUnsafe(
    `UPDATE "roles" SET "name" = 'superadmin' WHERE "name" = 'admin'`,
  );

  // --- Roles ---
  const [
    superadminRole,
    doctorRole,
    patientRole,
    monitorRole,
  ] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'superadmin' },
      update: {},
      create: { name: 'superadmin' },
    }),
    prisma.role.upsert({
      where: { name: 'doctor' },
      update: {},
      create: { name: 'doctor' },
    }),
    prisma.role.upsert({
      where: { name: 'patient' },
      update: {},
      create: { name: 'patient' },
    }),
    prisma.role.upsert({
      where: { name: 'monitor' },
      update: {},
      create: { name: 'monitor' },
    }),
  ]);

  // Compat: eliminar roles legacy empresa* si aún existen
  await prisma.role.deleteMany({
    where: { name: { in: ['empresa', 'empresa_aliada', 'admin'] } },
  });

  // --- Permissions: view_any_user, create_doctor, ... + validate_doctor ---
  const permissionNames = [
    ...RESOURCES.flatMap((resource) =>
      ACTIONS.map((action) => `${action}_${resource}`),
    ),
    'validate_doctor',
  ];

  await prisma.$transaction(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // Superadmin: todos los permisos
  await prisma.role.update({
    where: { id: superadminRole.id },
    data: {
      permissions: {
        set: [],
        connect: permissionNames.map((name) => ({ name })),
      },
    },
  });

  // Monitor: doctores + validación
  await prisma.role.update({
    where: { id: monitorRole.id },
    data: {
      permissions: {
        set: [],
        connect: [
          { name: 'view_any_doctor' },
          { name: 'view_doctor' },
          { name: 'update_doctor' },
          { name: 'validate_doctor' },
        ],
      },
    },
  });

  // Permisos de organization quedan en catálogo; el acceso se controla por
  // flags Doctor.empresa / Doctor.empresaReferida (no por rol RBAC).
  void doctorRole;
  void patientRole;
  void ORG_OWNER_PERMS;

  // --- Planes semilla (uno por proveedor) ---
  await prisma.plan.upsert({
    where: { id: 1n },
    update: {},
    create: {
      id: 1n,
      analysisProviderId: skiniver.id,
      name: 'Skiniver Básico',
      analysisLimit: 10,
      price: 29900,
      durationDays: 30,
      isActive: true,
      description:
        'Plan mensual de diagnóstico dermatológico por imagen (Skiniver).',
    },
  });

  await prisma.plan.upsert({
    where: { id: 2n },
    update: {},
    create: {
      id: 2n,
      analysisProviderId: youcam.id,
      name: 'YouCam Básico',
      analysisLimit: 10,
      price: 29900,
      durationDays: 30,
      isActive: true,
      description:
        'Plan mensual de análisis facial de estado de piel (YouCam).',
    },
  });

  await prisma.plan.upsert({
    where: { id: 3n },
    update: {},
    create: {
      id: 3n,
      analysisProviderId: fitzpatrick.id,
      name: 'Fitzpatrick Básico',
      analysisLimit: 10,
      price: 29900,
      durationDays: 30,
      isActive: true,
      description:
        'Plan mensual de clasificación de fototipo de piel (escala Fitzpatrick).',
    },
  });

  // --- Usuario superadmin inicial ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@piel360.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? '123456789';
  const adminPasswordHash = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPasswordHash,
      roles: { set: [], connect: [{ id: superadminRole.id }] },
    },
    create: {
      email: adminEmail,
      name: 'Admin Piel360',
      firstName: 'Admin',
      lastName: 'Piel360',
      gender: 'other',
      phone: '',
      address: '',
      password: adminPasswordHash,
      roles: { connect: [{ id: superadminRole.id }] },
    },
  });

  console.log('Seed completado:');
  console.log(
    `  - Providers: ${skiniver.slug}, ${youcam.slug}, ${fitzpatrick.slug}`,
  );
  console.log(
    '  - Roles: superadmin, monitor, doctor, patient',
  );
  console.log(`  - Permisos: ${permissionNames.length}`);
  console.log(`  - Superadmin: ${adminUser.email} (password: ${adminPassword})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
