import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'

// El "portero" del frontend: si no hay sesión, manda al login.
// Ojo: la seguridad de verdad está en el backend (middleware RequireAuth);
// esto solo evita enseñar pantallas que fallarían.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted" role="status">
        Cargando…
      </div>
    )
  }

  if (!user) {
    // Guardamos a dónde quería ir para llevarle allí después del login
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
