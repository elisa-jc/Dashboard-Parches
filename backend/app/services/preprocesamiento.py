"""
Módulo de Preprocesamiento Integrado.
Convierte la lógica de limpieza de 'preprocesamiento.ipynb' en un proceso
automático en vivo dentro del Backend para eliminar la necesidad de ejecutar
un cuaderno de forma separada.
"""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Any

import pandas as pd

# Columnas requeridas según lógica de negocio
REQ_SRV = {
    "serverid", "osfamily", "oslifecycle", "assettype", "functionalrole",
    "environment", "regiongroup", "assetcriticality", "exposurecategory", "riskband"
}

REQ_VUL = {
    "findingid", "serverid", "vulnerabilitytypeid", "functionalcategory",
    "severity", "findingstatus", "ageband", "reopenband",
    "exploitabilitycategory", "malwareassociation", "complianceflag",
    "remediationcategory", "slastatus", "assetcriticality"
}

NO_TOCAR = {"serverid", "findingid", "vulnerabilitytypeid", "vulnerabilityvolumeband"}

RELLENO_VUL = {
    "exploitabilitycategory": "NOT_IDENTIFIED",
    "malwareassociation": "NOT_IDENTIFIED",
    "reopenband": "NONE",
}


def normalizar_nombre_columna(col: Any) -> str:
    """Convierte 'Server_ID ', 'Server ID', 'server_id' en 'serverid'."""
    s = str(col).strip().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def normalizar_columnas(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza los nombres de columnas de un DataFrame."""
    df = df.copy()
    df.columns = [normalizar_nombre_columna(c) for c in df.columns]
    return df


def normalizar_id(valor: Any, prefijo: str, digitos: int) -> str | None:
    """Estandariza identificadores como 'SRV-0001', 'FND-000001', 'VTYPE-0001'."""
    if pd.isna(valor):
        return None
    s = str(valor).strip()
    if not s or s.lower() == "nan":
        return None
    # Si ya tiene el formato correcto, conservarlo
    match = re.match(rf"^{prefijo}-\d{{{digitos}}}$", s, re.IGNORECASE)
    if match:
        return s.upper()
    numeros = "".join(c for c in s if c.isdigit())
    if numeros:
        return f"{prefijo}-{int(numeros):0{digitos}d}"
    return None


def limpiar_texto(df: pd.DataFrame) -> pd.DataFrame:
    """Estandariza valores de texto a mayúsculas con guión bajo."""
    for col in df.columns:
        if col in NO_TOCAR or not pd.api.types.is_object_dtype(df[col]):
            continue
        df[col] = (
            df[col]
            .astype(str)
            .str.strip()
            .str.upper()
            .str.replace(r"[\s\-]+", "_", regex=True)
            .replace({"NAN": pd.NA, "<NA>": pd.NA, "NONE": "NONE"})
        )
    return df


def detectar_fila_encabezado(df_crudo: pd.DataFrame, posibles_cols: set[str]) -> int:
    """Detecta si los encabezados están en la fila 0, fila 3 u otra fila (común en Excel)."""
    for idx in range(min(10, len(df_crudo))):
        fila = [normalizar_nombre_columna(v) for v in df_crudo.iloc[idx].dropna()]
        coincidencias = set(fila) & posibles_cols
        if len(coincidencias) >= 3:
            return idx
    return 0


def limpiar_servidores(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Aplica la limpieza completa de servidores."""
    df = normalizar_columnas(df)
    total_inicial = len(df)

    if "serverid" not in df.columns:
        raise ValueError("El archivo no contiene la columna de identificación de servidor (serverid / Server ID).")

    # Normalizar IDs
    df["serverid"] = df["serverid"].apply(lambda x: normalizar_id(x, "SRV", 4))
    df = df.dropna(subset=["serverid"])

    # Limpieza de texto
    df = limpiar_texto(df)
    if "vulnerabilityvolumeband" in df.columns:
        df["vulnerabilityvolumeband"] = (
            df["vulnerabilityvolumeband"].astype(str).str.strip().str.upper()
        )

    # Imputar nulos en columnas restantes
    for col in df.columns:
        if df[col].isna().any():
            df[col] = df[col].fillna("SIN_DATO")

    # Deduplicación
    duplicados_antes = len(df)
    df = df.drop_duplicates(subset=["serverid"])
    dups_eliminados = duplicados_antes - len(df)

    resumen = {
        "tipo": "servidores",
        "filas_iniciales": total_inicial,
        "filas_finales": len(df),
        "duplicados_eliminados": dups_eliminados,
    }
    return df, resumen


def limpiar_vulnerabilidades(
    df: pd.DataFrame, servidores_validos: set[str] | None = None
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Aplica la limpieza completa de vulnerabilidades / hallazgos."""
    df = normalizar_columnas(df)
    total_inicial = len(df)

    if "findingid" not in df.columns or "serverid" not in df.columns:
        raise ValueError("El archivo de hallazgos debe contener findingid y serverid.")

    # Normalizar IDs
    df["findingid"] = df["findingid"].apply(lambda x: normalizar_id(x, "FND", 6))
    df["serverid"] = df["serverid"].apply(lambda x: normalizar_id(x, "SRV", 4))
    if "vulnerabilitytypeid" in df.columns:
        df["vulnerabilitytypeid"] = df["vulnerabilitytypeid"].apply(
            lambda x: normalizar_id(x, "VTYPE", 4)
        )

    # Eliminar filas sin ID válido
    df = df.dropna(subset=["findingid", "serverid"])

    # Limpieza de texto
    df = limpiar_texto(df)

    # Imputar nulos
    for col in df.columns:
        if df[col].isna().any() and col != "severity":
            df[col] = df[col].fillna(RELLENO_VUL.get(col, "SIN_DATO"))

    # Normalizar severidad numérica (1 a 5)
    if "severity" in df.columns:
        df["severity"] = (
            pd.to_numeric(df["severity"], errors="coerce")
            .fillna(1)
            .clip(lower=1, upper=5)
            .astype(int)
        )

    # Deduplicación por findingid
    duplicados_antes = len(df)
    df = df.drop_duplicates(subset=["findingid"])
    dups_eliminados = duplicados_antes - len(df)

    # Integridad referencial (eliminar huérfanos si se proporcionan servidores válidos)
    huerfanos_eliminados = 0
    if servidores_validos is not None:
        antes_huerfanos = len(df)
        df = df[df["serverid"].isin(servidores_validos)]
        huerfanos_eliminados = antes_huerfanos - len(df)

    resumen = {
        "tipo": "vulnerabilidades",
        "filas_iniciales": total_inicial,
        "filas_finales": len(df),
        "duplicados_eliminados": dups_eliminados,
        "huerfanos_eliminados": huerfanos_eliminados,
    }
    return df, resumen


def preprocesar_ambos(
    df_srv: pd.DataFrame, df_vul: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    """Limpia ambos DataFrames garantizando integridad referencial."""
    srv_clean, res_srv = limpiar_servidores(df_srv)
    srv_ids = set(srv_clean["serverid"])
    vul_clean, res_vul = limpiar_vulnerabilidades(df_vul, servidores_validos=srv_ids)

    return srv_clean, vul_clean, {
        "servidores": res_srv,
        "vulnerabilidades": res_vul,
        "total_servidores": len(srv_clean),
        "total_vulnerabilidades": len(vul_clean),
    }


def preprocesar_excel(contenido: bytes) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    """Lee un archivo Excel (.xlsx / .xls), autodetecta hojas y limpia directamente."""
    bio = io.BytesIO(contenido)
    try:
        excel = pd.ExcelFile(bio)
    except Exception as e:
        raise ValueError(f"No se pudo leer el archivo Excel: {e}")

    hojas = excel.sheet_names
    if len(hojas) < 2:
        raise ValueError(f"El archivo Excel debe tener al menos 2 pestañas (tiene {len(hojas)}).")

    # Leer muestra cruda para detectar fila de encabezado
    hoja0_cruda = pd.read_excel(excel, sheet_name=0, header=None, nrows=10)
    hoja1_cruda = pd.read_excel(excel, sheet_name=1, header=None, nrows=10)

    h0 = detectar_fila_encabezado(hoja0_cruda, REQ_SRV | {"serverid"})
    h1 = detectar_fila_encabezado(hoja1_cruda, REQ_VUL | {"findingid"})

    df_srv = pd.read_excel(excel, sheet_name=0, header=h0)
    df_vul = pd.read_excel(excel, sheet_name=1, header=h1)

    return preprocesar_ambos(df_srv, df_vul)


def preprocesar_csv_unico(
    contenido: bytes, tipo: str | None = None, servidores_ids: set[str] | None = None
) -> tuple[pd.DataFrame, str, dict[str, Any]]:
    """Limpia un archivo CSV individual, autodetectando si es de servidores o vulnerabilidades."""
    try:
        df = pd.read_csv(io.BytesIO(contenido), encoding="utf-8-sig")
    except UnicodeDecodeError:
        df = pd.read_csv(io.BytesIO(contenido), encoding="latin-1")
    except Exception as e:
        raise ValueError(f"Error al leer el archivo CSV: {e}")

    cols = {normalizar_nombre_columna(c) for c in df.columns}

    # Autodetectar tipo si no se especificó
    if not tipo:
        if "findingid" in cols or "severity" in cols:
            tipo = "vulnerabilidades"
        elif "serverid" in cols or "osfamily" in cols:
            tipo = "servidores"
        else:
            raise ValueError("No se pudo identificar si el CSV es de servidores o vulnerabilidades.")

    if tipo == "servidores":
        df_clean, res = limpiar_servidores(df)
    else:
        df_clean, res = limpiar_vulnerabilidades(df, servidores_validos=servidores_ids)

    return df_clean, tipo, res


def asegurar_tablas_limpias(data_dir: Path, raiz: Path) -> bool:
    """Verifica si existen las tablas limpias.
    Si no existen pero hay archivos crudos en la raíz o en data/,
    los preprocesa automáticamente al iniciar el servidor."""
    s_path = data_dir / "tabla1_s_clean.csv"
    v_path = data_dir / "tabla2_v_clean.csv"

    if s_path.exists() and v_path.exists():
        return True

    # 1. Buscar si están en la raíz del proyecto
    srv_raiz = raiz / "servidores_limpio.csv"
    vul_raiz = raiz / "vulnerabilidades_limpio.csv"
    if srv_raiz.exists() and vul_raiz.exists():
        data_dir.mkdir(parents=True, exist_ok=True)
        df_s = pd.read_csv(srv_raiz, encoding="utf-8-sig")
        df_v = pd.read_csv(vul_raiz, encoding="utf-8-sig")
        df_s.to_csv(s_path, index=False, encoding="utf-8-sig")
        df_v.to_csv(v_path, index=False, encoding="utf-8-sig")
        return True

    # 2. Buscar si hay un archivo Excel crudo en data/ o en raíz
    candidatos_excel = list(raiz.glob("*.xlsx")) + list((raiz / "data").glob("*.xlsx"))
    for excel_path in candidatos_excel:
        try:
            df_s, df_v, _ = preprocesar_excel(excel_path.read_bytes())
            data_dir.mkdir(parents=True, exist_ok=True)
            df_s.to_csv(s_path, index=False, encoding="utf-8-sig")
            df_v.to_csv(v_path, index=False, encoding="utf-8-sig")
            return True
        except Exception:
            continue

    return False
