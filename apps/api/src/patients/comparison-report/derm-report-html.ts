import type { DermaOutcome } from '@piel360/shared';
import { BRAND_DARK, escapeHtml } from '../../reports/pdf-render';
import {
  htmlDocument,
  reportBand,
  reportCard,
  reportFooter,
  reportPhoto,
  reportTop,
  type ReportPatientInfo,
  type ReportPhoto,
} from './report-layout';

export interface DermReportSide extends ReportPhoto {
  outcome: DermaOutcome | null;
}

export interface DermReportData {
  patient: ReportPatientInfo;
  initial: DermReportSide;
  current: DermReportSide;
  /** Nota general de la comparación y las observaciones de cada análisis. */
  comments: string[];
  generatedAt: string;
}

const STATUS: Record<
  DermaOutcome['kind'],
  { label: string; color: string; bg: string }
> = {
  selected: { label: 'Confirmado', color: '#047857', bg: '#D1FAE5' },
  corrected: { label: 'Corregido', color: '#1D4ED8', bg: '#DBEAFE' },
  pending: { label: 'Sin confirmar', color: '#92400E', bg: '#FEF3C7' },
};

function diagnosisColumn(title: string, outcome: DermaOutcome | null): string {
  const status = outcome ? STATUS[outcome.kind] : null;
  return `<div style="text-align:center">
    <div style="background:#EAF2FB;color:${BRAND_DARK};font-size:9px;font-weight:700;border-radius:6px;padding:4px">${escapeHtml(title)}</div>
    <p style="margin:8px 0 4px;font-size:14px;font-weight:800;color:${BRAND_DARK}">${escapeHtml(outcome?.title ?? 'Sin diagnóstico')}</p>
    ${
      status
        ? `<span style="display:inline-block;font-size:8.5px;font-weight:700;color:${status.color};background:${status.bg};border-radius:999px;padding:2px 9px">${status.label}</span>`
        : ''
    }
    <p style="margin:5px 0 0;font-size:9px;color:#475569">Código CIE: ${escapeHtml(outcome?.icd ?? '—')}</p>
  </div>`;
}

/** «Reporte de Comparación de Análisis Dermatológico», con la referencia del cliente. */
export function buildDermComparisonHtml(data: DermReportData): string {
  const p = data.patient;
  const facts = [
    { label: 'Paciente', value: p.name },
    ...(p.age != null ? [{ label: 'Edad', value: `${p.age} años` }] : []),
    ...(p.gender ? [{ label: 'Sexo', value: p.gender }] : []),
    { label: 'Clínica', value: p.clinic },
    { label: 'Periodo', value: `${data.initial.date} – ${data.current.date}` },
  ];
  const comments = data.comments
    .map(
      (c) =>
        `<p class="text" style="border-left:3px solid #93C5FD;padding-left:8px;margin:0 0 6px;font-style:italic">${escapeHtml(c)}</p>`,
    )
    .join('');

  return htmlDocument(`
    ${reportTop(facts)}
    ${reportBand('Reporte de Comparación de Análisis Dermatológico', 'Evolución de tu piel en el tiempo')}
    ${reportCard(
      'Imágenes del análisis',
      `<div class="photos">${reportPhoto(data.initial, 'Análisis inicial', 260)}${reportPhoto(data.current, 'Análisis actual', 260)}</div>`,
    )}
    ${reportCard(
      'Resumen del diagnóstico dermatológico',
      `<div class="grid2">${diagnosisColumn('Diagnóstico inicial', data.initial.outcome)}${diagnosisColumn('Diagnóstico actual', data.current.outcome)}</div>`,
    )}
    ${reportCard(
      'Comentarios del dermatólogo',
      comments ||
        '<p class="text" style="color:#64748B">Sin comentarios registrados.</p>',
    )}
    ${reportFooter(data.generatedAt)}
  `);
}
