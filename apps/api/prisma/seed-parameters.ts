/**
 * Carga inicial (un solo uso) de los catálogos de docs/catalogo/ a las
 * tablas genéricas ParameterType/Parameter. No se re-corre automáticamente
 * — después de esto, el admin edita vía UI (/admin/configuracion).
 *
 * Uso: npx tsx prisma/seed-parameters.ts   (desde apps/api/)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';

// Prisma 7: el cliente necesita un driver adapter explícito (ver src/prisma/prisma.service.ts).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATALOGO_DIR = resolve(__dirname, '../../../docs/catalogo');

/** Parser CSV mínimo, consciente de comillas (algunas descripciones de CIIU
 * traen ";" dentro de un campo entrecomillado). Delimitador ";". */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ';') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** Excel-locale export: ids/números vienen como "1.123," (miles con "." y
 * coma final) — se limpia a un string plano de dígitos. */
function cleanExcelNumberish(raw: string): string {
  return raw.trim().replace(/\.(?=\d{3}(,|$))/g, '').replace(/,$/, '').trim();
}

function readCsv(fileName: string): { header: string[]; rows: string[][] } {
  const path = resolve(CATALOGO_DIR, fileName);
  const text = readFileSync(path, 'utf-8').replace(/^﻿/, '');
  const parsed = parseCsv(text);
  const [header, ...rows] = parsed;
  return { header, rows };
}

interface ParameterSeed {
  code: string | null;
  label: string;
}

async function upsertCatalog(slug: string, name: string, items: ParameterSeed[]) {
  const type = await prisma.parameterType.upsert({
    where: { slug },
    create: { slug, name },
    update: { name },
  });

  // Dedupe por label (constraint única typeId+label) — conserva la primera
  // aparición si dos filas del CSV producen el mismo label.
  const seen = new Set<string>();
  const data: Prisma.ParameterCreateManyInput[] = [];
  let sortOrder = 0;
  for (const item of items) {
    const label = item.label.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    data.push({
      typeId: type.id,
      code: item.code,
      label,
      sortOrder: sortOrder++,
    });
  }

  const result = await prisma.parameter.createMany({
    data,
    skipDuplicates: true,
  });
  console.log(`[${slug}] ${result.count} parámetros insertados (de ${items.length} filas del CSV).`);
}

async function seedCiiu() {
  const { rows } = readCsv('Catálogo_de_actividades_económicas_20260830.csv');
  // Columnas: id;code;description;status;version
  const items: ParameterSeed[] = rows.map(([, code, description]) => ({
    code: code?.trim() || null,
    label: `${code?.trim()} — ${description?.trim()}`,
  }));
  await upsertCatalog('ciiu_code', 'Código CIIU', items);
}

async function seedHigherEducation() {
  const { rows } = readCsv('MEN_INSTITUCIONES_EDUCACIÓN_SUPERIOR_20260910.csv');
  // Columnas: Código Institución;Nombre Institución;...;Municipio Domicilio;...
  const items: ParameterSeed[] = rows.map((r) => {
    const code = cleanExcelNumberish(r[0] ?? '');
    const name = r[1]?.trim() ?? '';
    const municipio = r[10]?.trim();
    return {
      code: code || null,
      label: municipio ? `${name} — ${municipio}` : name,
    };
  });
  await upsertCatalog('education_entity', 'Entidad educativa', items);
}

async function seedTechnicalEducation() {
  const { rows } = readCsv(
    'MEN_INSTITUCIONES_EDUCACIÓN_PARA_EL_TRABAJO_Y_EL_DESARROLLO_HUMANO_20260830_1.csv',
  );
  // Columnas: cod_sed;secretaria;codigo_institucion;nombre_institucion;...;municipio;...
  const items: ParameterSeed[] = rows.map((r) => {
    const code = cleanExcelNumberish(r[2] ?? '');
    const name = r[3]?.trim() ?? '';
    const municipio = r[10]?.trim();
    return {
      code: code || null,
      label: municipio ? `${name} — ${municipio}` : name,
    };
  });
  await upsertCatalog(
    'technical_education_institution',
    'Institución de educación técnica',
    items,
  );
}

async function main() {
  await seedCiiu();
  await seedHigherEducation();
  await seedTechnicalEducation();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
