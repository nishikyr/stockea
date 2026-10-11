import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Si ya hay sesión (o el login acaba de funcionar), fuera del login
  if (user) return <Navigate to={from} replace />

  async function handleLogin() {
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-7 pt-18 pb-10">
      <Logo size="lg" />

      <h1 className="mt-16 font-display text-[34px] leading-tight font-bold tracking-tight">
        Todo lo del trastero, a mano.
      </h1>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">
        Mira qué hay, dónde está y quién se llevó qué.
      </p>

      <form
        className="mt-10 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          void handleLogin()
        }}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-2xl bg-out-soft px-4 py-3 text-[15px] font-medium text-out">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth disabled={submitting} className="mt-2 min-h-14 text-lg">
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-auto pt-10 text-center text-[15px] leading-relaxed text-muted">
        ¿No tienes cuenta? Pídesela a quien administra el trastero.
      </p>
    </main>
  )
}
