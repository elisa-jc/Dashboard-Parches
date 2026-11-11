from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import router as api_router

app = FastAPI(
    title="API de Gestión de Parches y Vulnerabilidades",
    version="2.0.0",
    description="Backend desacoplado para automatización del control de parches en servidores."
)

# Necesario para que el frontend (otro origen) pueda consumir la API.
# En producción reemplaza "*" por el dominio real del dashboard.
# CAMBIO: ahora también POST (subir CSV) y PUT (configuración).
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["GET", "POST", "PUT"], allow_headers=["*"])

# El router YA trae el prefijo /api/v1, por eso aquí no se repite.
app.include_router(api_router)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}


@app.exception_handler(FileNotFoundError)
async def archivo_no_encontrado(_: Request, exc: FileNotFoundError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


# CAMBIO: 400 en lugar de 500, porque casi siempre es un CSV mal formado que subió el usuario.
@app.exception_handler(ValueError)
async def datos_invalidos(_: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# NUEVO: si se usa SQLRepository, la carga de CSV aún no está implementada.
@app.exception_handler(NotImplementedError)
async def no_implementado(_: Request, exc: NotImplementedError):
    return JSONResponse(status_code=501, content={"detail": str(exc)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)