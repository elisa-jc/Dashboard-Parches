import os
from datetime import datetime
from pathlib import Path

import pandas as pd

from app.repositories.base import BaseRepository
from app.services.preprocesamiento import asegurar_tablas_limpias

# Raíz del proyecto (carpeta que contiene "backend/" y "tablas_limpias/")
RAIZ = Path(__file__).resolve().parents[3]


class CSVRepository(BaseRepository):
    """Lee los CSV limpios una sola vez y los mantiene en memoria.

    Carpeta de datos, en orden de prioridad:
    1) argumento data_dir, 2) variable de entorno DATA_DIR (útil en Docker),
    3) <raíz del proyecto>/tablas_limpias
    """

    def __init__(self, data_dir: str | None = None):
        self.data_dir = Path(data_dir or os.getenv("DATA_DIR") or RAIZ / "tablas_limpias")
        self.servidores_path = self.data_dir / "tabla1_s_clean.csv"
        self.vulnerabilidades_path = self.data_dir / "tabla2_v_clean.csv"
        self._cache: dict[Path, pd.DataFrame] = {}
        # Preprocesamiento automático si faltan las tablas limpias
        asegurar_tablas_limpias(self.data_dir, RAIZ)

    def _leer(self, ruta: Path) -> pd.DataFrame:
        if ruta not in self._cache:
            if not ruta.exists():
                raise FileNotFoundError(f"No se encontró el archivo {ruta}")
            self._cache[ruta] = pd.read_csv(ruta, encoding="utf-8-sig")
        return self._cache[ruta]

    def get_servidores(self) -> pd.DataFrame:
        return self._leer(self.servidores_path)

    def get_vulnerabilidades(self) -> pd.DataFrame:
        return self._leer(self.vulnerabilidades_path)

    def recargar(self) -> None:
        """Descarta la caché (por si se regeneran los CSV)."""
        self._cache.clear()

    # ---------------------- NUEVO ----------------------
    def guardar(self, tipo: str, df: pd.DataFrame) -> None:
        """Sobrescribe el CSV correspondiente y limpia la caché.
        Antes de sobrescribir deja una copia de respaldo (.bak)."""
        ruta = self.servidores_path if tipo == "servidores" else self.vulnerabilidades_path
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if ruta.exists():
            ruta.replace(ruta.with_suffix(".csv.bak"))
        df.to_csv(ruta, index=False, encoding="utf-8-sig")
        self.recargar()

    def ultima_actualizacion(self) -> datetime | None:
        """Fecha de modificación más reciente de los dos CSV."""
        rutas = [r for r in (self.servidores_path, self.vulnerabilidades_path) if r.exists()]
        if not rutas:
            return None
        return datetime.fromtimestamp(max(r.stat().st_mtime for r in rutas))