import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Project, ProjectSummary } from '../types/api'
import { useParams } from 'react-router'
import { api } from './client'

// Las "claves" identifican cada dato en la caché de TanStack Query.
// Al crear un proyecto invalidamos ['projects'] y la lista se vuelve a pedir sola.
export const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: () => api<ProjectSummary[]>('/projects'),
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => api<Project>(`/projects/${projectId}`),
  })
}

export type NewProject = { name: string; description: string }

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewProject) => api<Project>('/projects', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

// El proyecto de la URL actual (/projects/:projectId/...). Lo usan todas las pestañas del proyecto.
// No hace una petición nueva cada vez: TanStack Query lo saca de la caché.
export function useCurrentProject() {
  const { projectId = '' } = useParams()
  return { projectId, ...useProject(projectId) }
}
