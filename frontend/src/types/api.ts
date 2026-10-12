// Tipos de lo que devuelve la API. Copian los DTO del backend (internal/dto).

export type User = {
  id: string
  email: string
  name: string
  is_admin: boolean
}

// Tu rol en un proyecto. "admin" = administrador global (puede con todo).
export type Role = 'admin' | 'editor' | 'viewer'

export type Project = {
  id: string
  name: string
  description: string
  role: Role
  created_at: string
}

// Lo que devuelve GET /projects: el proyecto + los contadores de la tarjeta
export type ProjectSummary = Project & {
  product_count: number
  low_stock_count: number
  member_count: number
}

// --- Inventario -------------------------------------------------------------

// Versión corta de categoría/ubicación que viene dentro de cada producto
export type CategoryRef = {
  id: string
  name: string
  color: string // "#rrggbb"
  icon: string // nombre de icono, p. ej. "wrench" ("" si no tiene)
}

export type LocationRef = {
  id: string
  name: string
}

export type Photo = {
  id: string
  url: string
}

export type Product = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string // "uds", "cajas"…
  min_quantity: number
  low_stock: boolean // true si quantity <= min_quantity (lo calcula el backend)
  category: CategoryRef | null
  location: LocationRef | null
  photo_url: string | null // foto de portada
  photos?: Photo[] // todas las fotos: solo en el detalle del producto
  created_at: string
  updated_at: string
}

export type Category = CategoryRef & {
  product_count: number
}

// --- Movimientos -------------------------------------------------------------

// in = Guardar, out = Sacar, adjust = Recontar
export type MovementType = 'in' | 'out' | 'adjust'

export type Movement = {
  id: string
  product_id: string
  product_name: string
  type: MovementType
  delta: number // cuánto cambió el stock: +4, -2… (en un recuento, la diferencia)
  unit: string
  reason: string
  user_id: string
  user_name: string
  created_at: string
}

export type Location = {
  id: string
  name: string
  description: string
  parent_id: string | null // null = está en el primer nivel (no dentro de otra)
  product_count: number
}

// --- Administración ----------------------------------------------------------

// Alguien con acceso a un proyecto (el admin no aparece: ya tiene acceso a todo)
export type Member = {
  id: string
  email: string
  name: string
  role: 'editor' | 'viewer'
}
