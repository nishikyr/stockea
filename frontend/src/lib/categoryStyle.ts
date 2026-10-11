import {
  Armchair, Bike, BookOpen, Box, CookingPot, FileText, Lightbulb, Package, Plug, Puzzle,
  Shirt, SprayCan, Star, Wrench, type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

// El backend guarda el icono como texto ("wrench"). Aquí decidimos qué dibujo es cada nombre.
// Cuando hagamos el formulario de categorías, ofreceremos exactamente esta lista.
export const categoryIcons: Record<string, LucideIcon> = {
  wrench: Wrench,
  lightbulb: Lightbulb,
  star: Star,
  shirt: Shirt,
  armchair: Armchair,
  kitchen: CookingPot,
  book: BookOpen,
  bike: Bike,
  document: FileText,
  plug: Plug,
  toy: Puzzle,
  cleaning: SprayCan,
  box: Box,
}

export function categoryIcon(name: string | undefined): LucideIcon {
  return (name && categoryIcons[name]) || Package
}

const DEFAULT_COLOR = '#64748b'

// Del color de la categoría sacamos un fondo suave y un tono oscuro para el icono.
// color-mix() es CSS moderno: mezcla dos colores en el navegador, sin calcular nada en JS.
export function categoryTint(color: string | undefined): CSSProperties {
  const c = color || DEFAULT_COLOR
  return {
    backgroundColor: `color-mix(in srgb, ${c} 20%, #FFFCF7)`,
    color: `color-mix(in srgb, ${c} 75%, #2A241E)`,
  }
}
