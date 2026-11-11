# Front end – Dashboard de Gestión de Parches (FEMSA)

React + Vite + TypeScript (código exportado de Figma Make, conectado al back end FastAPI).

## Dónde va
Reto-Cripto/
├── app/                (back end FastAPI)
├── tablas_limpias/
└── frontend/           <- esta carpeta
    ├── index.html  package.json  tsconfig.json  vite.config.ts  .env  .gitignore
    ├── public/favicon.svg
    └── src/  main.tsx  App.tsx  index.css  api.ts  useBackendData.ts  vite-env.d.ts

## Correrlo (dos terminales)
1) Back end, desde la raíz de Reto-Cripto:  uvicorn app.main:app --reload --port 8000
2) Front end:  cd frontend  ->  npm install  ->  npm run dev   (abre http://localhost:5173)

Si el back end no responde, el dashboard muestra los datos de ejemplo del diseño con un aviso amarillo.
La URL del back end se cambia en frontend/.env (VITE_API_URL).
