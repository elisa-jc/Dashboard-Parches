import os
import pandas as pd
import dotenv
from sqlalchemy import create_engine, text

dotenv.load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"), fast_executemany=True)

RUTA_S = "tablas_limpias/tabla1_s_clean.csv"
RUTA_V = "tablas_limpias/tabla2_v_clean.csv"

# "NONE" es un valor válido; solo las celdas vacías son nulas
servers = pd.read_csv(RUTA_S, keep_default_na=False, na_values=[""])
findings = pd.read_csv(RUTA_V, keep_default_na=False, na_values=[""])

# 1. Validar que las columnas del CSV coincidan con las tablas de SQL
with engine.connect() as conn:
    for tabla, df in [("servers", servers), ("findings", findings)]:
        cols_sql = [r[0] for r in conn.execute(text(
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
with engine.begin() as conn:
    conn.execute(text("DELETE FROM findings"))
    conn.execute(text("DELETE FROM servers"))
    servers.to_sql("servers", conn, if_exists="append", index=False)
    findings.to_sql("findings", conn, if_exists="append", index=False)

print(f"Carga completa: {len(servers)} servers, {len(findings)} findings")