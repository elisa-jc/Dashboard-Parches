// Capa de comunicación con el back end FastAPI (prefijo /api/v1).
// Si el back end no responde, la app sigue funcionando con los datos de ejemplo del diseño.

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
const API = `${API_BASE}/api/v1`;

// El diseño usa Todas / Norte / Centro / Sur; el back end usa TODOS / REGION_NORTH / REGION_CENTRAL / REGION_SOUTH
export const REGION_API: Record<string, string> = { Todas: 'TODOS', Norte: 'REGION_NORTH', Centro: 'REGION_CENTRAL', Sur: 'REGION_SOUTH' };
export const REGION_UI: Record<string, string> = { TODOS: 'Todas', REGION_NORTH: 'Norte', REGION_CENTRAL: 'Centro', REGION_SOUTH: 'Sur' };

export const exportUrl = (regionUi: string) => `${API}/export/prioridad.csv?region=${REGION_API[regionUi] ?? 'TODOS'}`;

async function get<T>(ruta: string, params: Record<string, string | number> = {}): Promise<T> {
  const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const r = await fetch(`${API}${ruta}${q ? `?${q}` : ''}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${ruta}`);
  return r.json() as Promise<T>;
}

// ---------- Tipos: solo los campos que la interfaz usa de cada respuesta del back end ----------
type Kpis = { servidores: number; hallazgos_totales: number; tasa_remediacion: number; cumplimiento_sla: number;
              hallazgos_reabiertos: number; servidores_obsoletos: number; hallazgos_explotables: number };
type Resumen = { kpis: Kpis; remediacion_por_criticidad: { criticidad: string; hallazgos: number; porcentaje_remediado: number }[] };
type Serie = { nombre: string; valor: number }[];
type Detalle = { fuera_sla_por_so: Serie; hallazgos_por_estado: Serie };
type ServidorPrioridad = { serverid: string; regiongroup: string; osfamily: string; functionalrole: string; hallazgos_abiertos: number;
                           prioridad: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'; motivo_principal: string; environment: string };
type Prioridad = { urgentes: number; servidores: ServidorPrioridad[] };
type AlertaApi = { findingid: string; serverid: string; regiongroup: string; osfamily: string; exposurecategory: string;
                   severity: number; motivo: string; accion_sugerida: string };
type Alertas = { conteo: Record<string, number>; alertas: AlertaApi[] };

// ---------- Tipos que usa el diseño ----------
export type Criticality = { name: string; value: number; count: number; tone: string };
export type RegionData = { remediation: number; sla: number; reopened: number; obsolete: number; exposed: number; servers: number; findings: number;
                           criticality?: Criticality[]; platforms?: [string, number][]; inProcess?: number };
export type ServerRow = { id: string; os: string; region: string; role: string; risk: string; findings: number; status: string; last: string };
export type AlertRow = { time: string; title: string; detail: string; tone: string; category: string; server: string; region: string; detected: string; recommendation: string };
export type LiveData = { regions: Record<string, RegionData>; servers: ServerRow[]; alerts: AlertRow[]; alertCount: number; urgentes: number };

// ---------- Traducciones de los valores del dataset a texto del diseño ----------
const SO: Record<string, string> = { WINDOWS_SERVER: 'Windows Server', LINUX_SERVER: 'Linux Server', UNIX_SERVER: 'Unix / AIX', HYPERVISOR: 'Hipervisor', OTHER_SERVER: 'Otro servidor', 'OTHER SERVER': 'Otro servidor' };
const ROL: Record<string, string> = { DATABASE: 'Base de datos', DIRECTORY: 'Directorio', ERP_ANALYTICS: 'ERP Analítica', ERP_GOVERNANCE: 'ERP Gobierno', ERP_PRODUCTION: 'ERP Producción',
  FILE_TRANSFER: 'Transferencia', GENERAL_INFRASTRUCTURE: 'Infraestructura general', SECURITY: 'Seguridad', WEB_APPLICATION: 'Aplicación web' };
const CRIT: Record<string, [string, string]> = { CRITICAL: ['Crítica', 'critical'], VERY_HIGH: ['Muy alta', 'high'], HIGH: ['Alta', 'medium'], MEDIUM: ['Media', 'low'], LOW: ['Baja', 'safe'] };
const RIESGO: Record<string, string> = { URGENTE: 'Crítico', ALTA: 'Muy alto', MEDIA: 'Alto', BAJA: 'Medio' };
const TITULO: Record<string, string> = { 'Fuera de SLA': 'SLA excedido', Reabierto: 'Hallazgo reabierto', Obsoleto: 'Sistema fuera de soporte', Explotable: 'Vulnerabilidad explotable' };
const expuesto = (e: string) => e.replace(/[\s_]/g, '').toUpperCase() === 'INTERNETEXPOSED';

function adaptarAlerta(a: AlertaApi): AlertRow {
  const category = a.motivo === 'Fuera de SLA' ? 'SLA' : expuesto(a.exposurecategory) ? 'Expuestas' : 'Críticas';
  return {
    time: `Sev. ${a.severity}`, title: TITULO[a.motivo] ?? a.motivo, detail: `${a.serverid} · severidad ${a.severity}`,
    tone: a.severity >= 4 || a.motivo === 'Fuera de SLA' ? 'critical' : 'warning', category, server: a.serverid,
    region: REGION_UI[a.regiongroup] ?? a.regiongroup, detected: `Hallazgo ${a.findingid}`, recommendation: a.accion_sugerida,
  };
}

// ---------- Carga todo lo que necesita el diseño ----------
export async function loadLiveData(): Promise<LiveData> {
  const regionesApi = Object.entries(REGION_API); // [Todas, TODOS], [Norte, REGION_NORTH] ...
  const [resumenes, detalles, prioridad, alertas] = await Promise.all([
    Promise.all(regionesApi.map(([, api]) => get<Resumen>('/dashboard/resumen', { region: api }))),
    Promise.all(regionesApi.map(([, api]) => get<Detalle>('/dashboard/detalle', { region: api, limit: 1 }))),
    get<Prioridad>('/servidores/prioridad', { region: 'TODOS', limit: 250 }),
    get<Alertas>('/dashboard/alertas', { region: 'TODOS', limit: 50 }),
  ]);
  const regions: Record<string, RegionData> = {};
  regionesApi.forEach(([ui], i) => {
    const k = resumenes[i].kpis;
    regions[ui] = { remediation: k.tasa_remediacion, sla: k.cumplimiento_sla, reopened: k.hallazgos_reabiertos,
                    obsolete: k.servidores_obsoletos, exposed: k.hallazgos_explotables, servers: k.servidores, findings: k.hallazgos_totales,
                    criticality: resumenes[i].remediacion_por_criticidad.map((c) => ({ name: CRIT[c.criticidad]?.[0] ?? c.criticidad, value: Math.round(c.porcentaje_remediado),
                      count: c.hallazgos, tone: CRIT[c.criticidad]?.[1] ?? 'low' })),
                    platforms: detalles[i].fuera_sla_por_so.map((x) => [SO[x.nombre] ?? x.nombre, x.valor] as [string, number]),
                    inProcess: detalles[i].hallazgos_por_estado.filter((x) => ['ACTIVE', 'NEW'].includes(x.nombre)).reduce((a, x) => a + x.valor, 0) };
  });
  const servers: ServerRow[] = prioridad.servidores.map((s) => ({
    id: s.serverid, os: SO[s.osfamily] ?? s.osfamily, region: REGION_UI[s.regiongroup] ?? s.regiongroup, role: ROL[s.functionalrole] ?? s.functionalrole,
    risk: RIESGO[s.prioridad] ?? 'Medio', findings: s.hallazgos_abiertos, status: s.motivo_principal, last: `Ambiente ${s.environment}`,
  }));
  return { regions, servers, alerts: alertas.alertas.map(adaptarAlerta), alertCount: alertas.conteo.TODAS ?? alertas.alertas.length, urgentes: prioridad.urgentes };
}

