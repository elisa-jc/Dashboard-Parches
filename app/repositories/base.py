<<<<<<< HEAD
from abc import ABC, abstractmethod
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

=======
from abc import ABC, abstractmethod
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

>>>>>>> 7a94fb9e507272fc472fc5d8d0790919c2361f34
    