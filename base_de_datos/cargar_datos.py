import os
from pathlib import Path

import dotenv
import pandas as pd
from sqlalchemy import create_engine, text

RAIZ = Path(__file__).resolve().parents[1]
dotenv.load_dotenv(RAIZ / ".env")

db_url = (os.getenv("DATABASE_URL") or "").strip()
if not db_url:
    raise RuntimeError("Falta la variable de entorno DATABASE_URL en .env")

engine_kwargs = {"fast_executemany": True} if "pyodbc" in db_url.lower() else {}
engine = create_engine(db_url, **engine_kwargs)

RUTA_S = RAIZ / "tablas_limpias" / "tabla1_s_clean.csv"
RUTA_V = RAIZ / "tablas_limpias" / "tabla2_v_clean.csv"

# "NONE" es un valor válido; solo las celdas vacías son nulas
servers = pd.read_csv(RUTA_S, keep_default_na=False, na_values=[""])
findings = pd.read_csv(RUTA_V, keep_default_na=False, na_values=[""])

# 1. Validar que las columnas del CSV coincidan con las tablas de SQL
with engine.connect() as conn:
    for tabla, df in [("servers", servers), ("findings", findings)]:
        cols_sql = [r[0].lower() for r in conn.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            f"WHERE TABLE_NAME = '{tabla}'"))]
        faltan = set(df.columns) - set(cols_sql)
        sobran = set(cols_sql) - set(df.columns)
        assert not faltan and not sobran, (
            f"{tabla}: columnas del CSV que no existen en SQL: {faltan} | "
            f"columnas de SQL que faltan en el CSV: {sobran}")

# 2. Validar integridad referencial
huerfanos = set(findings["serverid"]) - set(servers["serverid"])
assert not huerfanos, f"Hay {len(huerfanos)} server_id en findings sin servidor"

# 3. Carga en una sola transacción (todo o nada)
servers_sql = servers.astype(object).where(servers.notna(), None)
findings_sql = findings.astype(object).where(findings.notna(), None)
with engine.begin() as conn:
    conn.execute(text("DELETE FROM findings"))
    conn.execute(text("DELETE FROM servers"))
    servers_sql.to_sql("servers", conn, if_exists="append", index=False, chunksize=500)
    findings_sql.to_sql("findings", conn, if_exists="append", index=False, chunksize=500)

print(f"Carga completa: {len(servers)} servers, {len(findings)} findings")
