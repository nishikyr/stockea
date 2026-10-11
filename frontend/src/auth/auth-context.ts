import { createContext } from 'react'
import type { User } from '../types/api'

export type AuthContextValue = {
  user: User | null // null = no hay sesión
  loading: boolean // true mientras comprobamos si ya había una sesión abierta
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// El "contexto" permite que cualquier pantalla sepa quién está conectado
// sin pasar el usuario de componente en componente.
export const AuthContext = createContext<AuthContextValue | null>(null)
