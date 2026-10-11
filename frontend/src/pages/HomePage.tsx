import { useAuth } from '../auth/useAuth'
import { Logo } from '../components/Logo'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

// Pantalla provisional: en el paso 4 aquí irán las tarjetas de proyectos.
export function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Button variant="ghost" onClick={() => void logout()}>
          Salir
        </Button>
      </header>

      <Card className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Hola, {user?.name}</h1>
        <p className="text-muted">{user?.email}</p>
        <div>
          <Badge tone={user?.is_admin ? 'dark' : 'neutral'}>
            {user?.is_admin ? 'Administrador' : 'Usuario'}
          </Badge>
        </div>
      </Card>

      <p className="text-center text-muted">Aquí aparecerán tus proyectos (paso 4).</p>
    </main>
  )
}
