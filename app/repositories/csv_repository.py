from pathlib import Path
import pandas as pd
from app.repositories.base import BaseRepository

class CSVRepository(BaseRepository):
    def __init__(self, data_dir: str = "data/tablas_limpias"):
        self.data_dir = Path(data_dir)
        self.servidores_path = self.data_dir / "tabla1_s_clean.csv"
        self.vulnerabilidades_path = self.data_dir / "tabla2_v_clean.csv"

    def get_servidores(self) -> pd.DataFrame:
        if not self.servidores_path.exists():
            raise FileNotFoundError(f"No se encontró el archivo {self.servidores_path}")
        return pd.read_csv(self.servidores_path, encoding="utf-8-sig")

    def get_vulnerabilidades(self) -> pd.DataFrame:
        if not self.vulnerabilidades_path.exists():
            raise FileNotFoundError(f"No se encontró el archivo {self.vulnerabilidades_path}")
        return pd.read_csv(self.vulnerabilidades_path, encoding="utf-8-sig")