"""
Servicio de métricas - Gestión de Parches en Servidores (Reto FEMSA).

Convierte las dos tablas limpias (servidores y vulnerabilidades) en
indicadores listos para el auditor: KPIs, hallazgos en lenguaje natural
("el 41% de los servidores..."), cobertura por vulnerabilidad, SLA y una
lista priorizada de servidores urgentes por región.

IMPORTANTE: usa los nombres de columna reales de los CSV limpios
(sin guiones bajos): serverid, regiongroup, findingstatus, slastatus, etc.

v2 (coordinación con el frontend):
- SLA "próximo a vencer" calculado con ageband (regla configurable).
- Índice de riesgo 0-100 por región y global (antes era un valor fijo en el front).
- Alertas: filtro por estado (abiertas / resueltas) y conteo de resueltas.
- motivo_corto para la columna Estado (motivo_principal sigue existiendo).
- Carga de CSV (POST), historial real de KPIs y configuración editable
  (umbrales + perfil de usuario) guardados como JSON en la carpeta de datos.
"""
from __future__ import annotations

import io
import json
import os
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from app.repositories.base import BaseRepository
from app.services.preprocesamiento import preprocesar_excel, preprocesar_csv_unico


# ----------------------------------------------------------------------
# Constantes de negocio (ajustables sin tocar la lógica)
# ----------------------------------------------------------------------
REGIONES = ["REGION_NORTH", "REGION_CENTRAL", "REGION_SOUTH"]
CRITICIDAD = ["CRITICAL", "VERY_HIGH", "HIGH", "MEDIUM", "LOW"]
OBSOLETOS = ["EOL", "EOL_EOS"]
ANTIGUOS = ["AGE_91_180D", "AGE_GT180D"]  # hallazgos con más de 90 días
MOTIVOS = ["Fuera de SLA", "Reabierto", "Obsoleto", "Explotable"]  # orden = prioridad

ACCIONES = {
    "PATCH_OR_UPDATE": "Aplicar parche o actualización de seguridad",
    "VERSION_UPGRADE": "Actualizar versión del Sistema Operativo",
    "CONFIGURATION_CHANGE": "Ajustar parámetros de configuración",
    "GENERAL_REMEDIATION": "Remediación general requerida",
}

# Score de prioridad por servidor (puntos). Cada factor tiene un tope.
PESO_CRITICIDAD = {"CRITICAL": 5, "VERY_HIGH": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}

# ----------------------------------------------------------------------
# Orden editable de los 9 factores de riesgo (Configuración).
# La empresa NO define pesos: solo reordena la prioridad. La escala de
# puntos por posición es FIJA, así que SCORE_MAX queda en 116 y la
# escala 0-100 / los cortes de prioridad no se descalibran.
# ----------------------------------------------------------------------
FACTORES = ["criticidad", "expuesto", "obsolescencia", "severidad", "explotable",
            "malware", "fuera_sla", "reabierto", "antiguo"]
ESCALA = [20, 20, 15, 15, 15, 10, 10, 6, 5]  # puntos máximos según posición (1°..9°)
SCORE_MAX = sum(ESCALA)  # 116, constante


def pesos_desde_orden(orden: list[str]) -> dict[str, float]:
    """Convierte un orden de factores en pesos por unidad de cada contribución.

    m = ESCALA[posición del factor]. Con el orden por defecto produce
    exactamente el cálculo original: criticidad 4/nivel, expuesto 20,
    EOL 10, EOL_EOS 15, severidad 3/nivel, explotable 5 (tope 3),
    malware 10, fuera_sla 2 (tope 5), reabierto 2 (tope 3), antiguo 1 (tope 5).
    """
    m = {f: float(ESCALA[i]) for i, f in enumerate(orden)}
    return {
        "criticidad": m["criticidad"] / 5,   # x nivel (1-5)              -> máx m
        "expuesto": m["expuesto"],           # INTERNET_EXPOSED          -> máx m
        "eol": m["obsolescencia"] * 2 / 3,   # EOL (equivale a 2/3 de EOL_EOS)
        "eol_eos": m["obsolescencia"],       # EOL_EOS                   -> máx m
        "severidad": m["severidad"] / 5,     # x severidad máx (1-5)     -> máx m
        "explotable": m["explotable"] / 3,   # x explotable (tope 3)     -> máx m
        "malware": m["malware"],             # si tiene malware          -> máx m
        "fuera_sla": m["fuera_sla"] / 5,     # x fuera SLA (tope 5)      -> máx m
        "reabierto": m["reabierto"] / 3,     # x reabierto (tope 3)      -> máx m
        "antiguo": m["antiguo"] / 5,         # x antiguo (tope 5)        -> máx m
    }


# Valores por defecto de lo que ahora se puede editar desde la pantalla de Configuración.
CONFIG_DEFAULT = {
    "meta_remediacion": 95.0,
    "cortes_prioridad": {"URGENTE": 60, "ALTA": 40, "MEDIA": 25},
    # Un hallazgo ABIERTO y todavía dentro de SLA se considera "próximo a vencer"
    # si su antigüedad cae en estas bandas (el dataset no trae fechas exactas).
    "bandas_proximo_vencer": ["AGE_31_90D"],
    # Cortes del índice de riesgo regional (0-100) para colorear el mapa.
    "cortes_riesgo": {"ALTO": 60, "MEDIO": 40},
    # Orden de prioridad de los 9 factores (define los pesos según la escala fija).
    "orden_factores": list(FACTORES),
    "usuario": {"nombre": "Usuario", "rol": "Auditor de TI", "correo": ""},
}

REQ_SRV = {"serverid", "osfamily", "oslifecycle", "assettype", "functionalrole",
           "environment", "regiongroup", "assetcriticality", "exposurecategory", "riskband"}
REQ_VUL = {"findingid", "serverid", "vulnerabilitytypeid", "functionalcategory",
           "severity", "findingstatus", "ageband", "reopenband",
           "exploitabilitycategory", "malwareassociation", "complianceflag",
           "remediationcategory", "slastatus", "assetcriticality"}

COLS_PRIORIDAD = [
    "serverid", "regiongroup", "osfamily", "functionalrole", "environment",
    "assetcriticality", "exposurecategory", "oslifecycle", "hallazgos_abiertos",
    "explotables", "fuera_sla", "reabiertos", "severidad_maxima",
    "score", "prioridad", "motivo_corto", "motivo_principal", "accion_sugerida",
]

# Carpeta donde se guardan config.json e historial.json (la misma de los CSV).
RAIZ = Path(__file__).resolve().parents[3]
DATA_DIR = Path(os.getenv("DATA_DIR") or RAIZ / "tablas_limpias")
CONFIG_PATH = DATA_DIR / "config.json"
HISTORIAL_PATH = DATA_DIR / "historial.json"


# ----------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------
def _pct(parte, total) -> float:
    return round(100.0 * float(parte) / float(total), 1) if total else 0.0


def _registros(df: pd.DataFrame) -> list[dict]:
    """DataFrame -> lista de dicts serializable a JSON (NaN -> None)."""
    return df.astype(object).where(df.notna(), None).to_dict(orient="records")


def _serie(s: pd.Series) -> list[dict]:
    return [{"nombre": str(k), "valor": int(v)} for k, v in s.items()]


def _leer_json(ruta: Path, defecto):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return defecto


def _escribir_json(ruta: Path, datos) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalizar_columnas(df: pd.DataFrame) -> pd.DataFrame:
    """'Server_ID ' -> 'serverid' para aceptar CSV con otros formatos de encabezado."""
    df.columns = [str(c).strip().lower().replace("_", "").replace(" ", "") for c in df.columns]
    return df


class MetricsService:
    def __init__(self, repository: BaseRepository):
        self.repo = repository
        self.cfg = self.get_config()

    # ------------------------------------------------------------------
    # Configuración, perfil e historial (NUEVO)
    # ------------------------------------------------------------------
    @staticmethod
    def get_config() -> dict:
        guardado = _leer_json(CONFIG_PATH, {})
        # orden_factores se reemplaza COMPLETO (no se mezcla elemento por elemento)
        # y solo si es válido: los 9 factores exactos, sin repetidos ni desconocidos.
        orden_guardado = guardado.pop("orden_factores", None)
        guardado.pop("pesos_score", None)  # llave vieja: se ignora
        if not (isinstance(orden_guardado, list) and sorted(orden_guardado) == sorted(FACTORES)):
            orden_guardado = None
        cfg = json.loads(json.dumps(CONFIG_DEFAULT))  # copia profunda
        for k, v in guardado.items():
            if isinstance(v, dict) and isinstance(cfg.get(k), dict):
                cfg[k].update(v)
            else:
                cfg[k] = v
        if orden_guardado is not None:
            cfg["orden_factores"] = list(orden_guardado)
        return cfg

    def actualizar_config(self, cambios: dict) -> dict:
        """Solo actualiza las llaves que vienen en 'cambios' (PUT parcial)."""
        cambios = dict(cambios)
        orden = cambios.pop("orden_factores", None)
        guardado = _leer_json(CONFIG_PATH, {})
        for k, v in cambios.items():
            if v is None:
                continue
            if isinstance(v, dict) and isinstance(guardado.get(k), dict):
                guardado[k].update(v)
            else:
                guardado[k] = v
        if orden is not None:
            guardado["orden_factores"] = list(orden)  # lista completa, sin mezclar
        # Limpieza de llaves viejas/inválidas (p. ej. "pesos_score" de una versión anterior).
        guardado.pop("pesos_score", None)
        _escribir_json(CONFIG_PATH, guardado)
        self.cfg = self.get_config()
        return self.cfg

    def perfil(self) -> dict:
        return self.cfg["usuario"]

    def _snapshot(self, origen: str) -> dict:
        """Foto de los KPIs en este momento. Así se construye un historial REAL."""
        srv, vul, _ = self._cargar("TODOS")
        regiones = {}
        for reg in REGIONES:
            s, v, _ = self._cargar(reg)
            regiones[reg] = {"tasa_remediacion": _pct((~v["abierto"]).sum(), len(v)),
                             "hallazgos_abiertos": int(v["abierto"].sum())}
        foto = {"fecha": datetime.now().isoformat(timespec="seconds"), "origen": origen,
                "kpis": self._kpis(srv, vul), "regiones": regiones}
        hist = _leer_json(HISTORIAL_PATH, [])
        hist.append(foto)
        _escribir_json(HISTORIAL_PATH, hist)
        return foto

    def historial(self, limit: int = 30) -> dict:
        hist = _leer_json(HISTORIAL_PATH, [])
        if not hist:  # primera vez: guarda el punto de partida
            self._snapshot("inicial")
            hist = _leer_json(HISTORIAL_PATH, [])
        return {"puntos": len(hist), "historial": hist[-limit:],
                "suficiente_para_tendencia": len(hist) >= 2}

    def _actualizado_en(self) -> str | None:
        f = self.repo.ultima_actualizacion()
        return f.isoformat(timespec="seconds") if f else None

    # ------------------------------------------------------------------
    # Carga de datos con Preprocesamiento Integrado (NUEVO)
    # ------------------------------------------------------------------
    def cargar_csv(self, tipo: str, contenido: bytes) -> dict:
        ids_servidores = None
        if tipo == "vulnerabilidades":
            try:
                ids_servidores = set(self.repo.get_servidores()["serverid"])
            except Exception:
                pass

        df, _, resumen = preprocesar_csv_unico(contenido, tipo=tipo, servidores_ids=ids_servidores)
        self.repo.guardar(tipo, df)
        foto = self._snapshot(f"carga_{tipo}")
        return {
            "ok": True,
            "tipo": tipo,
            "filas": len(df),
            "columnas": len(df.columns),
            "resumen_preprocesamiento": resumen,
            "kpis": foto["kpis"],
            "actualizado_en": self._actualizado_en(),
        }

    def cargar_archivo_auto(self, nombre_archivo: str, contenido: bytes) -> dict:
        """Procesa y limpia automáticamente archivos Excel (.xlsx/.xls) o CSV."""
        nombre_lower = nombre_archivo.lower()
        if nombre_lower.endswith((".xlsx", ".xls")):
            df_s, df_v, resumen = preprocesar_excel(contenido)
            self.repo.guardar("servidores", df_s)
            self.repo.guardar("vulnerabilidades", df_v)
            foto = self._snapshot("carga_excel_completa")
            return {
                "ok": True,
                "tipo": "excel_completo",
                "archivo": nombre_archivo,
                "servidores": len(df_s),
                "vulnerabilidades": len(df_v),
                "resumen_preprocesamiento": resumen,
                "kpis": foto["kpis"],
                "actualizado_en": self._actualizado_en(),
            }
        elif nombre_lower.endswith(".csv"):
            ids_servidores = None
            try:
                ids_servidores = set(self.repo.get_servidores()["serverid"])
            except Exception:
                pass
            df, tipo_detectado, resumen = preprocesar_csv_unico(contenido, servidores_ids=ids_servidores)
            self.repo.guardar(tipo_detectado, df)
            foto = self._snapshot(f"carga_{tipo_detectado}")
            return {
                "ok": True,
                "tipo": tipo_detectado,
                "archivo": nombre_archivo,
                "filas": len(df),
                "columnas": len(df.columns),
                "resumen_preprocesamiento": resumen,
                "kpis": foto["kpis"],
                "actualizado_en": self._actualizado_en(),
            }
        else:
            raise ValueError(f"Formato no compatible: '{nombre_archivo}'. Sube un archivo .csv o .xlsx.")

    # ------------------------------------------------------------------
    # Carga y unión de datos
    # ------------------------------------------------------------------
    def _cargar(self, region: str = "TODOS"):
        srv = self.repo.get_servidores().copy()
        vul = self.repo.get_vulnerabilidades().copy()

        faltan = (REQ_SRV - set(srv.columns)) | (REQ_VUL - set(vul.columns))
        if faltan:
            raise ValueError(f"Faltan columnas en los CSV limpios: {sorted(faltan)}")

        vul["severity"] = pd.to_numeric(vul["severity"], errors="coerce")
        if region != "TODOS":
            srv = srv[srv["regiongroup"] == region]
            vul = vul[vul["serverid"].isin(srv["serverid"])]

        # "Abierto" = todo lo que no está REMEDIATED (ACTIVE, NEW, REOPENED)
        vul["abierto"] = vul["findingstatus"] != "REMEDIATED"

        # Estado de SLA en 3 categorías: VENCIDO / PROXIMO / EN_TIEMPO
        proximo = (vul["abierto"] & (vul["slastatus"] != "BREACHED")
                   & vul["ageband"].isin(self.cfg["bandas_proximo_vencer"]))
        vul["sla_estado"] = np.select([vul["slastatus"] == "BREACHED", proximo],
                                      ["VENCIDO", "PROXIMO"], default="EN_TIEMPO")

        # assetcriticality existe en ambas tablas: nos quedamos con la del servidor
        full = vul.drop(columns=["assetcriticality"]).merge(srv, on="serverid", how="left")
        return srv, vul, full

    def _kpis(self, srv, vul) -> dict:
        total = len(vul)
        return {
            "servidores": len(srv),
            "hallazgos_totales": total,
            "hallazgos_abiertos": int(vul["abierto"].sum()),
            "tasa_remediacion": _pct((~vul["abierto"]).sum(), total),
            "cumplimiento_sla": _pct((vul["slastatus"] != "BREACHED").sum(), total),
            "pct_proximo_vencer": _pct((vul["sla_estado"] == "PROXIMO").sum(), total),
            "hallazgos_reabiertos": int((vul["findingstatus"] == "REOPENED").sum()),
            "servidores_obsoletos": int(srv["oslifecycle"].isin(OBSOLETOS).sum()),
            "hallazgos_explotables": int(
                (vul["abierto"] & (vul["exploitabilitycategory"] == "KNOWN_OR_AVAILABLE")).sum()
            ),
        }

    # ------------------------------------------------------------------
    # Índice de riesgo 0-100 (NUEVO): promedio del score de los servidores
    # con hallazgos abiertos. Sustituye el 82/100 fijo del frontend.
    # ------------------------------------------------------------------
    def _riesgo(self, prio: pd.DataFrame, n_servidores: int) -> dict:
        if prio.empty:
            indice, urg = 0, 0
        else:
            indice = int(round(prio["score"].mean()))
            urg = int((prio["prioridad"] == "URGENTE").sum())
        cortes = self.cfg["cortes_riesgo"]
        nivel = "ALTO" if indice >= cortes["ALTO"] else "MEDIO" if indice >= cortes["MEDIO"] else "BAJO"
        return {"indice_riesgo": indice, "nivel_riesgo": nivel, "urgentes": urg,
                "pct_urgentes": _pct(urg, n_servidores)}

    # ------------------------------------------------------------------
    # Pestaña 1: Resumen
    # ------------------------------------------------------------------
    def resumen_ejecutivo(self, region: str = "TODOS") -> dict:
        srv, vul, full = self._cargar(region)
        srv_all, _, full_all = self._cargar("TODOS")
        prio_all = self._prioridad_df(srv_all, full_all)
        meta = self.cfg["meta_remediacion"]

        criticidad = []
        for niv in CRITICIDAD:
            sub = full[full["assetcriticality"] == niv]
            criticidad.append({
                "criticidad": niv,
                "hallazgos": len(sub),
                "porcentaje_remediado": _pct((~sub["abierto"]).sum(), len(sub)),
                "meta": meta,
            })

        mapa = []
        for reg in REGIONES:
            f = full_all[full_all["regiongroup"] == reg]
            n_reg = int((srv_all["regiongroup"] == reg).sum())
            mapa.append({
                "region": reg,
                "total_servidores": n_reg,
                "tasa_remediacion": _pct((~f["abierto"]).sum(), len(f)),
                "hallazgos_abiertos": int(f["abierto"].sum()),
                **self._riesgo(prio_all[prio_all["regiongroup"] == reg], n_reg),
            })

        prio_sel = prio_all if region == "TODOS" else prio_all[prio_all["regiongroup"] == region]
        n = len(vul)
        vencido = int((vul["sla_estado"] == "VENCIDO").sum())
        proximo = int((vul["sla_estado"] == "PROXIMO").sum())
        en_tiempo = n - vencido - proximo
        return {
            "region": region,
            "actualizado_en": self._actualizado_en(),
            "kpis": self._kpis(srv, vul),
            "riesgo": self._riesgo(prio_sel, len(srv)),
            "remediacion_por_criticidad": criticidad,
            "mapa_regiones": mapa,
            "cumplimiento_sla_dona": {
                # "cumple" y "breached" se conservan para no romper el front actual
                "cumple": n - vencido, "breached": vencido,
                "en_tiempo": en_tiempo, "proximo_a_vencer": proximo, "vencido": vencido,
                "pct_en_tiempo": _pct(en_tiempo, n), "pct_proximo_a_vencer": _pct(proximo, n),
                "pct_vencido": _pct(vencido, n),
                "regla_proximo": f"Abierto, dentro de SLA y con antigüedad en {self.cfg['bandas_proximo_vencer']}",
            },
            "antiguedad_abiertos": _serie(vul.loc[vul["abierto"], "ageband"].value_counts().sort_index()),
        }

    # ------------------------------------------------------------------
    # Pestaña 2: Detalle por región
    # ------------------------------------------------------------------
    def detalle_region(self, region: str = "TODOS", limit: int = 15) -> dict:
        srv, vul, full = self._cargar(region)
        fuera = full[full["slastatus"] == "BREACHED"]["osfamily"].value_counts()
        prio = self._prioridad_df(srv, full)
        return {
            "region": region,
            "actualizado_en": self._actualizado_en(),
            "kpis": self._kpis(srv, vul),
            "riesgo": self._riesgo(prio, len(srv)),
            "fuera_sla_por_so": _serie(fuera),
            "hallazgos_por_estado": _serie(vul["findingstatus"].value_counts()),
            "servidores_top": _registros(prio[COLS_PRIORIDAD].head(limit)),
        }

    # ------------------------------------------------------------------
    # Pestaña 3: Obsoletos y exposición
    # ------------------------------------------------------------------
    def obsoletos_exposicion(self, region: str = "TODOS", limit: int = 15) -> dict:
        srv, _, full = self._cargar(region)
        abiertos = full[full["abierto"]].groupby("serverid").size().rename("hallazgos_abiertos").reset_index()

        obs = srv[srv["oslifecycle"].isin(OBSOLETOS)].merge(abiertos, on="serverid", how="left")
        obs["hallazgos_abiertos"] = obs["hallazgos_abiertos"].fillna(0).astype(int)
        obs["expuesto_internet"] = obs["exposurecategory"] == "INTERNET_EXPOSED"
        obs = obs.sort_values(["expuesto_internet", "hallazgos_abiertos"], ascending=False)

        cols = ["serverid", "regiongroup", "osfamily", "oslifecycle", "exposurecategory",
                "assetcriticality", "riskband", "hallazgos_abiertos", "expuesto_internet"]
        return {
            "region": region,
            "total_obsoletos": len(obs),
            "pct_obsoletos": _pct(len(obs), len(srv)),
            "obsoletos_expuestos_internet": int(obs["expuesto_internet"].sum()),
            "distribucion_ciclo_vida": _serie(srv["oslifecycle"].value_counts()),
            "obsoletos_por_familia_so": _serie(obs["osfamily"].value_counts()),
            "servidores": _registros(obs[cols].head(limit)),
        }

    # ------------------------------------------------------------------
    # Pestaña 4: Alertas
    # ------------------------------------------------------------------
    def alertas(self, region: str = "TODOS", motivo: str = "TODAS", limit: int = 50,
                estado: str = "ABIERTAS") -> dict:
        _, _, full = self._cargar(region)
        al = full[
            full["assetcriticality"].isin(["CRITICAL", "VERY_HIGH"])
            | (full["exposurecategory"] == "INTERNET_EXPOSED")
        ].copy()

        condiciones = [
            al["slastatus"] == "BREACHED",
            al["findingstatus"] == "REOPENED",
            al["oslifecycle"].isin(OBSOLETOS),
            al["exploitabilitycategory"] == "KNOWN_OR_AVAILABLE",
        ]
        al["motivo"] = np.select(condiciones, MOTIVOS, default="")
        al = al[al["motivo"] != ""].copy()
        al["estado"] = np.where(al["abierto"], "ABIERTA", "RESUELTA")
        al["accion_sugerida"] = al["remediationcategory"].map(ACCIONES).fillna("Revisar manualmente")

        resueltas = int((al["estado"] == "RESUELTA").sum())
        if estado == "ABIERTAS":
            al = al[al["estado"] == "ABIERTA"]
        elif estado == "RESUELTAS":
            al = al[al["estado"] == "RESUELTA"]

        conteo = {"TODAS": len(al)}
        for m in MOTIVOS:
            conteo[m] = int((al["motivo"] == m).sum())
        conteo["resueltas"] = resueltas  # siempre visible para el contador del front

        if motivo != "TODAS":
            al = al[al["motivo"] == motivo]
        al = al.sort_values(["severity", "findingid"], ascending=[False, True]).head(limit)

        cols = ["findingid", "serverid", "regiongroup", "osfamily", "functionalrole",
                "environment", "exposurecategory", "severity", "motivo", "estado",
                "sla_estado", "ageband", "accion_sugerida"]
        return {"region": region, "estado": estado, "motivos_disponibles": MOTIVOS,
                "conteo": conteo, "alertas": _registros(al[cols])}

    # ------------------------------------------------------------------
    # Score de prioridad por servidor
    # ------------------------------------------------------------------
    def _prioridad_df(self, srv: pd.DataFrame, full: pd.DataFrame) -> pd.DataFrame:
        ab = full[full["abierto"]].copy()
        if ab.empty:
            return pd.DataFrame(columns=COLS_PRIORIDAD)

        ab["explotable"] = ab["exploitabilitycategory"] == "KNOWN_OR_AVAILABLE"
        ab["malware"] = ab["malwareassociation"] == "ASSOCIATED"
        ab["fuera_sla"] = ab["slastatus"] == "BREACHED"
        ab["reabierto"] = ab["findingstatus"] == "REOPENED"
        ab["antiguo"] = ab["ageband"].isin(ANTIGUOS)

        agg = ab.groupby("serverid").agg(
            hallazgos_abiertos=("findingid", "count"),
            severidad_maxima=("severity", "max"),
            explotables=("explotable", "sum"),
            malware=("malware", "sum"),
            fuera_sla=("fuera_sla", "sum"),
            reabiertos=("reabierto", "sum"),
            antiguos=("antiguo", "sum"),
            accion=("remediationcategory", lambda s: s.mode().iat[0]),
        ).reset_index()

        df = srv.merge(agg, on="serverid", how="inner")
        P = pesos_desde_orden(self.cfg["orden_factores"])  # escala fija según orden
        raw = (
            df["assetcriticality"].map(PESO_CRITICIDAD).fillna(1) * P["criticidad"]
            + (df["exposurecategory"] == "INTERNET_EXPOSED") * P["expuesto"]
            + df["oslifecycle"].map({"EOL": P["eol"], "EOL_EOS": P["eol_eos"]}).fillna(0)
            + df["severidad_maxima"].fillna(0) * P["severidad"]
            + df["explotables"].clip(upper=3) * P["explotable"]
            + (df["malware"] > 0) * P["malware"]
            + df["fuera_sla"].clip(upper=5) * P["fuera_sla"]
            + df["reabiertos"].clip(upper=3) * P["reabierto"]
            + df["antiguos"].clip(upper=5) * P["antiguo"]
        ).astype(float)
        # score_max se queda fijo en 116 (SCORE_MAX): la escala de puntos por posición
        # es fija, así que el 0-100 y los cortes de prioridad no se descalibran.
        df["score"] = (raw / SCORE_MAX * 100).round().astype(int)
        cortes = self.cfg["cortes_prioridad"]
        df["prioridad"] = np.select(
            [df["score"] >= cortes["URGENTE"],
             df["score"] >= cortes["ALTA"],
             df["score"] >= cortes["MEDIA"]],
            ["URGENTE", "ALTA", "MEDIA"], default="BAJA")

        def motivos(r) -> list[str]:
            m = []
            if r["exposurecategory"] == "INTERNET_EXPOSED":
                m.append("Expuesto a Internet")
            if r["oslifecycle"] in OBSOLETOS:
                m.append(f"SO obsoleto ({r['oslifecycle']})")
            if r["explotables"]:
                m.append(f"{int(r['explotables'])} hallazgo(s) explotable(s)")
            if r["malware"]:
                m.append(f"{int(r['malware'])} con malware asociado")
            if r["fuera_sla"]:
                m.append(f"{int(r['fuera_sla'])} fuera de SLA")
            if r["reabiertos"]:
                m.append(f"{int(r['reabiertos'])} reabierto(s)")
            return m

        lista = df.apply(motivos, axis=1)
        df["motivo_principal"] = lista.apply(lambda m: " + ".join(m) if m else "Hallazgos abiertos pendientes")
        # Versión corta para la columna Estado: el motivo más grave + cuántos más hay
        df["motivo_corto"] = lista.apply(
            lambda m: (m[0] + (f" (+{len(m) - 1})" if len(m) > 1 else "")) if m else "Pendiente")
        df["accion_sugerida"] = df["accion"].map(ACCIONES).fillna("Revisar manualmente")
        df = df.sort_values(["score", "hallazgos_abiertos"], ascending=False).reset_index(drop=True)
        return df

    def servidores_prioritarios(self, region: str = "TODOS", limit: int = 20) -> dict:
        srv, _, full = self._cargar(region)
        df = self._prioridad_df(srv, full)
        return {
            "region": region,
            "total_con_hallazgos_abiertos": len(df),
            "urgentes": int((df["prioridad"] == "URGENTE").sum()) if len(df) else 0,
            "servidores": _registros(df[COLS_PRIORIDAD].head(limit)),
        }

    def prioridad_por_region(self, limit: int = 10) -> dict:
        srv, _, full = self._cargar("TODOS")
        df = self._prioridad_df(srv, full)
        salida = {}
        for reg in REGIONES:
            d = df[df["regiongroup"] == reg]
            salida[reg] = {
                "total_con_hallazgos_abiertos": len(d),
                "urgentes": int((d["prioridad"] == "URGENTE").sum()),
                "servidores": _registros(d[COLS_PRIORIDAD].head(limit)),
            }
        return salida

    def prioridad_csv(self, region: str = "TODOS") -> str:
        srv, _, full = self._cargar(region)
        df = self._prioridad_df(srv, full)
        # BOM para que Excel respete acentos
        return "\ufeff" + df[COLS_PRIORIDAD].to_csv(index=False)

    # ------------------------------------------------------------------
    # Cobertura por vulnerabilidad: "el X% de los servidores tiene VTYPE-..."
    # ------------------------------------------------------------------
    def cobertura_vulnerabilidades(self, region: str = "TODOS", limit: int = 10) -> list[dict]:
        srv, _, full = self._cargar(region)
        ab = full[full["abierto"]]
        if ab.empty:
            return []
        g = ab.groupby("vulnerabilitytypeid").agg(
            servidores_afectados=("serverid", "nunique"),
            hallazgos_abiertos=("findingid", "count"),
            severidad_promedio=("severity", "mean"),
            categoria=("functionalcategory", lambda s: s.mode().iat[0]),
            accion=("remediationcategory", lambda s: s.mode().iat[0]),
            explotables=("exploitabilitycategory", lambda s: int((s == "KNOWN_OR_AVAILABLE").sum())),
        ).reset_index()
        g["pct_servidores"] = g["servidores_afectados"].apply(lambda n: _pct(n, len(srv)))
        g["severidad_promedio"] = g["severidad_promedio"].round(2)
        g["accion_sugerida"] = g["accion"].map(ACCIONES)
        g = g.sort_values(["servidores_afectados", "hallazgos_abiertos"], ascending=False).head(limit)
        return _registros(g.drop(columns=["accion"]))

    # ------------------------------------------------------------------
    # Qué tipo de trabajo hay que hacer: parches vs upgrades vs configuración
    # ------------------------------------------------------------------
    def acciones_requeridas(self, region: str = "TODOS") -> list[dict]:
        srv, _, full = self._cargar(region)
        ab = full[full["abierto"]]
        filas = []
        for cat, sub in ab.groupby("remediationcategory"):
            filas.append({
                "categoria": cat,
                "accion": ACCIONES.get(cat, cat),
                "hallazgos_abiertos": len(sub),
                "pct_hallazgos_abiertos": _pct(len(sub), len(ab)),
                "servidores_afectados": int(sub["serverid"].nunique()),
                "pct_servidores": _pct(sub["serverid"].nunique(), len(srv)),
                "explotables": int((sub["exploitabilitycategory"] == "KNOWN_OR_AVAILABLE").sum()),
            })
        return sorted(filas, key=lambda x: x["hallazgos_abiertos"], reverse=True)

    # ------------------------------------------------------------------
    # SLA por entorno / región / criticidad
    # ------------------------------------------------------------------
    @staticmethod
    def _sla_por(df: pd.DataFrame, col: str, orden: list[str] | None = None) -> list[dict]:
        filas = []
        for nombre, sub in df.groupby(col):
            inc = int((sub["sla_estado"] == "VENCIDO").sum())
            prox = int((sub["sla_estado"] == "PROXIMO").sum())
            filas.append({
                "nombre": str(nombre), "total": len(sub), "incumplidos": inc,
                "proximos_a_vencer": prox,
                "pct_incumplimiento": _pct(inc, len(sub)),
                "pct_proximo_a_vencer": _pct(prox, len(sub)),
                "pct_cumplimiento": _pct(len(sub) - inc, len(sub)),
            })
        if orden:
            filas.sort(key=lambda x: orden.index(x["nombre"]) if x["nombre"] in orden else 99)
        return filas

    def sla_cumplimiento(self, region: str = "TODOS") -> dict:
        _, _, full = self._cargar(region)
        return {
            "region": region,
            "por_entorno": self._sla_por(full, "environment"),
            "por_region": self._sla_por(full, "regiongroup", REGIONES),
            "por_criticidad": self._sla_por(full, "assetcriticality", CRITICIDAD),
        }

    # ------------------------------------------------------------------
    # Hallazgos automáticos en lenguaje natural
    # ------------------------------------------------------------------
    def insights(self, region: str = "TODOS") -> dict:
        srv, vul, full = self._cargar(region)
        ab = full[full["abierto"]]
        n_srv, n_ab = len(srv), len(ab)
        meta = self.cfg["meta_remediacion"]
        items: list[dict] = []

        def add(id_: str, nivel: str, texto: str, cantidad, total):
            items.append({"id": id_, "nivel": nivel, "texto": texto,
                          "cantidad": int(cantidad), "total": int(total),
                          "porcentaje": _pct(cantidad, total)})

        def srv_con(mask: pd.Series) -> int:
            return int(ab.loc[mask, "serverid"].nunique())

        # 1. Alcance general
        n = ab["serverid"].nunique()
        add("servidores_con_abiertos", "medio",
            f"El {_pct(n, n_srv)}% de los servidores ({n} de {n_srv}) tiene al menos un hallazgo abierto.",
            n, n_srv)

        # 2-3. Obsolescencia
        obs = srv[srv["oslifecycle"].isin(OBSOLETOS)]
        add("servidores_obsoletos", "alto",
            f"El {_pct(len(obs), n_srv)}% de los servidores ({len(obs)}) opera con un SO fuera de soporte (EOL/EOL_EOS).",
            len(obs), n_srv)
        obs_exp = obs[obs["exposurecategory"] == "INTERNET_EXPOSED"]
        add("obsoletos_expuestos", "alto",
            f"{len(obs_exp)} servidor(es) obsoleto(s) está(n) expuesto(s) a Internet: combinación de máximo riesgo.",
            len(obs_exp), len(obs))

        # 4. Expuestos con explotable abierto
        expl = ab["exploitabilitycategory"] == "KNOWN_OR_AVAILABLE"
        exp_inet = ab["exposurecategory"] == "INTERNET_EXPOSED"
        n_exp = srv_con(expl & exp_inet)
        n_inet = int((srv["exposurecategory"] == "INTERNET_EXPOSED").sum())
        add("expuestos_explotables", "alto",
            f"{n_exp} de {n_inet} servidores expuestos a Internet tienen hallazgos explotables sin remediar.",
            n_exp, n_inet)

        # 5. Malware
        n_mal = srv_con(ab["malwareassociation"] == "ASSOCIATED")
        add("servidores_malware", "alto",
            f"El {_pct(n_mal, n_srv)}% de los servidores ({n_mal}) tiene hallazgos abiertos asociados a malware.",
            n_mal, n_srv)

        # 6. Antigüedad
        n_old = int(ab["ageband"].isin(ANTIGUOS).sum())
        add("hallazgos_antiguos", "medio",
            f"El {_pct(n_old, n_ab)}% de los hallazgos abiertos ({n_old}) tiene más de 90 días sin resolverse.",
            n_old, n_ab)

        # 7. SLA (vencido y próximo a vencer)
        n_br = int((vul["sla_estado"] == "VENCIDO").sum())
        add("sla_incumplido", "medio",
            f"El {_pct(n_br, len(vul))}% de los hallazgos ({n_br}) incumple su SLA.", n_br, len(vul))
        n_px = int((vul["sla_estado"] == "PROXIMO").sum())
        add("sla_proximo", "medio",
            f"El {_pct(n_px, len(vul))}% de los hallazgos ({n_px}) está próximo a vencer su SLA.",
            n_px, len(vul))

        # 8. Tipo de trabajo requerido
        for a in self.acciones_requeridas(region):
            add(f"accion_{a['categoria'].lower()}", "info",
                f"El {a['pct_hallazgos_abiertos']}% de los hallazgos abiertos requiere: {a['accion'].lower()} "
                f"(afecta al {a['pct_servidores']}% de los servidores).", a["hallazgos_abiertos"], n_ab)

        # 9. Vulnerabilidades más extendidas
        for v in self.cobertura_vulnerabilidades(region, limit=3):
            add(f"vuln_{v['vulnerabilitytypeid'].lower()}", "medio",
                f"El {v['pct_servidores']}% de los servidores ({v['servidores_afectados']}) tiene abierta la "
                f"vulnerabilidad {v['vulnerabilitytypeid']} ({v['categoria']}).", v["servidores_afectados"], n_srv)

        # 10. Cumplimiento normativo
        n_cf = int((ab["complianceflag"] == "YES").sum())
        add("hallazgos_cumplimiento", "medio",
            f"El {_pct(n_cf, n_ab)}% de los hallazgos abiertos ({n_cf}) tiene bandera de cumplimiento normativo.",
            n_cf, n_ab)

        # 11. Meta de remediación en activos críticos
        crit = full[full["assetcriticality"].isin(["CRITICAL", "VERY_HIGH"])]
        rem = int((~crit["abierto"]).sum())
        tasa = _pct(rem, len(crit))
        add("remediacion_criticos", "alto" if tasa < meta else "info",
            f"Solo el {tasa}% de los hallazgos en activos CRITICAL/VERY_HIGH está remediado (meta: {meta:.0f}%).",
            rem, len(crit))

        # 12. Producción
        n_prod = int((ab["environment"] == "PRODUCTION").sum())
        add("abiertos_produccion", "medio",
            f"El {_pct(n_prod, n_ab)}% de los hallazgos abiertos ({n_prod}) está en ambiente de PRODUCCIÓN.",
            n_prod, n_ab)

        # 13. Reaperturas
        n_re = int((vul["reopenband"] == "ONCE").sum())
        add("reaperturas", "medio",
            f"El {_pct(n_re, len(vul))}% de los hallazgos ({n_re}) se ha reabierto al menos una vez: "
            f"la remediación no se está sosteniendo.", n_re, len(vul))

        # 14. Peor región (solo en vista global)
        if region == "TODOS":
            mapa = self.resumen_ejecutivo("TODOS")["mapa_regiones"]
            peor = min(mapa, key=lambda r: r["tasa_remediacion"])
            add("peor_region", "medio",
                f"{peor['region']} tiene la menor tasa de remediación ({peor['tasa_remediacion']}%).",
                peor["tasa_remediacion"], 100)
            riesgosa = max(mapa, key=lambda r: r["indice_riesgo"])
            add("region_mas_riesgosa", "alto" if riesgosa["nivel_riesgo"] == "ALTO" else "medio",
                f"{riesgosa['region']} tiene el mayor índice de riesgo ({riesgosa['indice_riesgo']}/100).",
                riesgosa["indice_riesgo"], 100)

        return {
            "region": region,
            "base": {"servidores": n_srv, "hallazgos": len(vul), "hallazgos_abiertos": n_ab},
            "insights": items,
        }