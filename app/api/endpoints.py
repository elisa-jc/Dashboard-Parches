<<<<<<< HEAD
from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.repositories.base import BaseRepository
from app.repositories.csv_repository import CSVRepository
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/api/v1", tags=["Analíticas Ejecutivas - FEMSA"])

Region = Literal["TODOS", "REGION_NORTH", "REGION_CENTRAL", "REGION_SOUTH"]
Motivo = Literal["TODAS", "Fuera de SLA", "Reabierto", "Obsoleto", "Explotable"]


@lru_cache(maxsize=1)
def get_repository() -> BaseRepository:
    # Para pasar a SQL basta con cambiar esta línea:
    # return SQLRepository("postgresql://usuario:clave@host/db")
    return CSVRepository()


def get_service(repo: BaseRepository = Depends(get_repository)) -> MetricsService:
    return MetricsService(repo)


# ---------------------- Dashboard (una ruta por pestaña) ----------------------
@router.get("/dashboard/resumen")
def resumen(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """Pestaña 1: KPIs, remediación por criticidad, mapa regional y dona de SLA."""
    return s.resumen_ejecutivo(region)


@router.get("/dashboard/detalle")
def detalle(region: Region = Query("TODOS"), limit: int = Query(15, ge=1, le=100),
            s: MetricsService = Depends(get_service)):
    """Pestaña 2: detalle de una región."""
    return s.detalle_region(region, limit)


@router.get("/dashboard/obsoletos-exposicion")
def obsoletos(region: Region = Query("TODOS"), limit: int = Query(15, ge=1, le=100),
              s: MetricsService = Depends(get_service)):
    """Pestaña 3: sistemas fuera de soporte y exposición a Internet."""
    return s.obsoletos_exposicion(region, limit)


@router.get("/dashboard/alertas")
def alertas(region: Region = Query("TODOS"), motivo: Motivo = Query("TODAS"),
            limit: int = Query(50, ge=1, le=500), s: MetricsService = Depends(get_service)):
    """Pestaña 4: hallazgos no remediados en activos CRITICAL/VERY_HIGH con acción sugerida."""
    return s.alertas(region, motivo, limit)


# ---------------------- Analítica para el auditor ----------------------
@router.get("/insights")
def insights(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """Hallazgos automáticos en lenguaje natural (el X% de los servidores...)."""
    return s.insights(region)


@router.get("/vulnerabilidades/cobertura")
def cobertura(region: Region = Query("TODOS"), limit: int = Query(10, ge=1, le=120),
              s: MetricsService = Depends(get_service)):
    """Vulnerabilidades abiertas más extendidas: % de servidores afectados."""
    return s.cobertura_vulnerabilidades(region, limit)


@router.get("/remediacion/acciones")
def acciones(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """Cuánto trabajo es parche, upgrade de versión o cambio de configuración."""
    return s.acciones_requeridas(region)


@router.get("/sla/cumplimiento")
def sla(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """SLA por entorno, región y criticidad."""
    return s.sla_cumplimiento(region)


# ---------------------- Priorización ----------------------
@router.get("/servidores/prioridad")
def prioridad(region: Region = Query("TODOS"), limit: int = Query(20, ge=1, le=250),
              s: MetricsService = Depends(get_service)):
    """Servidores ordenados por score de riesgo (0-100) con motivo y acción."""
    return s.servidores_prioritarios(region, limit)


@router.get("/servidores/prioridad/por-region")
def prioridad_por_region(limit: int = Query(10, ge=1, le=100), s: MetricsService = Depends(get_service)):
    """Lista técnica de servidores urgentes agrupada por Norte/Centro/Sur."""
    return s.prioridad_por_region(limit)


@router.get("/export/prioridad.csv")
def exportar_prioridad(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """CSV descargable (abre bien en Excel) para entregar al equipo de TI."""
    return Response(
        content=s.prioridad_csv(region),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="prioridad_{region}.csv"'},
=======
from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.repositories.base import BaseRepository
from app.repositories.csv_repository import CSVRepository
from app.services.metrics_service import MetricsService

router = APIRouter(prefix="/api/v1", tags=["Analíticas Ejecutivas - FEMSA"])

Region = Literal["TODOS", "REGION_NORTH", "REGION_CENTRAL", "REGION_SOUTH"]
Motivo = Literal["TODAS", "Fuera de SLA", "Reabierto", "Obsoleto", "Explotable"]


@lru_cache(maxsize=1)
def get_repository() -> BaseRepository:
    # Para pasar a SQL basta con cambiar esta línea:
    # return SQLRepository("postgresql://usuario:clave@host/db")
    return CSVRepository()


def get_service(repo: BaseRepository = Depends(get_repository)) -> MetricsService:
    return MetricsService(repo)


# ---------------------- Dashboard (una ruta por pestaña) ----------------------
@router.get("/dashboard/resumen")
def resumen(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """Pestaña 1: KPIs, remediación por criticidad, mapa regional y dona de SLA."""
    return s.resumen_ejecutivo(region)


@router.get("/dashboard/detalle")
def detalle(region: Region = Query("TODOS"), limit: int = Query(15, ge=1, le=100),
            s: MetricsService = Depends(get_service)):
    """Pestaña 2: detalle de una región."""
    return s.detalle_region(region, limit)


@router.get("/dashboard/obsoletos-exposicion")
def obsoletos(region: Region = Query("TODOS"), limit: int = Query(15, ge=1, le=100),
              s: MetricsService = Depends(get_service)):
    """Pestaña 3: sistemas fuera de soporte y exposición a Internet."""
    return s.obsoletos_exposicion(region, limit)


@router.get("/dashboard/alertas")
def alertas(region: Region = Query("TODOS"), motivo: Motivo = Query("TODAS"),
            limit: int = Query(50, ge=1, le=500), s: MetricsService = Depends(get_service)):
    """Pestaña 4: hallazgos no remediados en activos CRITICAL/VERY_HIGH con acción sugerida."""
    return s.alertas(region, motivo, limit)


# ---------------------- Analítica para el auditor ----------------------
@router.get("/insights")
def insights(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """Hallazgos automáticos en lenguaje natural (el X% de los servidores...)."""
    return s.insights(region)


@router.get("/vulnerabilidades/cobertura")
def cobertura(region: Region = Query("TODOS"), limit: int = Query(10, ge=1, le=120),
              s: MetricsService = Depends(get_service)):
    """Vulnerabilidades abiertas más extendidas: % de servidores afectados."""
    return s.cobertura_vulnerabilidades(region, limit)


@router.get("/remediacion/acciones")
def acciones(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """Cuánto trabajo es parche, upgrade de versión o cambio de configuración."""
    return s.acciones_requeridas(region)


@router.get("/sla/cumplimiento")
def sla(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """SLA por entorno, región y criticidad."""
    return s.sla_cumplimiento(region)


# ---------------------- Priorización ----------------------
@router.get("/servidores/prioridad")
def prioridad(region: Region = Query("TODOS"), limit: int = Query(20, ge=1, le=250),
              s: MetricsService = Depends(get_service)):
    """Servidores ordenados por score de riesgo (0-100) con motivo y acción."""
    return s.servidores_prioritarios(region, limit)


@router.get("/servidores/prioridad/por-region")
def prioridad_por_region(limit: int = Query(10, ge=1, le=100), s: MetricsService = Depends(get_service)):
    """Lista técnica de servidores urgentes agrupada por Norte/Centro/Sur."""
    return s.prioridad_por_region(limit)


@router.get("/export/prioridad.csv")
def exportar_prioridad(region: Region = Query("TODOS"), s: MetricsService = Depends(get_service)):
    """CSV descargable (abre bien en Excel) para entregar al equipo de TI."""
    return Response(
        content=s.prioridad_csv(region),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="prioridad_{region}.csv"'},
>>>>>>> 7a94fb9e507272fc472fc5d8d0790919c2361f34
    )