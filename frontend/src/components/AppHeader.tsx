import { useAuth } from '../auth/useAuth'
import { Logo } from './Logo'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between gap-3">
      <Logo />
      <div className="flex items-center gap-1">
        {user?.is_admin && <Badge tone="dark">Administrador</Badge>}
        <Button variant="ghost" className="px-3" onClick={() => void logout()}>
          Salir
        </Button>
      </div>
    </header>
  )
}
