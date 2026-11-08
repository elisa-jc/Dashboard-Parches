import os
from pathlib import Path

import pandas as pd

from app.repositories.base import BaseRepository

# Raíz del proyecto (carpeta que contiene "app/" y "tablas_limpias/")
RAIZ = Path(__file__).resolve().parents[2]


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
import os
from pathlib import Path

import pandas as pd

from app.repositories.base import BaseRepository

# Raíz del proyecto (carpeta que contiene "app/" y "tablas_limpias/")
RAIZ = Path(__file__).resolve().parents[2]


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