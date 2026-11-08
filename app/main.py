import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import router as api_router

# Cargar variables de entorno del archivo .env
load_dotenv()

app = FastAPI(
    title="API de Gestión de Parches y Vulnerabilidades",
    version="1.0.0",
    description="Backend desacoplado para automatización del control de parches en servidores."
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

app.include_router(api_router)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok", "database": "connected" if os.getenv("DATABASE_URL") else "not configured"}


@app.exception_handler(FileNotFoundError)
async def archivo_no_encontrado(_: Request, exc: FileNotFoundError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def datos_invalidos(_: Request, exc: ValueError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


if __name__ == "__main__":
    import uvicorn
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.endpoints import router as api_router

# Cargar variables de entorno del archivo .env
load_dotenv()

app = FastAPI(
    title="API de Gestión de Parches y Vulnerabilidades",
    version="1.0.0",
    description="Backend desacoplado para automatización del control de parches en servidores."
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

app.include_router(api_router)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok", "database": "connected" if os.getenv("DATABASE_URL") else "not configured"}


@app.exception_handler(FileNotFoundError)
async def archivo_no_encontrado(_: Request, exc: FileNotFoundError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def datos_invalidos(_: Request, exc: ValueError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)