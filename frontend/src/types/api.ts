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
