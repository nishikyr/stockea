import { useMutation, useQuery } from '@tanstack/react-query'
import type { Category, Location, Product } from '../types/api'
import { api } from './client'
import { useInvalidateProjects } from './invalidate'

// Claves de caché del inventario. Todas empiezan por ['projects', id] para que,
// cuando cambie algo del proyecto, podamos invalidarlo todo de una vez.
export const inventoryKeys = {
  products: (projectId: string) => ['projects', projectId, 'products'] as const,
  categories: (projectId: string) => ['projects', projectId, 'categories'] as const,
  locations: (projectId: string) => ['projects', projectId, 'locations'] as const,
}

// --- Leer ---------------------------------------------------------------------------

// Pedimos TODOS los productos y filtramos en el navegador (ver lib/filterProducts.ts).
// Un trastero tiene decenas o cientos de cosas, no millones: así la búsqueda es instantánea.
export function useProducts(projectId: string) {
  return useQuery({
    queryKey: inventoryKeys.products(projectId),
    queryFn: () => api<Product[]>(`/projects/${projectId}/products`),
  })
}

// Un producto con todas sus fotos (para su ficha)
export function useProduct(projectId: string, productId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...inventoryKeys.products(projectId), productId],
    queryFn: () => api<Product>(`/projects/${projectId}/products/${productId}`),
    enabled,
  })
}

export function useCategories(projectId: string) {
  return useQuery({
    queryKey: inventoryKeys.categories(projectId),
    queryFn: () => api<Category[]>(`/projects/${projectId}/categories`),
  })
}

export function useLocations(projectId: string) {
  return useQuery({
    queryKey: inventoryKeys.locations(projectId),
    queryFn: () => api<Location[]>(`/projects/${projectId}/locations`),
  })
}

// --- Escribir ---------------------------------------------------------------------------

export type NewCategory = { name: string; color: string; icon: string }

export function useCreateCategory(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (input: NewCategory) =>
      api<Category>(`/projects/${projectId}/categories`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: ({ id, ...input }: NewCategory & { id: string }) =>
      api<Category>(`/projects/${projectId}/categories/${id}`, { method: 'PUT', body: input }),
    onSuccess: invalidate,
  })
}

// Borrar una categoría NO borra sus productos: se quedan "Sin categoría" (ON DELETE SET NULL)
export function useDeleteCategory(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/projects/${projectId}/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export type NewLocation = { name: string; description?: string; parent_id: string | null }

export function useCreateLocation(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (input: NewLocation) =>
      api<Location>(`/projects/${projectId}/locations`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  })
}

export function useUpdateLocation(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: ({ id, ...input }: NewLocation & { id: string }) =>
      api<Location>(`/projects/${projectId}/locations/${id}`, { method: 'PUT', body: input }),
    onSuccess: invalidate,
  })
}

// Borrar una ubicación: sus productos quedan "Sin ubicación" y lo que había dentro pasa a estar suelto
export function useDeleteLocation(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/projects/${projectId}/locations/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useDeleteProduct(projectId: string) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: (productId: string) =>
      api<void>(`/projects/${projectId}/products/${productId}`, { method: 'DELETE' }),
    // OJO: aquí NO devolvemos la promesa (no esperamos a que se refresquen los datos).
    // Si esperásemos, se volvería a pedir el producto recién borrado → 404 → la pantalla mostraría
    // el error y se desmontaría ANTES de navegar fuera. Así primero navegamos y se refresca de fondo.
    onSuccess: () => {
      void invalidate()
    },
  })
}

// Los datos del formulario de producto, tal y como los espera el backend
export type ProductInput = {
  name: string
  description: string
  category_id: string | null
  location_id: string | null
  unit: string
  min_quantity: number
}

// Funciones sueltas (no hooks): el formulario las encadena dentro de UNA sola mutación
// (crear producto → borrar fotos quitadas → subir fotos nuevas).
export const productApi = {
  create: (projectId: string, input: ProductInput & { quantity: number }) =>
    api<Product>(`/projects/${projectId}/products`, { method: 'POST', body: input }),
  update: (projectId: string, productId: string, input: ProductInput) =>
    api<Product>(`/projects/${projectId}/products/${productId}`, { method: 'PUT', body: input }),
  uploadPhoto: (projectId: string, productId: string, photo: Blob) => {
    const form = new FormData()
    form.append('photo', photo, 'foto.jpg') // el campo se llama "photo", como en el backend
    return api<{ id: string; url: string }>(`/projects/${projectId}/products/${productId}/photos`, {
      method: 'POST',
      body: form,
    })
  },
  deletePhoto: (projectId: string, productId: string, photoId: string) =>
    api<void>(`/projects/${projectId}/products/${productId}/photos/${photoId}`, { method: 'DELETE' }),
}
