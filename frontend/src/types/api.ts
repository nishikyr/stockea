// Tipos de lo que devuelve la API. Copian los DTO del backend (internal/dto).

export type User = {
  id: string
  email: string
  name: string
  is_admin: boolean
}
