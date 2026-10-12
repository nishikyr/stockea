import { KeyRound, LogOut, Shapes, Users, Warehouse } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCurrentProject } from '../../api/projects'
import { useAuth } from '../../auth/useAuth'
import { ChangePasswordForm } from '../../components/admin/ChangePasswordForm'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { roleLabel } from '../../lib/format'

// Ajustes: quién eres, qué puedes hacer aquí y cerrar sesión.
export function SettingsPage() {
  const { user, logout } = useAuth()
  const { data: project } = useCurrentProject()
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  if (!user || !project) return null

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">Ajustes</h1>

      <section className="flex items-center gap-4 rounded-3xl bg-cream p-5">
        <span className="flex size-14 flex-none items-center justify-center rounded-full bg-brand font-display
          text-2xl font-bold text-white" aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="truncate text-muted">{user.email}</p>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-3xl bg-cream p-5">
        <p className="text-sm font-semibold text-muted">En {project.name}</p>
        <div><Badge tone={project.role === 'viewer' ? 'neutral' : 'brand'}>{roleLabel[project.role]}</Badge></div>
        <p className="text-[15px] text-muted">
          {project.role === 'viewer'
            ? 'Puedes ver todo lo que hay y su historial, pero no cambiar nada.'
            : 'Puedes añadir productos, fotos y registrar lo que entra y sale.'}
        </p>
      </section>

      {project.role !== 'viewer' && (
        <Link to={`/projects/${project.id}/catalog`}
          className="flex min-h-12 items-center gap-3 rounded-2xl bg-cream px-5 font-semibold text-ink">
          <Shapes size={20} aria-hidden="true" /> Categorías y ubicaciones
        </Link>
      )}

      {user.is_admin && (
        <Link to={`/projects/${project.id}/members`}
          className="flex min-h-12 items-center gap-3 rounded-2xl bg-cream px-5 font-semibold text-ink">
          <Users size={20} aria-hidden="true" /> Acceso y datos del trastero
        </Link>
      )}

      {changingPassword ? (
        <ChangePasswordForm onCancel={() => setChangingPassword(false)}
          onSuccess={() => { setChangingPassword(false); setPasswordChanged(true) }} />
      ) : (
        <button type="button" onClick={() => { setChangingPassword(true); setPasswordChanged(false) }}
          className="flex min-h-12 items-center gap-3 rounded-2xl bg-cream px-5 text-left font-semibold text-ink">
          <KeyRound size={20} aria-hidden="true" /> Cambiar mi contraseña
        </button>
      )}
      {passwordChanged && <p role="status" className="font-semibold text-in">Contraseña cambiada.</p>}

      <Link to="/" className="flex min-h-12 items-center gap-3 rounded-2xl bg-cream px-5 font-semibold text-ink">
        <Warehouse size={20} aria-hidden="true" /> Cambiar de trastero
      </Link>

      <Button variant="secondary" fullWidth onClick={() => void logout()}>
        <LogOut size={20} aria-hidden="true" /> Cerrar sesión
      </Button>
    </main>
  )
}
