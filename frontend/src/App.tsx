import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './pages/LoginPage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'

// El mapa de pantallas del frontend (como routes.go en el backend)
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><ProjectsPage /></Protected>} />
      <Route path="/projects/:projectId" element={<Protected><ProjectPage /></Protected>} />
      {/* Cualquier otra dirección: a la pantalla principal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Protected({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}
