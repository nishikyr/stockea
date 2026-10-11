import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider'
import './index.css'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* QueryClientProvider: caché de los datos que pedimos al backend */}
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter: permite tener varias "páginas" (/login, /projects/...) sin recargar */}
      <BrowserRouter>
        {/* AuthProvider: guarda quién está conectado y lo comparte con toda la app */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
