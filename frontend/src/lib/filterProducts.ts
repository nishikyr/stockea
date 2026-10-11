import type { Product } from '../types/api'

// "Categoría elegida": todas, una concreta, o los productos sin categoría
export type CategoryFilter = 'all' | 'none' | string

export type ProductFilters = {
  search: string
  category: CategoryFilter
  lowOnly: boolean
}

// Quita tildes y mayúsculas: "Árbol" y "arbol" se encuentran igual
export function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Función "pura": recibe la lista y los filtros y devuelve otra lista. No toca nada más,
// así es fácil de entender y de probar.
export function filterProducts(products: Product[], { search, category, lowOnly }: ProductFilters) {
  const words = normalize(search).split(/\s+/).filter(Boolean)

  return products.filter((p) => {
    if (lowOnly && !p.low_stock) return false
    if (category === 'none' && p.category) return false
    if (category !== 'all' && category !== 'none' && p.category?.id !== category) return false

    if (words.length === 0) return true
    // Buscamos en nombre, descripción, ubicación y categoría. Tienen que aparecer todas las palabras.
    const haystack = normalize([p.name, p.description, p.location?.name, p.category?.name].join(' '))
    return words.every((w) => haystack.includes(w))
  })
}
