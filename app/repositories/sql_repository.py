from sqlalchemy import create_engine
import pandas as pd
from app.repositories.base import BaseRepository

class SQLRepository(BaseRepository):
    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def get_servidores(self) -> pd.DataFrame:
        query = "SELECT * FROM servidores"
        return pd.read_sql(query, self.engine)

    def get_vulnerabilidades(self) -> pd.DataFrame:
        query = "SELECT * FROM vulnerabilidades"
        return pd.read_sql(query, self.engine)