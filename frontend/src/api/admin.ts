import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Member, Project, User } from '../types/api'
import { api } from './client'
import { useInvalidateProjects } from './invalidate'

// Todo esto solo lo puede hacer el administrador (el backend lo comprueba igualmente).

export const adminKeys = {
  members: (projectId: string) => ['projects', projectId, 'members'] as const,
  users: ['users'] as const,
}

// --- Proyecto y miembros -----------------------------------------------------------

export function useUpdateProject(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (input: { name: string; description: string }) =>
      api<Project>(`/projects/${projectId}`, { method: 'PUT', body: input }),
    onSuccess: invalidate,
  })
}

// Borra el trastero con TODO dentro. Igual que al borrar un producto, NO esperamos al refresco:
// primero navegamos fuera (si no, se volvería a pedir el proyecto borrado → 404 en pantalla).
export function useDeleteProject(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: () => api<void>(`/projects/${projectId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void invalidate()
    },
  })
}

export function useMembers(projectId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: adminKeys.members(projectId),
    queryFn: () => api<Member[]>(`/projects/${projectId}/members`),
    enabled,
  })
}

// PUT /members sirve para las dos cosas: dar acceso a alguien nuevo o cambiar su rol
export function useSetMember(projectId: string) {
  const invalidate = useInvalidateProjects() // también cambia el "N personas con acceso" de la tarjeta
  return useMutation({
    mutationFn: (input: { email: string; role: Member['role'] }) =>
      api<Member>(`/projects/${projectId}/members`, { method: 'PUT', body: input }),
    onSuccess: invalidate,
  })
}

export function useRemoveMember(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (userId: string) => api<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

// --- Cuentas -------------------------------------------------------------------------

export function useUsers() {
  return useQuery({ queryKey: adminKeys.users, queryFn: () => api<User[]>('/users') })
}

export type NewUser = { email: string; name: string; password: string }

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewUser) => api<User>('/users', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      api<void>(`/users/${userId}/password`, { method: 'PUT', body: { new_password: password } }),
  })
}

// "Eliminar" una cuenta: el backend la BORRA si nunca ha movido nada, o la DESACTIVA si tiene
// historial (para no perder quién hizo cada movimiento). Nos dice cuál de las dos ha hecho.
export type DeleteUserResult = 'deleted' | 'disabled'

export function useDeleteUser() {
  const queryClient = useQueryClient()
  const invalidateProjects = useInvalidateProjects() // también pierde sus accesos a los trasteros
  return useMutation({
    mutationFn: (userId: string) =>
      api<{ result: DeleteUserResult }>(`/users/${userId}`, { method: 'DELETE' }).then((r) => r.result),
    // Sin esperar al refresco (sin return): si esperásemos, la fila de esa persona desaparecería de la lista
    // ANTES de que la pantalla pudiera enseñar "Cuenta eliminada" (mismo truco que al borrar un producto).
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users })
      void invalidateProjects()
    },
  })
}

// Reactivar: puede volver a entrar, pero el acceso a cada trastero se vuelve a dar a mano
export function useEnableUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api<void>(`/users/${userId}/enable`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  })
}

// --- Tu propia contraseña (cualquier usuario) -----------------------------------------

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (input: { current_password: string; new_password: string }) =>
      api<void>('/auth/password', { method: 'PUT', body: input }),
  })
}
