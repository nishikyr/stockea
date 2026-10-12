import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { BatchExitPage } from './pages/BatchExitPage'
import { LoginPage } from './pages/LoginPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { ProductPage } from './pages/ProductPage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { HistoryPage } from './pages/project/HistoryPage'
import { InventoryPage } from './pages/project/InventoryPage'
import { SettingsPage } from './pages/project/SettingsPage'

// El mapa de pantallas del frontend (como routes.go en el backend)
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Protected><ProjectsPage /></Protected>} />

      {/* Rutas anidadas: ProjectPage es el marco y dentro se pinta la pestaña (en su <Outlet />) */}
      <Route path="/projects/:projectId" element={<Protected><ProjectPage /></Protected>}>
        <Route index element={<InventoryPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* La ficha del producto va fuera del marco: pantalla completa, sin pestañas abajo */}
      <Route path="/projects/:projectId/products/:productId" element={<Protected><ProductPage /></Protected>} />
      <Route path="/projects/:projectId/products/new" element={<Protected><ProductFormPage /></Protected>} />
      <Route path="/projects/:projectId/products/:productId/edit" element={<Protected><ProductFormPage /></Protected>} />
      <Route path="/projects/:projectId/exit" element={<Protected><BatchExitPage /></Protected>} />

      {/* Cualquier otra dirección: a la pantalla principal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Protected({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}
