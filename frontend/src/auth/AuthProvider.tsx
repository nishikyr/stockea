import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../types/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Al abrir la app preguntamos al backend "¿quién soy?".
  // Si la cookie de sesión sigue siendo válida, entramos directamente sin hacer login.
  useEffect(() => {
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const loggedUser = await api<User>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setUser(loggedUser)
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null) // aunque falle la red, en este navegador cerramos la sesión
    }
  }

  return <AuthContext value={{ user, loading, login, logout }}>{children}</AuthContext>
}
