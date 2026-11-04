import pandas as pd
from app.repositories.base import BaseRepository

class MetricsService:
    def __init__(self, repository: BaseRepository):
        self.repo = repository

    def obtener_resumen_general(self) -> dict:
        df_srv = self.repo.get_servidores()
        df_vuln = self.repo.get_vulnerabilidades()

        total_srv = len(df_srv)
        total_vuln = len(df_vuln)
        promedio = round(total_vuln / total_srv, 2) if total_srv > 0 else 0

        return {
            "total_servidores": total_srv,
            "total_vulnerabilidades": total_vuln,
            "promedio_vuln_por_servidor": promedio
        }

    def obtener_top_vulnerabilidades(self, limit: int = 10) -> list:
        df_vuln = self.repo.get_vulnerabilidades()
        if "vulnerabilitytypeid" not in df_vuln.columns:
            return []
        
        counts = df_vuln["vulnerabilitytypeid"].value_counts().head(limit)
        return [{"vulnerability_type_id": k, "count": int(v)} for k, v in counts.items()]

    def obtener_analisis_sla_por_entorno(self) -> list:
        df_srv = self.repo.get_servidores()
        df_vuln = self.repo.get_vulnerabilidades()

        df_merged = pd.merge(df_vuln, df_srv, on="serverid", suffixes=("_vuln", "_srv"))
        
        if "environment" in df_merged.columns and "slastatus" in df_merged.columns:
            agrupado = df_merged.groupby(["environment", "slastatus"]).size().reset_index(name="total")
            return agrupado.to_dict(orient="records")
        return []