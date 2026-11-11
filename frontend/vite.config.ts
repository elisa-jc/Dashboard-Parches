import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Front end en http://localhost:5173  ·  Back end FastAPI en http://localhost:8000 (ver .env)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
