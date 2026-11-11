from abc import ABC, abstractmethod
from datetime import datetime

import pandas as pd


class BaseRepository(ABC):
    @abstractmethod
    def get_servidores(self) -> pd.DataFrame:
        """Retorna el DataFrame con los servidores."""
        pass

    @abstractmethod
    def get_vulnerabilidades(self) -> pd.DataFrame:
        """Retorna el DataFrame con las vulnerabilidades."""
        pass

    # --- NUEVO: métodos opcionales (no abstractos, así SQLRepository no se rompe) ---
    def guardar(self, tipo: str, df: pd.DataFrame) -> None:
        """Reemplaza la tabla 'servidores' o 'vulnerabilidades' con un CSV subido."""
        raise NotImplementedError("Este repositorio no permite cargar archivos.")

    def ultima_actualizacion(self) -> datetime | None:
        """Fecha/hora real en que se actualizaron los datos por última vez."""
        return None