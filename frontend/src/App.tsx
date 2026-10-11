import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

// El mapa de pantallas del frontend (como routes.go en el backend)
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      {/* Cualquier otra dirección: a la pantalla principal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
