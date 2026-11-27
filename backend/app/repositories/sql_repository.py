import threading
from datetime import datetime

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from app.repositories.base import BaseRepository


def _build_engine(connection_string: str):
    conn = connection_string.strip().strip('"').strip("'")
    if "://" not in conn:
        url = URL.create("mssql+pyodbc", query={"odbc_connect": conn})
        return create_engine(url, pool_pre_ping=True, fast_executemany=True)

    kwargs: dict = {"pool_pre_ping": True}
    if "pyodbc" in conn.lower():
        kwargs["fast_executemany"] = True
    return create_engine(conn, **kwargs)


class SQLRepository(BaseRepository):
    """Repositorio SQL (SQL Server / PostgreSQL / SQLite) con caché en memoria."""

    def __init__(self, connection_string: str):
        self.engine = _build_engine(connection_string)
        self._cache: dict[str, pd.DataFrame] = {}
        self._lock = threading.Lock()
        self._ultima: datetime = datetime.now()

    def _leer(self, tabla: str) -> pd.DataFrame:
        with self._lock:
            if tabla not in self._cache:
                df = pd.read_sql(f"SELECT * FROM {tabla}", self.engine)
                df.columns = [str(c).lower() for c in df.columns]
                self._cache[tabla] = df
            return self._cache[tabla]

    def get_servidores(self) -> pd.DataFrame:
        return self._leer("servers")

    def get_vulnerabilidades(self) -> pd.DataFrame:
        return self._leer("findings")

    def recargar(self) -> None:
        """Descarta la caché para volver a leer desde SQL."""
        with self._lock:
            self._cache.clear()

    def guardar(self, tipo: str, df: pd.DataFrame) -> None:
        """Reemplaza la tabla correspondiente en SQL respetando la FK findings -> servers."""
        df_clean = df.copy()
        df_clean.columns = [str(c).lower() for c in df_clean.columns]
        df_clean = df_clean.astype(object).where(df_clean.notna(), None)

        with self._lock:
            with self.engine.begin() as conn:
                if tipo == "servidores":
                    # Preservar findings válidos cuya FK siga existiendo en los nuevos servidores
                    findings_actuales = pd.read_sql("SELECT * FROM findings", conn)
                    findings_actuales.columns = [str(c).lower() for c in findings_actuales.columns]
                    validos = set(df_clean["serverid"].dropna())
                    findings_validos = findings_actuales[findings_actuales["serverid"].isin(validos)]

                    conn.execute(text("DELETE FROM findings"))
                    conn.execute(text("DELETE FROM servers"))
                    if not df_clean.empty:
                        df_clean.to_sql("servers", conn, if_exists="append", index=False, chunksize=500)
                    if not findings_validos.empty:
                        findings_validos = findings_validos.astype(object).where(findings_validos.notna(), None)
                        findings_validos.to_sql("findings", conn, if_exists="append", index=False, chunksize=500)
                else:
                    srv_df = pd.read_sql("SELECT serverid FROM servers", conn)
                    srv_df.columns = [str(c).lower() for c in srv_df.columns]
                    srv_ids = set(srv_df["serverid"])
                    df_validos = df_clean[df_clean["serverid"].isin(srv_ids)]
                    conn.execute(text("DELETE FROM findings"))
                    if not df_validos.empty:
                        df_validos.to_sql("findings", conn, if_exists="append", index=False, chunksize=500)

            self._cache.clear()
            self._ultima = datetime.now()

    def ultima_actualizacion(self) -> datetime | None:
        return self._ultima
