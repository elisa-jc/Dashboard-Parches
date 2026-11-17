import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { exportUrl, type RegionData } from './api';
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

const mapZones = [
  {
    name: 'Norte',
    risk: 'Bajo',
    score: 34,
    color: '#2c9b68',
    path: 'M13 20L19.5 15.2L26 13.8L42.3 15.6L56.3 15.2L70.4 16.8L92.1 17.3L97.5 16.3L106.2 18.4L102.9 22.8L93.2 27.1L95.3 29.2L106.2 31.4L109.4 34.7L110.5 28.2L111.6 23.8L119.2 24.9L125.7 26L128.9 30.3L134.3 34.7L130 36.8L123.5 36.8L125.7 41.2L130 41.2L123.5 43.3L119.2 44.4L119.2 45.8L114.8 47.1L112.7 50.9L112.7 53.1L107.2 57.4L108.3 61.7L107.8 63.7L106.2 61.7L105.1 59L102.9 58.8L98.6 58.5L97.5 59.6L93.2 59L89.9 60.9L89.4 63.9L89.3 65.5L79 65.5L76.9 63.4L73.7 59.6L70.6 56.5L70.7 58.5L72.8 61.2L75.8 65L76.1 65.5L75.8 65.5L74.8 64.5L73.1 62.3L71 60.1L69.9 58.5L68.3 55.8L66.6 54.2L64.4 53.6L62.3 50L60.7 47.3L60.3 44.4L60.7 40.9L59.9 38.6L61.7 37.9L59.6 36.8L56.3 34.7L54.2 32L49.8 29.2L46.6 27.6L43.3 26.2L36.8 25.5L32.5 26.5L30.3 28.2L23.8 29.8L18.4 31.6L21.7 27.6L19.5 26L16.3 23.8L15.2 21.7Z M115.9 6.5L123.5 3.3L151.7 1.1L173.3 2.2L175.5 8.7L171.2 15.2L160.3 17.3L149.5 26L143 24.9L138.7 20.6L135.4 15.2L130 8.7Z M184.7 49.1L185.3 44.4L193.4 43.9L193.7 41.2L190.1 38.6L193.4 38.1L196.6 35.9L199.3 35.2L204.2 32.7L204.2 29.2L206.4 28.5L206.4 32L210.2 32.5L216.7 31.6L217.7 29.2L221 26.6L226.4 26L219.9 26L218.3 24.4L222.1 20.6L218.3 20.6L214 23.3L215 26L212.9 29.2L209.1 30.9L206.9 27.1L200.4 27.1L200.4 23.8L210.2 17.9L215.6 15.2L223.2 14.1L230.7 15.7L239.4 18.4L231.8 19.3L238.9 21.1L242.7 19.5L252.4 16.8L260 16.3L268.7 16.3L274.1 12.1L281.7 11.9L289.3 9.8L303.3 7L317.4 11.1L333.7 11.9L346.7 12.5L359.7 14.1L368.3 15.7L379.2 15.2L390 16.5L390 20.6L379.2 26L371.6 26.2L370.5 28.7L364.8 35.8L363.5 29.2L357.5 26.5L348.8 26.8L343.4 32.5L347.8 34.1L346.7 39L341.3 43.9L336.9 44.6L335.5 46.8L334.2 49.3L335.2 52.9L332 53.6L332 50.2L330.4 48.2L326.6 47.7L327.2 50.9L323.9 50.7L326.1 56.3L327.2 58.5L325 62.8L322.1 65.5L269.2 65.5L269.2 65.5L267 63.5L261.6 63.9L256.8 63L256.2 61.7L250.8 60.9L249.2 58.5L247.5 58.8L249.4 62.2L250.9 64.7L253.5 64.8L255.9 62.7L258.4 65.5L258.4 65.5L235.9 65.5L232.9 60.7L232 57.1L233 55.2L234 52.5L234.2 51.2L230.7 51.9L228 51.7L225.3 51.1L223.7 49.3L223.5 47.7L226.4 46.6L228.6 46.4L232.9 45.5L236.2 46.6L240 46L240.1 44.4L235.6 42.3L233.5 42L231.3 41.2L229.7 40.6L228 41.7L226.1 42.8L225.3 44.4L225.1 46L223.2 47.1L221 47.1L219.4 47.7L220.5 49.8L218.3 51.3L216.7 48.2L216.1 46L212.3 43.9L209.8 41.7L208.3 42.3L208.5 43.3L212.3 45.7L215 47.4L212.3 49.8L212 47.7L208 45.5L206.4 43.9L204.5 42.9L202 44.2L198.3 44.1L198.3 45.5L195.9 46.6L194.5 49L192.8 51.2L189.1 52L188.2 51.1L185.5 50.9Z M188.6 52.2L193.9 52.9L198.3 51.1L205.8 50.7L206.9 53.1L206 54.7L211.2 56L216.7 55.7L216.7 58L222.1 56.7L227.5 57.2L230 57.1L230.2 58.7L231.8 61.2L234.2 65.5L178.8 65.5L180.9 61.2L184.2 59L184.7 56.3L187.6 54.2Z M189 36.8L196.6 35.8L196.8 33.8L194.8 32.5L192.8 30.3L192.8 28.6L191.8 27.5L189.6 27.5L188.5 29.8L189.6 31.4L191.8 32L190.1 33.4L189.6 34.9L191.2 35.4Z M184.2 35L188.5 34.7L188.5 32L186.3 31.2L184.2 32.5Z M169 20L171.2 19L177.7 19.2L179.8 20.6L175.5 22.2L171.2 21.9Z M335.8 57.1L338 54.2L341.3 53.6L343.4 53.4L346.7 53.1L347.8 49.8L348.8 46.6L346.7 46.6L346.4 49.3L343.4 50.9L342.3 52.2L339.1 52.5L336.9 53.6L335.5 55.2Z M346.7 45.5L348.3 41.7L352.6 43.9L349.9 45.5L347.8 45.7Z M108.3 11.4L117 14.1L121.3 15.2L127.8 18.4L124.6 22.8L117 22.8L110.5 21.1L110.5 17.3L101.8 15.2L99.7 11.9Z M67.2 13L81.3 11.9L86.7 15.2L75.8 16.8L68.3 16.3Z M97.5 8.1L113.7 6.5L127.8 2.2L102.9 1.1L97.5 3.3Z',
    label: [282, 37],
  },
  {
    name: 'Centro',
    risk: 'Atención',
    score: 61,
    color: '#e29a28',
    path: 'M89.3 65.5L89.2 67.2L91 70.4L92.6 71.3L96.4 70.8L97 68.3L100.8 67.7L100.2 71L99.7 73.7L104 73.9L104.8 74.8L104.5 79.1L106.5 81.3L108.9 80.7L111 81.8L110.5 83.2L108.3 82.9L105.2 82.1L102.2 80.2L100.2 76.9L96.4 75.8L93.2 73.7L90.5 74L87.8 72.9L84.5 71.5L81 69.3L80.5 67.2L79 65.5L76.1 65.5L76.4 66.1L75.8 65.5Z M111.3 81.6L113.2 79.3L117.8 77.6L121.3 79.5L127.8 79.4L130 81.8L133.3 84.5L138.7 86.1L140.8 89.4L143 91.9L146.8 93.7L151.7 94L157.1 96.6L157.1 100.8L154.4 104L152.8 109.4L150.6 115.4L147.3 115.9L146.6 116.5L118.7 116.5L118.9 114.3L118.8 110.8L113.2 107.8L111 104L109.4 99.7L107 97.3L108.1 94.8L107.4 93.2L108.3 90.5L109.6 89.2L111.3 86.9L111 84.5Z M322.1 65.5L321.8 65.9L314.2 68.3L309.8 69.3L312.5 74.8L313.1 78L309.8 81.3L308.5 81.6L306.6 79.6L303.9 76.4L303.3 82.3L307.1 89.5L303.9 87.2L301.7 82.3L301.2 76.9L300.6 73.1L297.2 73.7L296.8 69.9L294.7 67.7L292.5 67.2L289.3 67.7L288.7 69.3L286.5 71L282.2 74.2L281.7 80.2L279 82.3L277.3 79.6L274.1 72.6L273.9 68.3L270.8 68.5L269.2 65.5L269.2 65.5L258.4 65.5L258.4 65.5L259.8 66.6L256.8 70.4L251.3 73.4L243.7 77.1L241.9 77.1L241.3 73.7L237.2 67.7L235.9 65.5Z M234.2 65.5L235.1 67.2L236.7 71.5L238.3 74.2L241.6 77.5L242.7 79.6L250.2 78.2L250.2 79.7L247 85.6L242.7 89.9L239.4 93.2L237.2 96.4L237.8 99.7L238.9 102.9L238.9 107.2L232.9 112.7L233.4 116.5L210.9 116.5L210.7 114.8L208 110L209.6 104L208.5 97.5L204.8 92.1L205.3 87.2L204.2 86.1L200.4 84.7L197.2 84.2L192.8 85.9L190.1 85.4L186.9 86.2L183.1 83.6L180.4 80.7L176.9 77.5L176.1 75.1L177.1 70.4L177.7 67.7L178.8 65.5Z M318 114.8L318.2 116.5L358.5 116.5L357.5 115.4L353.2 111.6L352.5 107.2L350.5 102.9L348.8 102.6L348.3 105.1L346.7 110L343.4 108.1L341.8 107L336.9 104L335.8 105.6L331.5 106.2L327.2 109.4L326.1 112.1L321.8 113.2Z M298.2 84.9L301.2 86.7L306.6 92.1L309.8 94.3L309.3 97.3L305.5 95.3L302.3 91Z M309.3 98L312 98L315.3 98L319 99.4L318.5 100.4L312 99.4L309.3 98.4Z M313.1 89.4L315.3 89L317.4 87.5L321.8 83.4L323.9 85.6L322.8 89.9L320.7 94.3L318.5 95.3L315.3 94.3L313.6 92.1Z M336.9 92.1L341.3 94.6L344.5 93.2L347.8 93.8L353.2 97L357.5 102.3L354.3 101.8L349.9 100.8L347.8 100.8L344.5 99.7L343.4 96.4L339.1 95.3Z M248.4 104L249.7 107.8L248.6 110.5L246.6 116.5L242.7 116.5L242.1 114.8L243.2 108.3L245.4 107.8L247 105.6Z M102.9 67.2L106.2 66L111.6 68.3L114.6 69.1L111.6 69.4L108.3 67.5L104 67.3Z M114.4 71.1L117 69.4L120.9 70.8L119.2 71.3L116.1 71.5Z M325 71L327.2 71.1L327.2 75.6L329.3 76.9L326.1 76.4L325 73.7Z',
    label: [217, 87],
  },
  {
    name: 'Sur',
    risk: 'Crítico',
    score: 82,
    color: '#e21f3d',
    path: 'M146.6 116.5L143 119.2L142.2 121.9L138.7 125.7L137.1 127.8L133.8 128.8L131.9 128L133 130.5L127.8 133.3L127.5 135.1L124.6 135.4L125.3 137.4L123.9 139.8L121.9 141.4L123.5 143L120.2 145.7L120.9 147.8L122.4 150.5L118.1 150.6L114.3 147.3L113.2 141.9L115.2 137.6L115.4 131.1L117.5 123.5L118.3 119.2L118.7 116.5Z M233.4 116.5L233.5 117L230.2 119.2L230.5 121.3L227.5 125.1L224.2 127.3L218.8 128L216.7 128.7L214.9 128L214.5 124.6L211.2 119.7L210.9 116.5Z M318.2 116.5L318.5 119.2L319.6 127.8L322.8 128.9L328.3 127.8L332.6 125.7L336.9 125.1L341.3 128.6L344.5 128.9L346.7 132.2L352.1 132.7L357.5 131.1L360.8 124.6L361.1 119.2L358.5 116.5Z M382.1 128.4L384 130.5L387.8 131.6L385.7 133.8L384.6 136L384 133.8L382.4 129.5Z M382.1 134.9L383.5 136.2L380.3 139.2L378.1 141.4L375.4 140.8L377 138.7L380.8 136Z M246.6 116.5L246.1 117.9L243.2 118.1L242.7 116.5Z',
    label: [222, 122],
  },
];

function WorldRiskMap({ region, onSelect }: { region: string; onSelect: (region: string) => void }) {
  return (
    <div className="risk-map-layout">
      <div className="map-stage">
        <div className="map-grid" />
        <svg viewBox="0 0 390 153" role="img" aria-label="Mapa mundial de riesgo por región">
          {mapZones.map((zone) => (
            <g
              key={zone.name}
              className={region !== 'Todas' && region !== zone.name ? 'muted' : ''}
              onClick={() => onSelect(zone.name)}
            >
              <path d={zone.path} fill={zone.color} />
              <text x={zone.label[0]} y={zone.label[1]} textAnchor="middle">{zone.name}</text>
              <text className="map-score" x={zone.label[0]} y={zone.label[1] + 15} textAnchor="middle">{zone.score}/100</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="zone-list">
        {mapZones.map((zone) => (
          <button key={zone.name} className={`zone-${zone.name.toLowerCase()} ${region === zone.name ? 'active' : ''}`} onClick={() => onSelect(zone.name)} aria-label={`Abrir detalle de la región ${zone.name}`}>
            <i style={{ background: zone.color }} />
            <span><b>{zone.name}</b><small>{zone.risk}</small></span>
            <strong>{zone.score}</strong>
            <Icon name="chevron" size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}

type ServerItem = typeof mockServers[number];
type AlertItem = typeof mockAlerts[number];

function ServerTable({ servers, region, query, onSelect }: { servers: ServerItem[]; region: string; query: string; onSelect: (server: ServerItem) => void }) {
  const filtered = servers.filter((server) => (region === 'Todas' || server.region === region) && `${server.id} ${server.os} ${server.role}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Servidor</th><th>Sistema operativo</th><th>Región</th><th>Riesgo</th><th>Hallazgos</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {filtered.map((server) => (
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
      {!filtered.length && <div className="empty-state">No hay servidores que coincidan con la búsqueda.</div>}
    </div>
  );
}

export default function App() {
  const { data: live, status } = useBackendData();
  const regions = live?.regions ?? mockRegions;
  const servers = live?.servers ?? mockServers;
  const alerts = live?.alerts ?? mockAlerts;
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
  const data = regions[region as keyof typeof regions];
  const filteredAlerts = alertFilter === 'Todas' ? alerts : alerts.filter((alert) => alert.category === alertFilter);

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
              <button className="secondary-button" onClick={() => window.open(exportUrl(region), '_blank')}><Icon name="download" size={17} /> Exportar</button>
              <button className="primary-button" onClick={() => setActive('servidores')}>Ver servidores <Icon name="arrow" size={17} /></button>
            </div>}
          </div>

          {active === 'resumen' && (
            <>
              <section className="risk-command">
                <div className="command-pulse"><span><Icon name="alert" size={21} /></span><i /><i /><i /></div>
                <div className="command-copy"><p>RIESGO PRIORITARIO</p><h2>{live?.urgentes ?? 7} activos críticos requieren intervención</h2></div>
                <div className="command-stat"><small>Índice de riesgo</small><strong>82</strong><span>/100</span></div>
                <button onClick={() => { setRegion('Sur'); setActive('servidores'); }}>Investigar ahora <Icon name="arrow" size={17} /></button>
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
                    <div><p className="eyebrow">INTELIGENCIA GEOGRÁFICA</p><h2>Mapa de exposición crítica</h2><span>Selecciona una zona para actualizar el dashboard.</span></div>
                    <div className="risk-scale"><span>Bajo</span><i /><i /><i /><span>Crítico</span></div>
                  </div>
                  <WorldRiskMap region={region} onSelect={(selectedRegion) => { setRegion(selectedRegion); setActive('detalle-region'); }} />
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
                <ServerTable servers={servers} region={region} query={query} onSelect={(server) => { setPlanOpen(false); setSelectedServer(server); }} />
              </section>
            </>
          )}

          {active === 'servidores' && (
            <section className="panel-card full-panel">
              <div className="panel-header table-header"><div><p className="eyebrow">INVENTARIO</p><h2>Servidores con hallazgos abiertos</h2><span>{data.servers} activos en la selección actual</span></div><div className="table-actions"><label className="inline-search"><Icon name="search" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en inventario" /></label><button className="secondary-button"><Icon name="filter" size={16} /> Filtros</button></div></div>
              <ServerTable servers={servers} region={region} query={query} onSelect={(server) => { setPlanOpen(false); setSelectedServer(server); }} />
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
