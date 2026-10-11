import { useInfiniteQuery } from '@tanstack/react-query'
import type { Movement, MovementType } from '../types/api'
import { api } from './client'

export type MovementFilters = {
  productId?: string
  type?: MovementType
}

// El historial puede ser muy largo, así que lo pedimos "por páginas" (limit + offset)
// y useInfiniteQuery las va juntando cuando pulsas "Ver más".
export function useMovements(projectId: string, filters: MovementFilters = {}, pageSize = 30) {
  return useInfiniteQuery({
    queryKey: ['projects', projectId, 'movements', filters, pageSize],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(pageParam) })
      if (filters.productId) params.set('product_id', filters.productId)
      if (filters.type) params.set('type', filters.type)
      return api<Movement[]>(`/projects/${projectId}/movements?${params}`)
    },
    initialPageParam: 0,
    // Si la última página vino llena, puede que haya más: la siguiente empieza donde acabó esta.
    // Si vino a medias, ya no queda nada (undefined = no hay página siguiente).
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < pageSize ? undefined : allPages.length * pageSize,
  })
}
