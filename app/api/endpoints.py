from fastapi import APIRouter, Depends
from app.repositories.csv_repository import CSVRepository
from app.repositories.base import BaseRepository
from app.services.metrics_service import MetricsService

router = APIRouter()

# Inyección de dependencias para intercambiar fácilmente el repositorio en el futuro
def get_repository() -> BaseRepository:
    return CSVRepository("data/tablas_limpias")

@router.get("/metrics/summary")
def get_summary(repo: BaseRepository = Depends(get_repository)):
    service = MetricsService(repo)
    return service.obtener_resumen_general()

@router.get("/metrics/top-vulnerabilities")
def get_top_vulnerabilities(limit: int = 10, repo: BaseRepository = Depends(get_repository)):
    service = MetricsService(repo)
    return service.obtener_top_vulnerabilidades(limit)

@router.get("/metrics/sla-by-environment")
def get_sla_by_environment(repo: BaseRepository = Depends(get_repository)):
    service = MetricsService(repo)
    return service.obtener_analisis_sla_por_entorno()