import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import worldData from 'world-atlas/countries-110m.json';
import type { RegionData } from './api';
import { useBackendData } from './useBackendData';

type IconName =
  | 'grid'
  | 'server'
  | 'shield'
  | 'alert'
  | 'history'
  | 'settings'
  | 'search'
  | 'bell'
  | 'chevron'
  | 'arrow'
  | 'trend'
  | 'check'
  | 'clock'
  | 'more'
  | 'download'
  | 'upload'
  | 'map'
  | 'filter'
  | 'close'
  | 'menu'
  | 'moon'
  | 'sun';

const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  server: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7" /></>,
  shield: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  alert: <><path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5M5 3h14" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  moon: <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

// Datos de ejemplo del diseño: se usan solo si el back end no responde
const mockRegions = {
  Todas: { remediation: 72.4, sla: 86.8, reopened: 28, obsolete: 17, exposed: 42, servers: 256, findings: 3450 },
  Norte: { remediation: 78.1, sla: 89.4, reopened: 9, obsolete: 5, exposed: 13, servers: 102, findings: 1379 },
  Centro: { remediation: 71.6, sla: 86.1, reopened: 11, obsolete: 7, exposed: 17, servers: 94, findings: 1264 },
  Sur: { remediation: 64.8, sla: 82.2, reopened: 8, obsolete: 5, exposed: 12, servers: 60, findings: 807 },
};

const mockServers = [
  { id: 'SRV-MX-0042', os: 'Windows Server 2019', region: 'Norte', role: 'ERP Producción', risk: 'Crítico', findings: 34, status: 'Fuera de SLA', last: 'Hace 18 min' },
  { id: 'SRV-MX-0187', os: 'Red Hat Enterprise 8', region: 'Centro', role: 'Base de datos', risk: 'Muy alto', findings: 27, status: 'Expuesto', last: 'Hace 36 min' },
  { id: 'SRV-MX-0091', os: 'AIX 7.2', region: 'Sur', role: 'Transferencia', risk: 'Alto', findings: 19, status: 'Reabierto', last: 'Hace 1 h' },
  { id: 'SRV-MX-0210', os: 'Windows Server 2016', region: 'Norte', role: 'Directorio', risk: 'Alto', findings: 16, status: 'EOL próximo', last: 'Hace 2 h' },
  { id: 'SRV-MX-0125', os: 'Ubuntu Server 20.04', region: 'Centro', role: 'Aplicación web', risk: 'Medio', findings: 12, status: 'En seguimiento', last: 'Hace 3 h' },
  { id: 'SRV-MX-0067', os: 'VMware ESXi 7', region: 'Sur', role: 'Hipervisor', risk: 'Medio', findings: 9, status: 'En seguimiento', last: 'Ayer, 18:42' },
];

const mockAlerts = [
  { time: '10:42', title: 'SLA crítico excedido', detail: 'SRV-MX-0042 · 12 vulnerabilidades sin remediar', tone: 'critical', category: 'SLA', server: 'SRV-MX-0042', region: 'Norte', detected: 'Hoy, 10:42', recommendation: 'Aplicar el lote KB-5039217 durante la próxima ventana de mantenimiento.' },
  { time: '09:18', title: 'Nueva exposición a internet', detail: 'SRV-MX-0187 · Puerto vulnerable detectado', tone: 'warning', category: 'Expuestas', server: 'SRV-MX-0187', region: 'Centro', detected: 'Hoy, 09:18', recommendation: 'Restringir el acceso público y validar las reglas del firewall perimetral.' },
  { time: '08:51', title: 'Remediación completada', detail: 'Lote MX-2408 · 18 servidores actualizados', tone: 'success', category: 'SLA', server: 'Lote MX-2408', region: 'Norte', detected: 'Hoy, 08:51', recommendation: 'Mantener monitoreo durante 24 horas y cerrar el cambio al concluir la validación.' },
  { time: 'Ayer', title: 'Hallazgo reabierto', detail: 'SRV-MX-0091 · Validación posterior fallida', tone: 'critical', category: 'Críticas', server: 'SRV-MX-0091', region: 'Sur', detected: 'Ayer, 18:27', recommendation: 'Revisar la versión instalada y repetir la validación con credenciales administrativas.' },
  { time: 'Ayer', title: 'Activo crítico sin parche', detail: 'SRV-MX-0210 · Severidad 5 con exploit disponible', tone: 'critical', category: 'Críticas', server: 'SRV-MX-0210', region: 'Norte', detected: 'Ayer, 16:04', recommendation: 'Aislar temporalmente el activo y ejecutar el plan de remediación prioritario.' },
  { time: '22 Ago', title: 'Servicio expuesto detectado', detail: 'SRV-MX-0067 · Interfaz administrativa pública', tone: 'warning', category: 'Expuestas', server: 'SRV-MX-0067', region: 'Sur', detected: '22 Ago, 14:12', recommendation: 'Mover la interfaz a la red de administración y revocar el acceso externo.' },
];

const navItems: { id: string; label: string; icon: IconName; badge?: number }[] = [
  { id: 'resumen', label: 'Resumen ejecutivo', icon: 'grid' },
  { id: 'servidores', label: 'Servidores', icon: 'server' },
  { id: 'cumplimiento', label: 'Cumplimiento', icon: 'shield' },
  { id: 'alertas', label: 'Alertas', icon: 'alert', badge: 7 },
  { id: 'historial', label: 'Historial', icon: 'history' },
];

function MetricCard({ label, value, suffix, change, tone = 'default', icon }: { label: string; value: string | number; suffix?: string; change: string; tone?: string; icon: IconName }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-top">
        <span className="metric-icon"><Icon name={icon} size={19} /></span>
        <span className={`change ${change.startsWith('+') ? 'positive' : change.startsWith('−') ? 'negative' : ''}`}>{change}</span>
      </div>
      <p>{label}</p>
      <strong>{value}<small>{suffix}</small></strong>
      <div className="mini-track"><span /></div>
    </article>
  );
}

function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`status-badge ${tone}`}><i />{children}</span>;
}

function TrendChart({ period }: { period: string }) {
  const paths: Record<string, string> = {
    '7 días': 'M0 130 C35 125 48 105 77 111 S120 85 151 92 S199 58 232 71 S279 44 310 52 S357 29 400 34',
    '30 días': 'M0 137 C31 136 56 110 82 117 S126 91 158 95 S201 72 237 74 S278 52 317 57 S365 31 400 37',
    '90 días': 'M0 148 C42 141 63 127 93 129 S141 112 174 107 S219 85 256 82 S304 58 341 55 S379 39 400 35',
  };
  return (
    <div className="trend-chart">
      <div className="chart-y"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
      <svg viewBox="0 0 400 170" preserveAspectRatio="none" role="img" aria-label="Evolución de la remediación">
        <line x1="0" y1="34" x2="400" y2="34" /><line x1="0" y1="75" x2="400" y2="75" /><line x1="0" y1="116" x2="400" y2="116" /><line x1="0" y1="157" x2="400" y2="157" />
        <path className="target-line" d="M0 43H400" />
        <path className="trend-shadow" d={`${paths[period]} L400 166 L0 166 Z`} />
        <path className="trend-line" d={paths[period]} />
        <circle cx="400" cy={period === '90 días' ? 35 : period === '7 días' ? 34 : 37} r="5" />
      </svg>
      <div className="chart-x"><span>01 Ago</span><span>08 Ago</span><span>15 Ago</span><span>22 Ago</span><span>Hoy</span></div>
    </div>
  );
}

function Donut({ value }: { value: number }) {
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ '--value': `${value * 3.6}deg` } as React.CSSProperties}>
        <div><strong>{value}%</strong><span>dentro de SLA</span></div>
      </div>
      <div className="donut-legend">
        <p><i className="ok" /><span>Cumple SLA</span><b>{value}%</b></p>
        <p><i className="warn" /><span>Próximo a vencer</span><b>8.4%</b></p>
        <p><i className="bad" /><span>Fuera de SLA</span><b>{(100 - value - 8.4).toFixed(1)}%</b></p>
      </div>
    </div>
  );
}

// ───────────── Mapa mundial por zonas ─────────────
type ZoneStat = { score: number; servers: number; findings: number; urgent: number; source: 'criticidad' | 'estimado' };

// Peso de cada nivel de criticidad (0 = Baja ... 100 = Crítica); coincide con los colores del mapa
const CRIT_WEIGHT: Record<string, number> = { baja: 0, media: 25, alta: 50, 'muy alta': 75, critica: 100 };
const normName = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// true: "count" son los hallazgos TOTALES del nivel (abiertos = count × (100 − % remediado)). false: ya son los abiertos.
const COUNT_IS_TOTAL = true;

function zoneRisk(r: { remediation: number; sla: number; criticality?: { name: string; value: number; count: number }[] }) {
  const open = (r.criticality ?? [])
    .filter((c) => normName(c.name) in CRIT_WEIGHT)
    .map((c) => ({ key: normName(c.name), w: CRIT_WEIGHT[normName(c.name)], n: COUNT_IS_TOTAL ? (c.count * (100 - c.value)) / 100 : c.count }));
  const total = open.reduce((a, x) => a + x.n, 0);
  if (total > 0) {
    return {
      score: Math.round(open.reduce((a, x) => a + x.w * x.n, 0) / total),
      urgent: Math.round(open.filter((x) => x.key === 'critica' || x.key === 'muy alta').reduce((a, x) => a + x.n, 0)),
      source: 'criticidad' as const,
    };
  }
  // Respaldo cuando no hay desglose por criticidad (datos de ejemplo)
  const raw = ((100 - r.remediation) * 0.7 + (100 - r.sla) * 0.3 - 8) * 3.2;
  return { score: Math.max(0, Math.min(100, Math.round(raw))), urgent: 0, source: 'estimado' as const };
}

const LEVELS = ['Baja', 'Media', 'Alta', 'Muy alta', 'Crítica'];
const riskLabel = (score: number) => LEVELS[Math.min(4, Math.max(0, Math.round(score / 25)))];
// Degradado continuo azul → verde → amarillo → naranja → rojo (como la imagen de referencia)
const colorStops: [number, [number, number, number]][] = [
  [0, [30, 144, 255]],
  [25, [46, 204, 113]],
  [50, [241, 220, 70]],
  [75, [245, 150, 30]],
  [100, [229, 38, 38]],
];
function riskColor(score: number) {
  const s = Math.max(0, Math.min(100, score));
  for (let i = 1; i < colorStops.length; i++) {
    const [b, cb] = colorStops[i];
    if (s <= b) {
      const [a, ca] = colorStops[i - 1];
      const t = (s - a) / (b - a);
      const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return 'rgb(229, 38, 38)';
}

// Geometría: proyección equirectangular recortada de 84°N a 58°S (sin Antártida), igual que la referencia
const MAP_W = 1000;
const LAT_TOP = 84;
const LAT_BOTTOM = -58;
const MAP_H = Math.round((MAP_W * (LAT_TOP - LAT_BOTTOM)) / 360);
const projection = geoEquirectangular().fitSize([MAP_W, MAP_H], {
  type: 'MultiPoint',
  coordinates: [[-180, LAT_TOP], [180, LAT_TOP], [180, LAT_BOTTOM], [-180, LAT_BOTTOM]],
});
const yOf = (lat: number) => projection([0, lat])?.[1] ?? 0;
const off = (lat: number) => Math.min(1, Math.max(0, yOf(lat) / MAP_H));
const worldTopology = worldData as unknown as Topology;
const landPath = geoPath(projection)(feature(worldTopology, worldTopology.objects.land as GeometryCollection)) ?? '';

// Zonas por latitud. Si tus regiones se definen distinto, ajusta aquí.
const ZONES = [
  { name: 'Norte', hi: LAT_TOP, lo: 23.5 },
  { name: 'Centro', hi: 23.5, lo: -23.5 },
  { name: 'Sur', hi: -23.5, lo: LAT_BOTTOM },
];
const zoneAt = (lat: number) => (lat > 23.5 ? 'Norte' : lat < -23.5 ? 'Sur' : 'Centro');
const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
function scoreAtLat(lat: number, s: Record<string, number>) {
  const B = 8; // grados de transición entre regiones (menor = límite más marcado)
  if (lat >= 23.5 + B) return s.Norte;
  if (lat >= 23.5 - B) return s.Centro + (s.Norte - s.Centro) * smooth((lat - (23.5 - B)) / (2 * B));
  if (lat >= -23.5 + B) return s.Centro;
  if (lat >= -23.5 - B) return s.Sur + (s.Centro - s.Sur) * smooth((lat - (-23.5 - B)) / (2 * B));
  return s.Sur;
}

// Velo suave que aclara todo lo que NO es la región seleccionada
function dimStopsFor(zoneName: string): [number, number][] {
  const z = ZONES.find((x) => x.name === zoneName);
  if (!z) return [];
  const f = 5;
  const a = 0.62;
  const topOpen = z.hi >= LAT_TOP;
  const botOpen = z.lo <= LAT_BOTTOM;
  return [
    [0, topOpen ? 0 : a],
    [off(Math.min(LAT_TOP, z.hi + f)), topOpen ? 0 : a],
    [off(z.hi - f), 0],
    [off(z.lo + f), 0],
    [off(Math.max(LAT_BOTTOM, z.lo - f)), botOpen ? 0 : a],
    [1, botOpen ? 0 : a],
  ];
}

function WorldRiskMap({ region, stats, onSelect }: { region: string; stats: Record<string, ZoneStat>; onSelect: (zone: string) => void }) {
  const [hover, setHover] = useState<{ zone: string; x: number; y: number; w: number } | null>(null);
  const scores = { Norte: stats.Norte?.score ?? 50, Centro: stats.Centro?.score ?? 50, Sur: stats.Sur?.score ?? 50 };

  const gradStops = Array.from({ length: 49 }, (_, i) => {
    const lat = Math.max(LAT_BOTTOM, LAT_TOP - i * 3);
    return { offset: off(lat), color: riskColor(scoreAtLat(lat, scores)) };
  });
  const dimStops = region !== 'Todas' ? dimStopsFor(region) : [];

  const zoneFromEvent = (e: React.MouseEvent<SVGPathElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    const lat = projection.invert?.([p.x, p.y])?.[1];
    return lat === undefined ? null : zoneAt(lat);
  };
  const onMove = (e: React.MouseEvent<SVGPathElement>) => {
    const zone = zoneFromEvent(e);
    const stage = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
    if (zone && stage) setHover({ zone, x: e.clientX - stage.left, y: e.clientY - stage.top, w: stage.width });
  };

  const ranked = Object.entries(stats).sort((a, b) => b[1].score - a[1].score);
  const hovered = hover ? stats[hover.zone] : undefined;

  return (
    <div className="geo-layout">
      <div className="geo-stage">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa mundial de riesgo por región">
          <defs>
            <linearGradient id="geo-risk" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={MAP_H}>
              {gradStops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
            </linearGradient>
            <linearGradient id="geo-dim" x1="0" y1="0" x2="0" y2="1">
              {dimStops.map(([o, a], i) => <stop key={i} className="geo-dim-stop" offset={o} stopOpacity={a} />)}
            </linearGradient>
          </defs>
          <path
            className="geo-land"
            d={landPath}
            fill="url(#geo-risk)"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => { const zone = zoneFromEvent(e); if (zone) onSelect(zone); }}
          />
          {dimStops.length > 0 && <path d={landPath} fill="url(#geo-dim)" pointerEvents="none" />}
        </svg>
        <div className="geo-legend">
          <div className="geo-legend-scale"><i className="geo-legend-bar" /><div>{LEVELS.map((l) => <span key={l}>{l}</span>)}</div></div>
          <small>Criticidad de hallazgos abiertos</small>
        </div>
        {hover && (
          <div className="geo-tooltip" style={{ left: hover.x, top: hover.y, transform: hover.x > hover.w * 0.62 ? 'translate(calc(-100% - 12px), 12px)' : 'translate(12px, 12px)' }}>
            <b>Región {hover.zone}</b>
            <span>{hovered ? `Criticidad ${riskLabel(hovered.score)} · ${hovered.score}/100` : 'Sin datos'}</span>
            {hovered && <span>{hovered.source === 'criticidad' ? `${hovered.urgent.toLocaleString('es-MX')} abiertos críticos y muy altos` : 'Estimado por remediación y SLA'}</span>}
          </div>
        )}
      </div>
      <div className="country-list">
        <p>RIESGO POR REGIÓN</p>
        {ranked.map(([zone, s]) => (
          <button key={zone} className={region === zone ? 'active' : ''} onClick={() => onSelect(zone)} aria-label={`Abrir detalle de región ${zone}`}>
            <i style={{ background: riskColor(s.score) }} />
            <span><b>Región {zone}</b><small>{riskLabel(s.score)} · {s.servers} servidores</small></span>
            <strong>{s.score}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────── Servidores y filtros ─────────────
type ServerItem = { id: string; os: string; region: string; country?: string; role: string; risk: string; findings: number; status: string; last: string };
type AlertItem = typeof mockAlerts[number];

type ServerFilters = { server: string; os: string; risk: string; status: string; minFindings: string; maxFindings: string };
const emptyFilters: ServerFilters = { server: '', os: '', risk: '', status: '', minFindings: '', maxFindings: '' };
const riskOrder = ['Crítico', 'Muy alto', 'Alto', 'Medio', 'Bajo'];

function applyServerFilters(servers: ServerItem[], region: string, query: string, f: ServerFilters) {
  const q = query.trim().toLowerCase();
  const srv = f.server.trim().toLowerCase();
  const st = f.status.trim().toLowerCase();
  const min = f.minFindings === '' ? -Infinity : Number(f.minFindings);
  const max = f.maxFindings === '' ? Infinity : Number(f.maxFindings);
  return servers.filter((s) =>
    (region === 'Todas' || s.region === region) &&
    (!q || `${s.id} ${s.os} ${s.role}`.toLowerCase().includes(q)) &&
    (!srv || `${s.id} ${s.role}`.toLowerCase().includes(srv)) &&
    (!f.os || s.os === f.os) &&
    (!f.risk || s.risk === f.risk) &&
    (!st || String(s.status).toLowerCase().includes(st)) &&
    s.findings >= min && s.findings <= max,
  );
}

function ServerTable({ servers, onSelect }: { servers: ServerItem[]; onSelect: (server: ServerItem) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Servidor</th><th>Sistema operativo</th><th>Región</th><th>Riesgo</th><th>Hallazgos</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {servers.map((server) => (
            <tr key={server.id} onClick={() => onSelect(server)}>
              <td><div className="server-cell"><span><Icon name="server" size={16} /></span><div><b>{server.id}</b><small>{server.role}</small></div></div></td>
              <td>{server.os}</td><td>{server.region}</td>
              <td><StatusBadge tone={server.risk === 'Crítico' ? 'critical' : server.risk === 'Muy alto' ? 'warning' : 'neutral'}>{server.risk}</StatusBadge></td>
              <td><b>{server.findings}</b></td><td>{server.status}</td>
              <td><button className="icon-button small" title={`Ver ${server.id}`} aria-label={`Ver ${server.id}`}><Icon name="chevron" size={17} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!servers.length && <div className="empty-state">No hay servidores que coincidan con los filtros.</div>}
    </div>
  );
}

// Convierte el mapa que se ve en pantalla en una imagen PNG para incrustarla en el PDF
async function captureMapPng(): Promise<{ dataUrl: string; width: number; height: number } | undefined> {
  const svg = document.querySelector('.geo-stage svg') as SVGSVGElement | null;
  if (!svg) return undefined;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelector('path[fill="url(#geo-dim)"]')?.remove(); // sin velo de "región seleccionada"
  const land = clone.querySelector('.geo-land');
  land?.setAttribute('stroke', 'rgba(255,255,255,0.55)');
  land?.setAttribute('stroke-width', '0.6');
  const vb = svg.viewBox.baseVal;
  const scale = 2;
  const width = Math.round(vb.width * scale);
  const height = Math.round(vb.height * scale);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('No se pudo cargar el mapa')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.fillStyle = '#bdf3f7';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/png'), width, height };
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function App() {
  const { data: live, status } = useBackendData();
  const regions = live?.regions ?? mockRegions;
  const servers = live?.servers ?? mockServers;
  const alerts = live?.alerts ?? mockAlerts;
  const [filters, setFilters] = useState<ServerFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [active, setActive] = useState('resumen');
  const [region, setRegion] = useState('Todas');
  const [period, setPeriod] = useState('30 días');
  const [query, setQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState('Todas');
  const [selectedServer, setSelectedServer] = useState<ServerItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<{ name: string; rows: number } | null>(null);
  const [darkMode, setDarkMode] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('femsa-theme') === 'dark');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [settings, setSettings] = useState({
    criticalAlerts: true,
    slaAlerts: true,
    exposureAlerts: false,
    autoRefresh: true,
    refreshRate: '5 minutos',
    criticalSla: '24',
    highSla: '72',
    maintenanceDay: 'Sábado',
    maintenanceTime: '02:00',
  });
  const data = regions[region as keyof typeof regions] ?? regions.Todas;
  const filteredAlerts = alertFilter === 'Todas' ? alerts : alerts.filter((alert) => alert.category === alertFilter);

 const zoneStats = useMemo(() => {
  const out: Record<string, ZoneStat> = {};
  ['Norte', 'Centro', 'Sur'].forEach((zone) => {
    const r = regions[zone as keyof typeof regions];
    if (r) out[zone] = { ...zoneRisk(r), servers: r.servers, findings: r.findings };
  });
  return out;
}, [regions]);
const topRiskRegion = Object.entries(zoneStats).sort((a, b) => b[1].score - a[1].score)[0]?.[0] ?? 'Todas';
const topRiskScore = zoneStats[topRiskRegion]?.score ?? 82;

const osOptions = useMemo(() => [...new Set(servers.map((s) => s.os))].sort(), [servers]);
const riskOptions = useMemo(() => [...new Set(servers.map((s) => s.risk))].sort((a, b) => riskOrder.indexOf(a) - riskOrder.indexOf(b)), [servers]);
const statusOptions = useMemo(() => [...new Set(servers.map((s) => String(s.status)))].sort().slice(0, 50), [servers]);

const visibleServers = applyServerFilters(servers, region, query, filters);
const setFilter = (key: keyof ServerFilters, value: string) => setFilters((prev) => ({ ...prev, [key]: value }));
const clearFilters = () => { setFilters(emptyFilters); setRegion('Todas'); setQuery(''); };
const activeFilterLabels = [
  region !== 'Todas' && `Región: ${region}`,
  query && `Búsqueda: ${query}`,
  filters.server && `Servidor: ${filters.server}`,
  filters.os && `Sistema operativo: ${filters.os}`,
  filters.risk && `Riesgo: ${filters.risk}`,
  (filters.minFindings || filters.maxFindings) && `Hallazgos: ${filters.minFindings || 0} a ${filters.maxFindings || '∞'}`,
  filters.status && `Estado: ${filters.status}`,
].filter(Boolean) as string[];
const activeFilterCount = activeFilterLabels.length;

const handleExportPdf = async () => {
  try {
    const { exportReportPdf } = await import('./reportPdf');
    exportReportPdf({
      scope: region,
      metrics: { remediation: data.remediation, sla: data.sla, reopened: data.reopened, obsolete: data.obsolete, exposed: data.exposed, servers: data.servers, findings: data.findings },
      servers: visibleServers,
      alerts: alerts.filter((a) => region === 'Todas' || a.region === region),
      filters: activeFilterLabels,
    });
  } catch (error) {
    console.error(error);
    window.alert('No se pudo generar el PDF. Revisa la consola para más detalle.');
  }
};

const parseRiskLabel = (score: number) => riskLabel(score);

const handleExportExecutive = async () => {
  try {
    const [{ exportExecutivePdf }, map] = await Promise.all([import('./reportPdf'), captureMapPng()]);
    exportExecutivePdf({
      scope: region,
      metrics: { remediation: data.remediation, sla: data.sla, reopened: data.reopened, obsolete: data.obsolete, exposed: data.exposed, servers: data.servers, findings: data.findings },
      inProcess: live_.inProcess,
      criticality: criticality.map(({ name, value, count }) => ({ name, value, count })),
      platforms: live_.platforms ?? [],
      regionsCompare: Object.entries(regions).map(([name, r]) => ({ name, remediation: r.remediation, sla: r.sla, servers: r.servers, findings: r.findings })),
      zones: Object.entries(zoneStats)
        .map(([name, z]) => ({ name, score: z.score, label: parseRiskLabel(z.score), servers: z.servers }))
        .sort((a, b) => b.score - a.score),
      map,
      alerts: alerts.filter((a) => region === 'Todas' || a.region === region).slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    window.alert('No se pudo generar el resumen ejecutivo. Revisa la consola para más detalle.');
  }
};

// En Resumen exporta el resumen ejecutivo; en las demás pestañas, el reporte técnico
const handleExport = () => (active === 'resumen' ? handleExportExecutive() : handleExportPdf());

  const live_ = data as Partial<RegionData>;
  const criticality = useMemo(() => live_.criticality ?? [
    { name: 'Crítica', value: Math.round(data.remediation - 12), count: 18, tone: 'critical' },
    { name: 'Muy alta', value: Math.round(data.remediation - 7), count: 34, tone: 'high' },
    { name: 'Alta', value: Math.round(data.remediation - 2), count: 67, tone: 'medium' },
    { name: 'Media', value: Math.round(data.remediation + 5), count: 82, tone: 'low' },
    { name: 'Baja', value: Math.min(96, Math.round(data.remediation + 13)), count: 55, tone: 'safe' },
  ], [data]);

  const pageTitles: Record<string, string> = {
    resumen: 'Resumen ejecutivo',
    servidores: 'Servidores',
    cumplimiento: 'Cumplimiento',
    alertas: 'Alertas',
    historial: 'Historial',
    configuracion: 'Configuración',
  };
  const pageTitle = active === 'detalle-region' ? `Detalle regional · ${region}` : pageTitles[active] ?? 'Resumen ejecutivo';
  const goTo = (id: string) => { setActive(id); setSidebarOpen(false); };
  useEffect(() => {
    window.localStorage.setItem('femsa-theme', darkMode ? 'dark' : 'light');
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);
  const importCsv = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = String(reader.result).split(/\r?\n/).filter((line) => line.trim()).length;
      setCsvFile({ name: file.name, rows: Math.max(0, rows - 1) });
    };
    reader.readAsText(file);
  };

  return (
    <div className={`app-shell ${darkMode ? 'dark' : ''}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div><strong>FEMSA</strong><span>Gestión de parches</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><Icon name="close" /></button>
        </div>
        <nav className="main-nav" aria-label="Navegación principal">
          <p>OPERACIÓN</p>
          {navItems.map((item) => (
            <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => goTo(item.id)}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>{(item.id === 'alertas' ? (live?.alertCount ?? item.badge) : item.badge) ? <b>{item.id === 'alertas' ? (live?.alertCount ?? item.badge) : item.badge}</b> : null}
            </button>
          ))}
          <p>ADMINISTRACIÓN</p>
          <button onClick={() => goTo('configuracion')} className={active === 'configuracion' ? 'active' : ''}><Icon name="settings" size={19} /><span>Configuración</span></button>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-pressed={darkMode}>
            <Icon name={darkMode ? 'sun' : 'moon'} size={19} />
            <span>{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            <i><b /></i>
          </button>
        </nav>
        <div className="security-card">
          <div className="security-icon"><Icon name="shield" size={20} /></div>
          <strong>Postura de seguridad</strong>
          <p>El entorno se mantiene estable</p>
          <div><span style={{ width: `${Math.round(regions.Todas.remediation)}%` }} /></div>
          <small>{Math.round(regions.Todas.remediation)}% de cobertura global</small>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú" />}

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button>
          <div className="breadcrumbs"><span>Gestión de parches</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--panel)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths.chevron}</svg><strong>{pageTitle}</strong></div>
          <div className="top-actions">
            <label className="global-search"><Icon name="search" size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servidor..." /></label>
            <div className="notification-wrap">
              <button className="icon-button notification" onClick={() => setNotificationsOpen(!notificationsOpen)} title="Notificaciones" aria-label="Notificaciones"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--panel)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths.bell}</svg><i /></button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div><strong>Notificaciones</strong><button onClick={() => setNotificationsOpen(false)} aria-label="Cerrar"><Icon name="close" size={16} /></button></div>
                  {alerts.slice(0, 3).map((alert) => <button key={alert.title} onClick={() => { setActive('alertas'); setNotificationsOpen(false); }}><i className={alert.tone} /><span><b>{alert.title}</b><small>{alert.detail}</small></span></button>)}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {status !== 'online' && <div className={`api-banner ${status}`}>{status === 'loading' ? 'Conectando con el back end…' : 'Sin conexión con el back end: se muestran datos de ejemplo.'}</div>}
          <div className="page-heading">
            <div><p className="eyebrow">CENTRO DE OPERACIONES</p><h1>{pageTitle}</h1><span>Visibilidad y control del ciclo de remediación de infraestructura.</span></div>
            {!['configuracion', 'historial'].includes(active) && <div className="heading-actions">
              <label className="select-control"><span>Región</span><select value={region} onChange={(e) => setRegion(e.target.value)}>{Object.keys(regions).map((r) => <option key={r}>{r}</option>)}</select></label>
              <button className="secondary-button" onClick={handleExport}><Icon name="download" size={17} /> {active === 'resumen' ? 'Exportar resumen' : 'Exportar reporte'}</button>
              <button className="primary-button" onClick={() => setActive('servidores')}>Ver servidores <Icon name="arrow" size={17} /></button>
            </div>}
          </div>

          {active === 'resumen' && (
            <>
              <section className="risk-command">
                <div className="command-pulse"><span><Icon name="alert" size={21} /></span><i /><i /><i /></div>
                <div className="command-copy"><p>RIESGO PRIORITARIO</p><h2>{live?.urgentes ?? 7} activos críticos requieren intervención</h2></div>
                <div className="command-stat"><small>Índice de riesgo</small><strong>{topRiskScore}</strong><span>/100</span></div>
                <button onClick={() => { setRegion(topRiskRegion); setActive('servidores'); }}>Investigar ahora <Icon name="arrow" size={17} /></button>
              </section>

              <section className="metrics-grid">
                <MetricCard label="Tasa de remediación" value={data.remediation} suffix="%" change="+4.2%" tone="blue" icon="trend" />
                <MetricCard label="Cumplimiento de SLA" value={data.sla} suffix="%" change="+2.8%" tone="green" icon="shield" />
                <MetricCard label="Hallazgos reabiertos" value={data.reopened} change="−12%" tone="amber" icon="history" />
                <MetricCard label="Servidores obsoletos" value={data.obsolete} change="3 críticos" tone="red" icon="server" />
                <MetricCard label="Hallazgos explotables" value={data.exposed} change="7 nuevos" tone="purple" icon="alert" />
              </section>

              <section className="map-import-grid">
                <article className="panel-card map-panel">
                  <div className="panel-header">
                    <div><p className="eyebrow">INTELIGENCIA GEOGRÁFICA</p><h2>Mapa de exposición crítica</h2><span>Selecciona una región para actualizar el dashboard.</span></div>
                  </div>
                  <WorldRiskMap region={region} stats={zoneStats} onSelect={(zone) => { setRegion(zone); setActive('detalle-region'); }} />
                </article>

                <article className="csv-panel">
                  <div className="csv-top"><span><Icon name="upload" size={22} /></span><div><h2>Cargar datos CSV</h2></div></div>
                  <p className="csv-description">Actualiza el inventario y los hallazgos con una exportación de tu plataforma de seguridad.</p>
                  <label className={`drop-zone ${csvFile ? 'loaded' : ''}`}>
                    <input type="file" accept=".csv,text/csv" onChange={(event) => importCsv(event.target.files?.[0])} />
                    {csvFile ? (
                      <>
                        <span className="file-success"><Icon name="check" size={20} /></span>
                        <strong>{csvFile.name}</strong>
                        <small>{csvFile.rows.toLocaleString('es-MX')} registros detectados</small>
                        <b>Archivo listo para procesar</b>
                      </>
                    ) : (
                      <>
                        <span><Icon name="upload" size={20} /></span>
                        <strong>Arrastra tu CSV aquí</strong>
                        <b>Máximo 25 MB</b>
                      </>
                    )}
                  </label>
                  <div className="csv-footer"><Icon name="shield" size={15} /><span>Procesamiento seguro en el navegador</span>{csvFile && <button onClick={() => setCsvFile(null)}>Quitar</button>}</div>
                </article>
              </section>

              <section className="dashboard-grid">
                <article className="panel-card trend-panel">
                  <div className="panel-header"><div><p className="eyebrow">REMEDIACIÓN</p><h2>Evolución de cobertura</h2></div><div className="segmented">{['7 días', '30 días', '90 días'].map((p) => <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>)}</div></div>
                  <div className="chart-summary"><strong>{data.remediation}%</strong><span><Icon name="trend" size={15} /> 4.2% vs. período anterior</span><small>Meta 95%</small></div>
                  <TrendChart period={period} />
                </article>

                <article className="panel-card sla-panel">
                  <div className="panel-header"><div><p className="eyebrow">NIVEL DE SERVICIO</p><h2>Cumplimiento de SLA</h2></div><button className="icon-button" title="Más opciones" aria-label="Más opciones"><Icon name="more" /></button></div>
                  <Donut value={Math.round(data.sla)} />
                  <button className="text-button" onClick={() => setActive('cumplimiento')}>Ver análisis de cumplimiento <Icon name="arrow" size={15} /></button>
                </article>

                <article className="panel-card criticality-panel">
                  <div className="panel-header"><div><p className="eyebrow">ACTIVOS</p><h2>Remediación por criticidad</h2></div><span className="updated"><i /> Actualizado ahora</span></div>
                  <div className="bar-list">{criticality.map((item) => <div className="bar-row" key={`${region}-${item.name}`}><div><span>{item.name}</span><small>{item.count} hallazgos</small></div><div className="bar-track"><span className={item.tone} style={{ '--bar-width': `${item.value}%` } as React.CSSProperties} /></div><b>{item.value}%</b></div>)}</div>
                </article>

                <article className="panel-card activity-panel">
                  <div className="panel-header"><div><p className="eyebrow">EN TIEMPO REAL</p><h2>Actividad reciente</h2></div><button className="text-button" onClick={() => setActive('alertas')}>Ver todo</button></div>
                  <div className="activity-list">{alerts.slice(0, 4).map((alert) => <button key={alert.title} onClick={() => setActive('alertas')}><span className={`activity-dot ${alert.tone}`}><Icon name={alert.tone === 'success' ? 'check' : alert.tone === 'warning' ? 'clock' : 'alert'} size={15} /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div><time>{alert.time}</time></button>)}</div>
                </article>
              </section>
            </>
          )}

          {active === 'detalle-region' && (
            <>
              <section className="region-hero">
                <div className="region-hero-copy">
                  <button onClick={() => setActive('resumen')}><Icon name="arrow" size={15} /> Volver al resumen</button>
                  <p>REGIÓN {region.toUpperCase()}</p>
                  <h2>Postura operativa regional</h2>
                  <span>Concentrado de cobertura, riesgo y remediación para los activos administrados en {region}.</span>
                </div>
                <div className="region-score">
                  <small>Índice de remediación</small>
                  <strong>{data.remediation}<i>%</i></strong>
                  <span className={data.remediation >= 75 ? 'good' : data.remediation >= 68 ? 'medium' : 'critical'}>{data.remediation >= 75 ? 'Desempeño favorable' : data.remediation >= 68 ? 'Requiere seguimiento' : 'Intervención prioritaria'}</span>
                </div>
                <div className="region-hero-stats">
                  <div><span>Activos</span><b>{data.servers}</b></div>
                  <div><span>Hallazgos</span><b>{data.findings.toLocaleString('es-MX')}</b></div>
                  <div><span>Fuera de SLA</span><b>{Math.round(data.findings * (100 - data.sla) / 100)}</b></div>
                </div>
              </section>

              <section className="metrics-grid region-metrics">
                <MetricCard label="Remediación regional" value={data.remediation} suffix="%" change="+3.6%" tone="blue" icon="trend" />
                <MetricCard label="Cumplimiento SLA" value={data.sla} suffix="%" change="+1.9%" tone="green" icon="shield" />
                <MetricCard label="Hallazgos reabiertos" value={data.reopened} change="Prioridad media" tone="amber" icon="history" />
                <MetricCard label="Servidores obsoletos" value={data.obsolete} change="Revisión requerida" tone="red" icon="server" />
                <MetricCard label="Exposición crítica" value={data.exposed} change="Acción inmediata" tone="purple" icon="alert" />
              </section>

              <section className="regional-grid">
                <article className="panel-card">
                  <div className="panel-header"><div><p className="eyebrow">DISTRIBUCIÓN</p><h2>Hallazgos fuera de SLA por plataforma</h2></div><span className="updated"><i /> Datos regionales</span></div>
                  <div className="regional-bars">
                    {(live_.platforms?.length ? live_.platforms.map(([n, c]) => [n, Math.round(100 * c / Math.max(1, live_.platforms![0][1])), c]) : [
                      ['Windows Server', 84, Math.round(data.findings * .12)],
                      ['Linux Server', 68, Math.round(data.findings * .08)],
                      ['Unix / AIX', 46, Math.round(data.findings * .045)],
                      ['Hipervisores', 29, Math.round(data.findings * .025)],
                    ]).map(([name, width, count]) => (
                      <div key={name}><div><span>{name}</span><b>{count}</b></div><i><span style={{ '--bar-width': `${width}%` } as React.CSSProperties} /></i></div>
                    ))}
                  </div>
                </article>
                <article className="panel-card regional-status">
                  <div className="panel-header"><div><p className="eyebrow">ESTADO</p><h2>Ciclo de remediación</h2></div></div>
                  <div className="status-breakdown">
                    <div><span className="remediated"><Icon name="check" size={15} /></span><p><b>Remediados</b><small>Validación completada</small></p><strong>{Math.round(data.findings * data.remediation / 100)}</strong></div>
                    <div><span className="active"><Icon name="clock" size={15} /></span><p><b>En proceso</b><small>Dentro de ventana</small></p><strong>{live_.inProcess ?? Math.round(data.findings * .16)}</strong></div>
                    <div><span className="breached"><Icon name="alert" size={15} /></span><p><b>Fuera de SLA</b><small>Atención requerida</small></p><strong>{Math.round(data.findings * (100 - data.sla) / 100)}</strong></div>
                    <div><span className="reopened"><Icon name="history" size={15} /></span><p><b>Reabiertos</b><small>Validación fallida</small></p><strong>{data.reopened}</strong></div>
                  </div>
                </article>
              </section>

              <section className="panel-card full-panel regional-table">
                <div className="panel-header table-header"><div><p className="eyebrow">ACTIVOS PRIORITARIOS</p><h2>Servidores de la región {region}</h2><span>Ordenados por cantidad de hallazgos abiertos.</span></div><div className="table-actions"><label className="inline-search"><Icon name="search" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar servidor" /></label><button className="secondary-button" onClick={() => setActive('servidores')}>Ver inventario completo <Icon name="arrow" size={15} /></button></div></div>
                <ServerTable servers={applyServerFilters(servers, region, query, emptyFilters)} onSelect={(server) => { setPlanOpen(false); setSelectedServer(server); }} />
              </section>
            </>
          )}

         {active === 'servidores' && (
  <section className="panel-card full-panel">
    <div className="panel-header table-header">
      <div>
        <p className="eyebrow">INVENTARIO</p><h2>Servidores con hallazgos abiertos</h2>
        <span>{visibleServers.length} de {servers.length} servidores · {data.servers} activos en {region === 'Todas' ? 'todas las regiones' : `región ${region}`}</span>
      </div>
      <div className="table-actions">
        <label className="inline-search"><Icon name="search" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en inventario" /></label>
        <button className="secondary-button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen}>
          <Icon name="filter" size={16} /> Filtros{activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
        </button>
      </div>
    </div>
    {filtersOpen && (
      <div className="filter-panel">
        <label><span>Servidor</span><input value={filters.server} onChange={(e) => setFilter('server', e.target.value)} placeholder="ID o rol" /></label>
        <label><span>Sistema operativo</span>
          <select value={filters.os} onChange={(e) => setFilter('os', e.target.value)}><option value="">Todos</option>{osOptions.map((os) => <option key={os} value={os}>{os}</option>)}</select>
        </label>
        <label><span>Región</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>{Object.keys(regions).map((r) => <option key={r} value={r}>{r}</option>)}</select>
        </label>
        <label><span>Riesgo</span>
          <select value={filters.risk} onChange={(e) => setFilter('risk', e.target.value)}><option value="">Todos</option>{riskOptions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
        </label>
        <label><span>Hallazgos</span>
          <div className="filter-range">
            <input type="number" min={0} value={filters.minFindings} onChange={(e) => setFilter('minFindings', e.target.value)} placeholder="Mín." />
            <input type="number" min={0} value={filters.maxFindings} onChange={(e) => setFilter('maxFindings', e.target.value)} placeholder="Máx." />
          </div>
        </label>
        <label><span>Estado</span>
          <input list="status-options" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} placeholder="Ej. Reabierto" />
          <datalist id="status-options">{statusOptions.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <div className="filter-actions"><button className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div>
      </div>
    )}
    <ServerTable servers={visibleServers} onSelect={(server) => { setPlanOpen(false); setSelectedServer(server); }} />
  </section>
)}

          {active === 'cumplimiento' && (
            <section className="compliance-layout">
              <article className="panel-card compliance-hero"><div><p className="eyebrow">POSTURA ACTUAL</p><h2>{data.sla}% de cumplimiento</h2><p>El entorno está <b>2.8 puntos</b> por encima del período anterior. Aún existen {Math.round(data.findings * (100 - data.sla) / 100)} hallazgos que requieren atención.</p><button className="primary-button" onClick={() => setActive('servidores')}>Priorizar activos <Icon name="arrow" size={17} /></button></div><Donut value={Math.round(data.sla)} /></article>
              <article className="panel-card"><div className="panel-header"><div><p className="eyebrow">POR REGIÓN</p><h2>Desempeño comparativo</h2></div></div><div className="region-list">{Object.entries(regions).slice(1).map(([name, value]) => <button key={name} onClick={() => setRegion(name)}><span>{name}<small>{value.servers} servidores</small></span><b>{value.sla}%</b><Icon name="chevron" size={16} /></button>)}</div></article>
            </section>
          )}

          {active === 'alertas' && (
            <section className="panel-card full-panel">
              <div className="panel-header table-header"><div><p className="eyebrow">PRIORIZACIÓN</p><h2>Alertas activas</h2><span>Hallazgos no remediados en activos críticos y muy altos.</span></div><div className="alert-filters">{['Todas', 'Críticas', 'SLA', 'Expuestas'].map((f) => <button key={f} className={alertFilter === f ? 'active' : ''} onClick={() => setAlertFilter(f)}>{f}</button>)}</div></div>
              <div className="large-alert-list">
                {filteredAlerts.map((alert) => (
                  <button key={alert.title} onClick={() => setSelectedAlert(alert)} aria-label={`Abrir detalle de ${alert.title}`}>
                    <span className={`activity-dot ${alert.tone}`}><Icon name={alert.tone === 'success' ? 'check' : 'alert'} size={16} /></span>
                    <div><strong>{alert.title}</strong><p>{alert.detail}</p></div>
                    <StatusBadge tone={alert.tone === 'critical' ? 'critical' : alert.tone === 'warning' ? 'warning' : 'success'}>{alert.category}</StatusBadge>
                    <time>{alert.time}</time>
                    <Icon name="chevron" size={17} />
                  </button>
                ))}
                {!filteredAlerts.length && <div className="empty-state">No hay alertas para este filtro.</div>}
              </div>
            </section>
          )}

          {active === 'configuracion' && (
            <section className="settings-layout">
              <aside className="settings-index panel-card">
                <p className="eyebrow">PREFERENCIAS</p>
                <h2>Centro de configuración</h2>
                <nav>
                  <a href="#notifications"><Icon name="bell" size={17} /><span>Notificaciones</span><Icon name="chevron" size={14} /></a>
                  <a href="#sla-settings"><Icon name="clock" size={17} /><span>Políticas de SLA</span><Icon name="chevron" size={14} /></a>
                  <a href="#maintenance"><Icon name="settings" size={17} /><span>Mantenimiento</span><Icon name="chevron" size={14} /></a>
                  <a href="#data-settings"><Icon name="server" size={17} /><span>Datos y actualización</span><Icon name="chevron" size={14} /></a>
                </nav>
                <div className="settings-status"><span><Icon name="shield" size={18} /></span><div><b>Configuración protegida</b><small>Solo administradores pueden editar estos valores.</small></div></div>
              </aside>
              <div className="settings-content">
                <article className="panel-card settings-section" id="notifications">
                  <div className="settings-heading"><div><p className="eyebrow">ALERTAS</p><h2>Notificaciones operativas</h2><span>Define qué eventos generan una notificación para tu equipo.</span></div><Icon name="bell" size={20} /></div>
                  <div className="setting-rows">
                    <label><div><b>Alertas críticas</b><span>Activos con severidad 5 o exploit disponible.</span></div><input type="checkbox" checked={settings.criticalAlerts} onChange={(e) => setSettings({ ...settings, criticalAlerts: e.target.checked })} /><i /></label>
                    <label><div><b>Incumplimientos de SLA</b><span>Avisar antes y después del vencimiento.</span></div><input type="checkbox" checked={settings.slaAlerts} onChange={(e) => setSettings({ ...settings, slaAlerts: e.target.checked })} /><i /></label>
                    <label><div><b>Nueva exposición pública</b><span>Servicios detectados fuera de la red corporativa.</span></div><input type="checkbox" checked={settings.exposureAlerts} onChange={(e) => setSettings({ ...settings, exposureAlerts: e.target.checked })} /><i /></label>
                  </div>
                </article>
                <article className="panel-card settings-section" id="sla-settings">
                  <div className="settings-heading"><div><p className="eyebrow">POLÍTICAS</p><h2>Objetivos de remediación</h2><span>Tiempo máximo permitido antes de marcar un hallazgo fuera de SLA.</span></div><Icon name="clock" size={20} /></div>
                  <div className="settings-fields two-columns">
                    <label><span>Criticidad crítica</span><div><input type="number" value={settings.criticalSla} onChange={(e) => setSettings({ ...settings, criticalSla: e.target.value })} /><b>horas</b></div></label>
                    <label><span>Criticidad alta</span><div><input type="number" value={settings.highSla} onChange={(e) => setSettings({ ...settings, highSla: e.target.value })} /><b>horas</b></div></label>
                  </div>
                </article>
                <article className="panel-card settings-section" id="maintenance">
                  <div className="settings-heading"><div><p className="eyebrow">OPERACIÓN</p><h2>Ventana predeterminada</h2><span>Se utilizará al crear nuevos planes de remediación.</span></div><Icon name="settings" size={20} /></div>
                  <div className="settings-fields two-columns">
                    <label><span>Día</span><select value={settings.maintenanceDay} onChange={(e) => setSettings({ ...settings, maintenanceDay: e.target.value })}>{['Viernes', 'Sábado', 'Domingo'].map((day) => <option key={day}>{day}</option>)}</select></label>
                    <label><span>Hora de inicio</span><input type="time" value={settings.maintenanceTime} onChange={(e) => setSettings({ ...settings, maintenanceTime: e.target.value })} /></label>
                  </div>
                </article>
                <article className="panel-card settings-section" id="data-settings">
                  <div className="settings-heading"><div><p className="eyebrow">SINCRONIZACIÓN</p><h2>Actualización de datos</h2><span>Controla la frecuencia con la que se refresca el dashboard.</span></div><Icon name="server" size={20} /></div>
                  <div className="setting-rows"><label><div><b>Actualización automática</b><span>Consultar nuevos datos mientras la sesión esté activa.</span></div><input type="checkbox" checked={settings.autoRefresh} onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })} /><i /></label></div>
                  <div className="settings-fields"><label><span>Frecuencia</span><select disabled={!settings.autoRefresh} value={settings.refreshRate} onChange={(e) => setSettings({ ...settings, refreshRate: e.target.value })}>{['1 minuto', '5 minutos', '15 minutos', '30 minutos'].map((rate) => <option key={rate}>{rate}</option>)}</select></label></div>
                </article>
                <div className="settings-save"><span className={settingsSaved ? 'visible' : ''}><Icon name="check" size={15} /> Configuración guardada</span><button className="primary-button" onClick={() => { setSettingsSaved(true); window.setTimeout(() => setSettingsSaved(false), 2500); }}>Guardar cambios</button></div>
              </div>
            </section>
          )}
          
          {active === 'historial' && (
            <section className="panel-card placeholder-panel"><span><Icon name={active === 'historial' ? 'history' : 'settings'} size={28} /></span><h2>{pageTitle}</h2><p>Este módulo está listo para conectarse con la fuente de datos corporativa.</p><button className="secondary-button" onClick={() => setActive('resumen')}>Volver al resumen</button></section>
          )}
        </div>
      </main>

      {selectedServer && (
        <>
          <button className="drawer-scrim" onClick={() => { setSelectedServer(null); setPlanOpen(false); }} aria-label="Cerrar detalle" />
          <aside className="detail-drawer">
            <div className="drawer-header"><div><p className="eyebrow">DETALLE DEL ACTIVO</p><h2>{selectedServer.id}</h2></div><button className="icon-button" onClick={() => { setSelectedServer(null); setPlanOpen(false); }} aria-label="Cerrar detalle"><Icon name="close" /></button></div>
            <div className="server-identity"><span><Icon name="server" size={25} /></span><div><strong>{selectedServer.os}</strong><p>{selectedServer.role} · Región {selectedServer.region}</p></div></div>
            <div className="drawer-stats"><div><span>Riesgo</span><StatusBadge tone={selectedServer.risk === 'Crítico' ? 'critical' : 'warning'}>{selectedServer.risk}</StatusBadge></div><div><span>Hallazgos abiertos</span><strong>{selectedServer.findings}</strong></div></div>
            <h3>Estado de remediación</h3>
            <div className="remediation-steps"><div className="done"><i><Icon name="check" size={13} /></i><span><b>Detección completada</b><small>Hoy, 08:21</small></span></div><div className="done"><i><Icon name="check" size={13} /></i><span><b>Parche asignado</b><small>Hoy, 09:05</small></span></div><div className="current"><i><Icon name="clock" size={13} /></i><span><b>Pendiente de ventana</b><small>Programado: 23 Ago, 02:00</small></span></div></div>
            <div className="drawer-note"><Icon name="alert" size={18} /><p><b>Atención requerida</b><span>{selectedServer.status}. Revisa la ventana de mantenimiento asignada.</span></p></div>
            {planOpen && (
              <div className="remediation-plan">
                <div className="plan-heading"><span><Icon name="shield" size={17} /></span><div><strong>Plan de remediación</strong><small>PR-MX-2408 · Prioridad crítica</small></div></div>
                <div className="plan-progress"><div><span>Progreso</span><b>40%</b></div><i><span /></i></div>
                <ol>
                  <li className="completed"><i><Icon name="check" size={12} /></i><div><b>Validar compatibilidad</b><span>Completado por Infraestructura</span></div></li>
                  <li className="current"><i>2</i><div><b>Respaldar configuración</b><span>Responsable: Carlos R. · Hoy, 22:00</span></div></li>
                  <li><i>3</i><div><b>Aplicar actualización</b><span>Ventana: 23 Ago, 02:00–03:00</span></div></li>
                  <li><i>4</i><div><b>Validar y cerrar</b><span>Escaneo posterior automático</span></div></li>
                </ol>
                <div className="plan-meta"><span>Propietario</span><b>Equipo Windows MX</b><span>Impacto esperado</span><b>Reinicio requerido</b></div>
              </div>
            )}
            <button className={`primary-button wide ${planOpen ? 'plan-active' : ''}`} onClick={() => setPlanOpen(!planOpen)}>
              {planOpen ? 'Ocultar plan de remediación' : 'Abrir plan de remediación'} <Icon name={planOpen ? 'close' : 'arrow'} size={17} />
            </button>
            <p className="last-update">Última actualización: {selectedServer.last}</p>
          </aside>
        </>
      )}

      {selectedAlert && (
        <>
          <button className="drawer-scrim" onClick={() => setSelectedAlert(null)} aria-label="Cerrar detalle de alerta" />
          <aside className="detail-drawer alert-drawer">
            <div className="drawer-header"><div><p className="eyebrow">DETALLE DE ALERTA</p><h2>{selectedAlert.title}</h2></div><button className="icon-button" onClick={() => setSelectedAlert(null)} aria-label="Cerrar detalle"><Icon name="close" /></button></div>
            <div className={`alert-hero ${selectedAlert.tone}`}>
              <span><Icon name={selectedAlert.tone === 'success' ? 'check' : 'alert'} size={24} /></span>
              <div><StatusBadge tone={selectedAlert.tone === 'critical' ? 'critical' : selectedAlert.tone === 'warning' ? 'warning' : 'success'}>{selectedAlert.category}</StatusBadge><p>{selectedAlert.detail}</p></div>
            </div>
            <div className="alert-data">
              <div><span>Activo</span><b>{selectedAlert.server}</b></div>
              <div><span>Región</span><b>{selectedAlert.region}</b></div>
              <div><span>Detectado</span><b>{selectedAlert.detected}</b></div>
              <div><span>Estado</span><b>{selectedAlert.tone === 'success' ? 'Resuelta' : 'Requiere atención'}</b></div>
            </div>
            <div className="recommendation"><span><Icon name="shield" size={18} /></span><div><b>Acción recomendada</b><p>{selectedAlert.recommendation}</p></div></div>
            <h3>Evidencia relacionada</h3>
            <div className="evidence-list"><p><Icon name="clock" size={15} /><span>Último escaneo</span><b>{selectedAlert.detected}</b></p><p><Icon name="server" size={15} /><span>Fuente</span><b>Vulnerability Manager</b></p><p><Icon name="alert" size={15} /><span>Severidad</span><b>{selectedAlert.tone === 'critical' ? '5 · Crítica' : selectedAlert.tone === 'warning' ? '3 · Media' : 'Cerrada'}</b></p></div>
            <button className="primary-button wide" onClick={() => { setSelectedAlert(null); setActive('servidores'); setQuery(selectedAlert.server); }}>Ver activo relacionado <Icon name="arrow" size={17} /></button>
          </aside>
        </>
      )}
    </div>
  );
}