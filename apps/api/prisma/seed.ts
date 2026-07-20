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
] as const;

const ACTIONS = [
  'view_any',
  'view',
  'create',
  'update',
  'delete',
  'delete_any',
] as const;

async function main() {
  // --- Analysis providers (MIGRACION.md §3.1) ---
  const [skiniver, youcam] = await Promise.all([
    prisma.analysisProvider.upsert({
      where: { slug: 'skiniver' },
      update: {},
      create: { name: 'Skiniver', slug: 'skiniver' },
    }),
    prisma.analysisProvider.upsert({
      where: { slug: 'youcam' },
      update: {},
      create: { name: 'YouCam', slug: 'youcam' },
    }),
  ]);

  // --- Roles ---
  const [adminRole, doctorRole, patientRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
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
  ]);

  // --- Permissions: view_any_user, create_doctor, ... (9 recursos x 6 acciones = 54) ---
  const permissionNames = RESOURCES.flatMap((resource) =>
    ACTIONS.map((action) => `${action}_${resource}`),
  );

  await prisma.$transaction(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  // El admin tiene todos los permisos; doctor/patient se autorizan por rol
  // a nivel de panel (@Roles), no por permiso granular (MIGRACION.md §5).
  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        set: [],
        connect: permissionNames.map((name) => ({ name })),
      },
    },
  });

  void doctorRole;
  void patientRole;

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
      description: 'Plan mensual de diagnóstico dermatológico por imagen (Skiniver).',
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
      description: 'Plan mensual de análisis facial de estado de piel (YouCam).',
    },
  });

  // --- Usuario admin inicial ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@piel360.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin Piel360',
      firstName: 'Admin',
      lastName: 'Piel360',
      gender: 'other',
      phone: '',
      address: '',
      password: await argon2.hash(adminPassword),
      roles: { connect: [{ id: adminRole.id }] },
    },
  });

  console.log('Seed completado:');
  console.log(`  - Providers: ${skiniver.slug}, ${youcam.slug}`);
  console.log(`  - Roles: admin, doctor, patient`);
  console.log(`  - Permisos: ${permissionNames.length}`);
  console.log(`  - Admin: ${adminUser.email} (password: ${adminPassword})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
