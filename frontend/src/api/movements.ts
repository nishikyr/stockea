import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Movement, MovementType } from '../types/api'
import { api } from './client'
import { projectKeys } from './projects'

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

// --- Escribir: sacar, guardar, recontar ------------------------------------------

export type MovementResult = {
  movement: Movement
  new_quantity: number
  low_stock: boolean
}

// Un movimiento cambia MUCHAS cosas a la vez: el stock del producto, la lista del inventario,
// el historial, los contadores de la tarjeta del proyecto… En vez de actualizar cada una a mano,
// marcamos como "caducado" todo lo que empieza por ['projects'] y TanStack Query vuelve a pedir
// lo que esté en pantalla. Por eso todas las claves empiezan igual.
function useInvalidateProjects() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.all })
}

export type NewMovement = { type: MovementType; quantity: number; reason: string }

export function useRegisterMovement(projectId: string, productId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (input: NewMovement) =>
      api<MovementResult>(`/projects/${projectId}/products/${productId}/movements`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}

export type NewBatch = {
  type: 'in' | 'out'
  reason: string
  items: { product_id: string; quantity: number }[]
}

// Varios productos de una vez. El backend lo hace "todo o nada": si a uno le falta stock,
// no se toca ninguno y el error dice cuál es.
export function useBatchMovement(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (input: NewBatch) =>
      api<MovementResult[]>(`/projects/${projectId}/movements/batch`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}
