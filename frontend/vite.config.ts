import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Todo lo que empiece por /api se reenvía al backend de Go.
    // Así el navegador cree que front y back son la misma web,
    // la cookie de sesión funciona sin problemas y no hace falta CORS.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})