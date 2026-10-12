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

// --- Tu propia contraseña (cualquier usuario) -----------------------------------------

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (input: { current_password: string; new_password: string }) =>
      api<void>('/auth/password', { method: 'PUT', body: input }),
  })
}
