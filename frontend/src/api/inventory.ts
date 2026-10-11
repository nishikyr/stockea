import { useQuery } from '@tanstack/react-query'
import type { Category, Product } from '../types/api'
import { api } from './client'

// Claves de caché del inventario. Todas empiezan por ['projects', id] para que,
// cuando cambie algo del proyecto, podamos invalidarlo todo de una vez.
export const inventoryKeys = {
  products: (projectId: string) => ['projects', projectId, 'products'] as const,
  categories: (projectId: string) => ['projects', projectId, 'categories'] as const,
}

// Pedimos TODOS los productos y filtramos en el navegador (ver lib/filterProducts.ts).
// Un trastero tiene decenas o cientos de cosas, no millones: así la búsqueda es instantánea.
export function useProducts(projectId: string) {
  return useQuery({
    queryKey: inventoryKeys.products(projectId),
    queryFn: () => api<Product[]>(`/projects/${projectId}/products`),
  })
}

export function useCategories(projectId: string) {
  return useQuery({
    queryKey: inventoryKeys.categories(projectId),
    queryFn: () => api<Category[]>(`/projects/${projectId}/categories`),
  })
}

// Un producto con todas sus fotos (para su ficha)
export function useProduct(projectId: string, productId: string) {
  return useQuery({
    queryKey: [...inventoryKeys.products(projectId), productId],
    queryFn: () => api<Product>(`/projects/${projectId}/products/${productId}`),
  })
}
