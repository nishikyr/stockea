import { createElement } from 'react'
import { categoryIcon } from '../../lib/categoryStyle'

// Dibuja el icono de una categoría a partir de su nombre ("wrench" → llave inglesa).
// Usamos createElement en vez de <Icon /> porque el componente se elige en cada render
// y el linter de React (con razón, en general) desconfía de los componentes "creados" al vuelo.
export function CategoryIcon({ name, size = 26 }: { name?: string; size?: number }) {
  return createElement(categoryIcon(name), { size, 'aria-hidden': true })
}
