# Dashboard de Gestión de Parches (FEMSA)

Frontend React + Vite + TypeScript conectado al backend FastAPI.

## Ejecutar con Docker

Desde la raíz del repositorio:

```sh
docker compose up --build -d
docker compose ps
```

Desde otro equipo, abre `http://<IP-o-DNS-del-servidor>` (puerto 80). Asegúrate
de permitir ese puerto en el firewall del servidor. Nginx sirve el frontend y
redirige las llamadas a la API por la red interna de Docker; el backend no
publica un puerto en el servidor. Docker monta `tablas_limpias/` para leer los
CSV y guardar la configuración e historial.

Los puertos y la interfaz de red se pueden ajustar copiando `.env.example` a
`.env` y editando sus valores. Por defecto, el frontend escucha en todas las
interfaces del servidor en el puerto `80`.

Esta configuración no incluye HTTPS ni autenticación. Para exponer el servicio
en Internet, colócalo detrás de un proxy HTTPS y limita el acceso mediante
autenticación o firewall.

## Desarrollo local

En una terminal, desde la carpeta `backend/`:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

En otra terminal, desde `frontend/`:

```powershell
npm ci
npm run dev
```

El frontend de desarrollo usa `http://localhost:8000` por defecto. Si el
backend no responde, la interfaz muestra los datos de ejemplo.
