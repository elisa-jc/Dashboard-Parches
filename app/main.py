from fastapi import FastAPI
from app.api.endpoints import router as api_router

app = FastAPI(
    title="API de Gestión de Parches y Vulnerabilidades",
    version="1.0.0",
    description="Backend desacoplado para automatización del control de parches en servidores."
)

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)