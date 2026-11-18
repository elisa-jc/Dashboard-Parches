import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type Metrics = {
  remediation: number; sla: number; reopened: number; obsolete: number;
  exposed: number; servers: number; findings: number;
};

export type ReportOptions = {
  scope: string;
  metrics: Metrics;
  servers: { id: string; os: string; region: string; risk: string; findings: number; status: string }[];
  alerts: { time: string; title: string; detail: string; category: string; region: string }[];
  filters: string[];
};

const clean = (text: string) => text.replace(/[\u202f\u00a0]/g, ' ');

export function exportReportPdf({ scope, metrics: m, servers, alerts, filters }: ReportOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const red: [number, number, number] = [199, 22, 50];
  const scopeLabel = scope === 'Todas' ? 'Todas las regiones' : `Región ${scope}`;

  // Encabezado
  doc.setFillColor(...red);
  doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FEMSA · Reporte de gestión de parches', 40, 31);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(clean(`Alcance: ${scopeLabel}   ·   Generado: ${new Date().toLocaleString('es-MX')}`), 40, 49);

  // Indicadores
  const kpis: [string, string][] = [
    ['Remediación', `${m.remediation}%`],
    ['Cumplimiento SLA', `${m.sla}%`],
    ['Hallazgos reabiertos', String(m.reopened)],
    ['Servidores obsoletos', String(m.obsolete)],
    ['Hallazgos explotables', String(m.exposed)],
  ];
  const gap = 10;
  const bw = (W - 80 - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach(([label, value], i) => {
    const x = 40 + i * (bw + gap);
    doc.setDrawColor(228, 231, 235);
    doc.setFillColor(250, 250, 251);
    doc.roundedRect(x, 80, bw, 52, 4, 4, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(115, 121, 133);
    doc.text(label.toUpperCase(), x + 10, 98);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(21, 24, 32);
    doc.text(value, x + 10, 121);
  });

  let y = 152;
  if (filters.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 97, 110);
    const lines = doc.splitTextToSize(`Filtros aplicados: ${filters.join('   |   ')}`, W - 80);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 4;
  }

  // Tabla de servidores
  autoTable(doc, {
    startY: y + 6,
    margin: { left: 40, right: 40, bottom: 40 },
    head: [
      [{ content: `Servidores (${servers.length})`, colSpan: 6, styles: { halign: 'left', fillColor: [122, 11, 29], fontSize: 10 } }],
      ['Servidor', 'Sistema operativo', 'País', 'Riesgo', 'Hallazgos', 'Estado'],
    ],
    body: servers.length
      ? servers.map((s) => [s.id, s.os, s.region, s.risk, String(s.findings), String(s.status)])
      : [[{ content: 'No hay servidores para los filtros seleccionados.', colSpan: 6, styles: { halign: 'center' } }]],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: red, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 4: { halign: 'right' } },
    didParseCell: (hook) => {
      if (hook.section === 'body' && hook.column.index === 3) {
        const v = String(hook.cell.raw);
        hook.cell.styles.fontStyle = 'bold';
        if (v === 'Crítico') hook.cell.styles.textColor = [185, 20, 44];
        else if (v === 'Muy alto') hook.cell.styles.textColor = [184, 107, 18];
      }
    },
  });

  // Tabla de alertas
  if (alerts.length) {
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    autoTable(doc, {
      startY: last + 24,
      margin: { left: 40, right: 40, bottom: 40 },
      head: [
        [{ content: `Alertas (${alerts.length})`, colSpan: 5, styles: { halign: 'left', fillColor: [122, 11, 29], fontSize: 10 } }],
        ['Hora', 'Alerta', 'Detalle', 'Categoría', 'País'],
      ],
      body: alerts.map((a) => [a.time, a.title, a.detail, a.category, a.region]),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
      headStyles: { fillColor: red, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  // Pie de página
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 146, 156);
    doc.text('Documento confidencial · FEMSA', 40, H - 18);
    doc.text(`Página ${i} de ${pages}`, W - 40, H - 18, { align: 'right' });
  }

  const slug = scope.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
  doc.save(`reporte-parches-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}