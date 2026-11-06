<<<<<<< HEAD
import pandas as pd
from sqlalchemy import create_engine
from app.repositories.base import BaseRepository

class SQLRepository(BaseRepository):
    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def get_servidores(self) -> pd.DataFrame:
        query = "SELECT * FROM servers"
        return pd.read_sql(query, self.engine)

    def get_vulnerabilidades(self) -> pd.DataFrame:
        query = "SELECT * FROM findings"
=======
import pandas as pd
from sqlalchemy import create_engine
from app.repositories.base import BaseRepository

class SQLRepository(BaseRepository):
    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def get_servidores(self) -> pd.DataFrame:
        query = "SELECT * FROM servers"
        return pd.read_sql(query, self.engine)

    def get_vulnerabilidades(self) -> pd.DataFrame:
        query = "SELECT * FROM findings"
>>>>>>> 7a94fb9e507272fc472fc5d8d0790919c2361f34
        return pd.read_sql(query, self.engine)