import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { ADMIN_COMPONENTS, MONITOR_COMPONENT_SLUGS, EMPRESA_ROLE_PERMISSIONS } from '@piel360/shared';

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
  'analysis_consumption',
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
      update: { displayLabel: 'Piel 360 AI · Fototipo' },
      create: {
        name: 'Fototipo',
        slug: 'fitzpatrick',
        displayLabel: 'Piel 360 AI · Fototipo',
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
    empresaRole,
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
    prisma.role.upsert({
      where: { name: 'empresa' },
      update: {
        label: 'Empresa',
        description:
          'Cuenta empresarial con equipo, planes business y gestión de organización.',
        color: '#0EA5E9',
        isActive: true,
      },
      create: {
        name: 'empresa',
        label: 'Empresa',
        description:
          'Cuenta empresarial con equipo, planes business y gestión de organización.',
        color: '#0EA5E9',
      },
    }),
  ]);

  // Compat: eliminar roles legacy si aún existen (no el rol `empresa` actual).
  await prisma.role.deleteMany({
    where: { name: { in: ['empresa_aliada', 'admin'] } },
  });

  const providerUsagePermissions = [
    'use_provider_skiniver',
    'use_provider_youcam',
    'use_provider_fitzpatrick',
  ] as const;

  // --- Permissions: view_any_user, create_doctor, ... + validate_doctor ---
  const permissionNames = [
    ...RESOURCES.flatMap((resource) =>
      ACTIONS.map((action) => `${action}_${resource}`),
    ),
    'validate_doctor',
    ...providerUsagePermissions,
  ];

  await prisma.$transaction(
    permissionNames.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: { slug: name, isActive: true, kind: 'action' },
        create: { name, slug: name, isActive: true, kind: 'action' },
      }),
    ),
  );

  await prisma.$transaction(
    ADMIN_COMPONENTS.map((component) =>
      prisma.permission.upsert({
        where: { slug: component.slug },
        update: {
          label: component.label,
          href: component.href,
          sortOrder: component.sortOrder,
          parentSlug: component.parentSlug ?? null,
          panel: 'admin',
          kind: 'component',
          isActive: component.isActive ?? true,
        },
        create: {
          name: component.slug,
          slug: component.slug,
          label: component.label,
          href: component.href,
          sortOrder: component.sortOrder,
          parentSlug: component.parentSlug ?? null,
          panel: 'admin',
          kind: 'component',
          isActive: component.isActive ?? true,
        },
      }),
    ),
  );

  const allActivePermissions = await prisma.permission.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  // Superadmin: todos los permisos (acciones + componentes)
  await prisma.role.update({
    where: { id: superadminRole.id },
    data: {
      permissions: {
        set: [],
        connect: allActivePermissions.map((permission) => ({ id: permission.id })),
      },
    },
  });

  // Monitor: doctores + validación + componentes de verificación
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
          ...MONITOR_COMPONENT_SLUGS.map((slug) => ({ slug })),
        ],
      },
    },
  });

  // Empresa: permisos de panel clínico + organización
  await prisma.role.update({
    where: { id: empresaRole.id },
    data: {
      permissions: {
        set: [],
        connect: EMPRESA_ROLE_PERMISSIONS.map((name) => ({ name })),
      },
    },
  });

  // Permisos de organization en catálogo; flags Doctor.empresa activan módulos UI.
  void doctorRole;
  void patientRole;
  void ORG_OWNER_PERMS;

  // --- Roles de especialidad (registro doctor) ---
  const legacySpecialtyRoleRenames: Record<string, string> = {
    specialty_dermatologo: 'dermatologo',
    specialty_medico_general: 'medico_general',
    specialty_cirujano_plastico: 'cirujano_plastico',
    specialty_estetica_medica: 'estetica_medica',
    specialty_otra: 'otra',
  };

  for (const [oldName, newName] of Object.entries(legacySpecialtyRoleRenames)) {
    const legacy = await prisma.role.findUnique({ where: { name: oldName } });
    if (!legacy) continue;
    const target = await prisma.role.findUnique({ where: { name: newName } });
    if (target) {
      const users = await prisma.user.findMany({
        where: { roles: { some: { id: legacy.id } } },
        select: { id: true },
      });
      for (const user of users) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            roles: {
              disconnect: [{ id: legacy.id }],
              connect: [{ id: target.id }],
            },
          },
        });
      }
      await prisma.role.delete({ where: { id: legacy.id } });
    } else {
      await prisma.role.update({
        where: { id: legacy.id },
        data: { name: newName },
      });
    }
  }

  const specialtyDefinitions = [
    {
      slug: 'dermatologo',
      name: 'Dermatólogo',
      description:
        'Especialista en el diagnóstico y tratamiento de enfermedades de la piel, cabello y uñas.',
      sortOrder: 0,
      perms: ['use_provider_skiniver'] as const,
    },
    {
      slug: 'medico_general',
      name: 'Médico general',
      description:
        'Profesional de medicina general con enfoque en salud integral y derivación a especialistas.',
      sortOrder: 1,
      perms: ['use_provider_skiniver', 'use_provider_youcam'] as const,
    },
    {
      slug: 'cirujano_plastico',
      name: 'Cirujano plástico',
      description:
        'Especialista en procedimientos quirúrgicos y reconstructivos estéticos.',
      sortOrder: 2,
      perms: ['use_provider_youcam', 'use_provider_fitzpatrick'] as const,
    },
    {
      slug: 'estetica_medica',
      name: 'Estética médica',
      description:
        'Especialista en procedimientos estéticos no invasivos y mejora de la apariencia facial y corporal.',
      sortOrder: 3,
      perms: ['use_provider_youcam', 'use_provider_fitzpatrick'] as const,
    },
    { slug: 'otra', name: 'Otra', description: null, sortOrder: 4, perms: [] as const },
  ] as const;

  const specialtyRoles = await Promise.all(
    specialtyDefinitions.map((item) =>
      prisma.role.upsert({
        where: { name: item.slug },
        update: {},
        create: { name: item.slug },
      }),
    ),
  );

  for (const [index, role] of specialtyRoles.entries()) {
    const item = specialtyDefinitions[index];
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: [],
          connect: item.perms.map((name) => ({ name })),
        },
      },
    });

    await prisma.doctorSpecialty.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        roleId: role.id,
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        sortOrder: item.sortOrder,
        roleId: role.id,
      },
    });
  }

  const specialtyRoleNames = specialtyDefinitions.map((item) => item.slug);
  const specialtyLabelToRole = Object.fromEntries(
    specialtyDefinitions.map((item) => [item.name, item.slug]),
  );

  const existingDoctors = await prisma.doctor.findMany({
    select: { userId: true, specialty: true },
  });
  for (const doctor of existingDoctors) {
    const roleName = doctor.specialty
      ? specialtyLabelToRole[doctor.specialty.trim()]
      : undefined;
    if (!roleName) continue;
    await prisma.user.update({
      where: { id: doctor.userId },
      data: {
        roles: {
          disconnect: specialtyRoleNames.map((name) => ({ name })),
          connect: [{ name: roleName }],
        },
      },
    });
  }

  // --- Planes semilla (uno por proveedor) ---
  await prisma.plan.upsert({
    where: { id: 1n },
    update: { planType: 'individual', maxUsers: 1 },
    create: {
      id: 1n,
      analysisProviderId: skiniver.id,
      name: 'Skiniver Básico',
      planType: 'individual',
      analysisLimit: 10,
      price: 29900,
      durationDays: 30,
      maxUsers: 1,
      isActive: true,
      description:
        'Plan mensual de diagnóstico dermatológico por imagen (Skiniver).',
    },
  });

  await prisma.plan.upsert({
    where: { id: 2n },
    update: { planType: 'individual', maxUsers: 1 },
    create: {
      id: 2n,
      analysisProviderId: youcam.id,
      name: 'YouCam Básico',
      planType: 'individual',
      analysisLimit: 10,
      price: 29900,
      durationDays: 30,
      maxUsers: 1,
      isActive: true,
      description:
        'Plan mensual de análisis facial de estado de piel (YouCam).',
    },
  });

  await prisma.plan.upsert({
    where: { id: 3n },
    update: {
      name: 'Fototipo Básico',
      planType: 'individual',
      maxUsers: 1,
      description:
        'Plan mensual de clasificación de fototipo de piel (tipos I a VI).',
    },
    create: {
      id: 3n,
      analysisProviderId: fitzpatrick.id,
      name: 'Fototipo Básico',
      planType: 'individual',
      analysisLimit: 10,
      price: 29900,
      durationDays: 30,
      maxUsers: 1,
      isActive: true,
      description:
        'Plan mensual de clasificación de fototipo de piel (tipos I a VI).',
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
    '  - Roles: superadmin, monitor, doctor, patient + especialidades',
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
