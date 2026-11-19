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

// ───────────── RESUMEN EJECUTIVO ─────────────
type RGB = [number, number, number];

const RISK_STOPS: [number, RGB][] = [
  [0, [30, 144, 255]], [25, [46, 204, 113]], [50, [241, 220, 70]], [75, [245, 150, 30]], [100, [229, 38, 38]],
];
function riskRgb(score: number): RGB {
  const s = Math.max(0, Math.min(100, score));
  for (let i = 1; i < RISK_STOPS.length; i++) {
    const [b, cb] = RISK_STOPS[i];
    if (s <= b) {
      const [a, ca] = RISK_STOPS[i - 1];
      const t = (s - a) / (b - a);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as RGB;
    }
  }
  return [229, 38, 38];
}
const LEVEL_RGB: Record<string, RGB> = { 'Crítica': [229, 38, 38], 'Muy alta': [245, 150, 30], Alta: [241, 220, 70], Media: [46, 204, 113], Baja: [30, 144, 255] };
const LEVEL_NAMES = ['Baja', 'Media', 'Alta', 'Muy alta', 'Crítica'];
const BRAND: RGB = [199, 22, 50];

export type ExecutiveOptions = {
  scope: string;
  metrics: Metrics;
  inProcess?: number;
  criticality: { name: string; value: number; count: number }[];
  platforms: [string, number][];
  regionsCompare: { name: string; remediation: number; sla: number; servers: number; findings: number }[];
  zones: { name: string; score: number; label: string; servers: number }[];
  map?: { dataUrl: string; width: number; height: number };
  alerts: { time: string; title: string; detail: string; category: string; region: string }[];
  trend?: { label: string; value: number }[]; // opcional: serie real de remediación (0-100)
};

function drawBand(doc: jsPDF, W: number, title: string, subtitle: string) {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 40, 31);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(clean(subtitle), 40, 49);
}

function sectionTitle(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFillColor(...BRAND);
  doc.rect(x, y - 9, 3, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 24, 32);
  doc.text(text, x + 8, y);
}

function hbar(doc: jsPDF, x: number, y: number, w: number, h: number, pct: number, color: RGB) {
  doc.setFillColor(237, 239, 242);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  const p = Math.max(0, Math.min(1, pct));
  if (p > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, Math.max(h, w * p), h, h / 2, h / 2, 'F');
  }
}

function wedge(doc: jsPDF, cx: number, cy: number, r: number, a0: number, a1: number, color: RGB) {
  const pts: [number, number][] = [[cx, cy]];
  const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 3));
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps - 90) * (Math.PI / 180);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const segs = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.setFillColor(...color);
  doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true);
}

function lineChart(doc: jsPDF, x: number, y: number, w: number, h: number, series: { label: string; value: number }[]) {
  doc.setLineWidth(0.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  [0, 25, 50, 75, 100].forEach((v) => {
    const gy = y + h - (v / 100) * h;
    doc.setDrawColor(232, 235, 239);
    doc.line(x, gy, x + w, gy);
    doc.setTextColor(140, 146, 156);
    doc.text(`${v}%`, x - 6, gy + 2, { align: 'right' });
  });
  if (series.length < 2) return;
  const pts = series.map((p, i) => [x + (i / (series.length - 1)) * w, y + h - (Math.max(0, Math.min(100, p.value)) / 100) * h]);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.8);
  doc.lines(pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'S', false);
  doc.setLineWidth(0.5);
  doc.setTextColor(140, 146, 156);
  doc.text(series[0].label, x, y + h + 11);
  doc.text(series[Math.floor(series.length / 2)].label, x + w / 2, y + h + 11, { align: 'center' });
  doc.text(series[series.length - 1].label, x + w, y + h + 11, { align: 'right' });
}

export function exportExecutivePdf(o: ExecutiveOptions) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const m = o.metrics;
  const scopeLabel = o.scope === 'Todas' ? 'Todas las regiones' : `Región ${o.scope}`;
  const stamp = new Date().toLocaleString('es-MX');

  // ===== HOJA 1 =====
  drawBand(doc, W, 'FEMSA · Resumen ejecutivo de parches', `Alcance: ${scopeLabel}   ·   Generado: ${stamp}`);

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
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 97, 110);
  doc.text(
    `Activos administrados: ${m.servers.toLocaleString('es-MX')}   ·   Hallazgos totales: ${m.findings.toLocaleString('es-MX')}${o.inProcess ? `   ·   En proceso: ${o.inProcess.toLocaleString('es-MX')}` : ''}`,
    40, 150,
  );

  // Columna izquierda: mapa + leyenda + riesgo por región
  sectionTitle(doc, 'Mapa de exposición por región', 40, 176);
  const mapW = 440;
  const mapH = o.map ? (mapW * o.map.height) / o.map.width : 170;
  if (o.map) {
    doc.addImage(o.map.dataUrl, 'PNG', 40, 184, mapW, mapH);
    doc.setDrawColor(165, 227, 234);
    doc.roundedRect(40, 184, mapW, mapH, 4, 4, 'S');
  } else {
    doc.setFontSize(9);
    doc.setTextColor(140, 146, 156);
    doc.text('Mapa no disponible en esta exportación.', 40, 200);
  }
  const ly = 184 + mapH + 14;
  for (let i = 0; i < 100; i++) {
    doc.setFillColor(...riskRgb(i));
    doc.rect(40 + i * 2, ly, 2.1, 7, 'F');
  }
  doc.setFontSize(7);
  doc.setTextColor(90, 97, 110);
  LEVEL_NAMES.forEach((name, i) => {
    doc.text(name, 40 + i * 50, ly + 17, { align: i === 0 ? 'left' : i === 4 ? 'right' : 'center' });
  });
  doc.setTextColor(115, 121, 133);
  doc.text(doc.splitTextToSize('El color de cada región indica la criticidad promedio de sus hallazgos abiertos.', 215), 262, ly + 5);

  const zy = ly + 42;
  sectionTitle(doc, 'Riesgo por región', 40, zy);
  o.zones.forEach((z, i) => {
    const ry = zy + 12 + i * 34;
    const color = riskRgb(z.score);
    doc.setFillColor(...color);
    doc.circle(46, ry + 8, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 24, 32);
    doc.text(`Región ${z.name}`, 58, ry + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(115, 121, 133);
    doc.text(`${z.label} · ${z.servers.toLocaleString('es-MX')} servidores`, 58, ry + 20);
    hbar(doc, 250, ry + 4, 180, 8, z.score / 100, color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 24, 32);
    doc.text(`${z.score}/100`, 480, ry + 11, { align: 'right' });
  });

  // Columna derecha: dona SLA + remediación por criticidad
  const RX = 510;
  sectionTitle(doc, 'Cumplimiento de SLA', RX, 176);
  const sla = Math.max(0, Math.min(100, m.sla));
  const cx = RX + 56;
  const cy = 246;
  const green: RGB = [46, 160, 100];
  const bad: RGB = [229, 38, 38];
  wedge(doc, cx, cy, 50, 0, (360 * sla) / 100, green);
  if (sla < 100) wedge(doc, cx, cy, 50, (360 * sla) / 100, 360, bad);
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(21, 24, 32);
  doc.text(`${Math.round(sla)}%`, cx, cy + 3, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(115, 121, 133);
  doc.text('dentro de SLA', cx, cy + 13, { align: 'center' });
  [['Cumple SLA', `${sla.toFixed(1)}%`, green], ['Fuera de SLA', `${(100 - sla).toFixed(1)}%`, bad]].forEach(([label, value, color], i) => {
    const ry = 232 + i * 20;
    doc.setFillColor(...(color as RGB));
    doc.rect(640, ry - 7, 8, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 66, 76);
    doc.text(String(label), 654, ry);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), W - 40, ry, { align: 'right' });
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(115, 121, 133);
  doc.text(`Hallazgos fuera de SLA (aprox.): ${Math.round((m.findings * (100 - sla)) / 100).toLocaleString('es-MX')}`, 640, 276);

  sectionTitle(doc, 'Remediación por criticidad', RX, 322);
  o.criticality.slice(0, 5).forEach((c, i) => {
    const ry = 336 + i * 36;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 24, 32);
    doc.text(c.name, RX, ry + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(115, 121, 133);
    doc.text(`${c.count.toLocaleString('es-MX')} hallazgos`, RX, ry + 19);
    hbar(doc, RX + 70, ry + 2, 170, 9, c.value / 100, LEVEL_RGB[c.name] ?? [120, 126, 138]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 24, 32);
    doc.text(`${c.value}%`, W - 40, ry + 10, { align: 'right' });
  });

  // ===== HOJA 2 =====
  doc.addPage();
  drawBand(doc, W, 'FEMSA · Resumen ejecutivo de parches', `Alcance: ${scopeLabel}   ·   Detalle`);

  // Remediación y SLA por región
  sectionTitle(doc, 'Remediación y SLA por región', 40, 96);
  const blue: RGB = [37, 99, 235];
  doc.setFillColor(...blue); doc.rect(190, 87, 8, 8, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 97, 110);
  doc.text('Remediación', 202, 94);
  doc.setFillColor(...green); doc.rect(262, 87, 8, 8, 'F');
  doc.text('Cumplimiento SLA', 274, 94);
  let leftEnd = 110;
  o.regionsCompare.forEach((r, i) => {
    const ry = 112 + i * 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(21, 24, 32);
    doc.text(r.name === 'Todas' ? 'Todas' : `Región ${r.name}`, 40, ry + 12);
    hbar(doc, 130, ry + 2, 210, 8, r.remediation / 100, blue);
    hbar(doc, 130, ry + 16, 210, 8, r.sla / 100, green);
    doc.setFontSize(8);
    doc.text(`${r.remediation}%`, 400, ry + 9, { align: 'right' });
    doc.text(`${r.sla}%`, 400, ry + 23, { align: 'right' });
    leftEnd = ry + 30;
  });

  // Fuera de SLA por plataforma
  let rightEnd = 110;
  if (o.platforms.length) {
    sectionTitle(doc, 'Fuera de SLA por plataforma', 440, 96);
    const maxV = Math.max(1, ...o.platforms.map(([, v]) => v));
    o.platforms.slice(0, 6).forEach(([name, value], i) => {
      const ry = 112 + i * 26;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 66, 76);
      doc.text(name, 440, ry + 9);
      hbar(doc, 560, ry + 2, 180, 8, value / maxV, [229, 38, 38]);
      doc.setFont('helvetica', 'bold');
      doc.text(value.toLocaleString('es-MX'), W - 40, ry + 9, { align: 'right' });
      rightEnd = ry + 24;
    });
  }

  let y = Math.max(leftEnd, rightEnd) + 22;

  // Tendencia (solo si se entrega una serie real)
  if (o.trend && o.trend.length > 1) {
    sectionTitle(doc, 'Evolución de la remediación', 40, y);
    lineChart(doc, 70, y + 14, W - 130, 100, o.trend);
    y += 14 + 100 + 30;
  }

  // Actividad reciente
  if (o.alerts.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40, bottom: 40 },
      head: [
        [{ content: 'Actividad reciente', colSpan: 5, styles: { halign: 'left', fillColor: [122, 11, 29], fontSize: 10 } }],
        ['Severidad / hora', 'Alerta', 'Detalle', 'Categoría', 'Región'],
      ],
      body: o.alerts.map((a) => [a.time, a.title, a.detail, a.category, a.region]),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 8 },
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

  const slug = o.scope.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
  doc.save(`resumen-ejecutivo-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`);
}