import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  for (const [name, label] of [
    ['patient_run_youcam', 'Paciente: ejecutar análisis estético'],
    ['patient_run_fitzpatrick', 'Paciente: ejecutar análisis de fototipo'],
  ] as const) {
    await prisma.permission.upsert({
      where: { name },
      update: { slug: name, isActive: true, kind: 'action', label },
      create: { name, slug: name, isActive: true, kind: 'action', label },
    });
  }

  const patient = await prisma.role.findUnique({ where: { name: 'patient' } });
  if (!patient) throw new Error('patient role missing');

  const clinical = await prisma.permission.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'clinical.' } },
        { slug: { startsWith: 'admin.' } },
        {
          name: {
            in: [
              'use_provider_skiniver',
              'use_provider_youcam',
              'use_provider_fitzpatrick',
            ],
          },
        },
      ],
    },
    select: { id: true },
  });

  await prisma.role.update({
    where: { id: patient.id },
    data: {
      primaryPanel: 'patient',
      permissions: {
        ...(clinical.length
          ? { disconnect: clinical.map((p) => ({ id: p.id })) }
          : {}),
        connect: [
          { name: 'patient_run_youcam' },
          { name: 'patient_run_fitzpatrick' },
        ],
      },
    },
  });

  console.log('OK patient permissions synced');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
