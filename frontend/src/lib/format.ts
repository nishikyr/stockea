import type { Role } from '../types/api'

// "1 producto", "3 productos"
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

// Nombres de los roles tal y como se ven en pantalla
export const roleLabel: Record<Role, string> = {
  admin: 'Administrador',
  editor: 'Técnico de mantenimiento',
  viewer: 'Solo ver',
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? ''
}
