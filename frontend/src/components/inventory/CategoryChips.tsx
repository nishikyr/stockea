import type { ReactNode } from 'react'
import type { CategoryFilter } from '../../lib/filterProducts'
import type { Category } from '../../types/api'

type Props = {
  categories: Category[]
  showUncategorized: boolean
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}

// Fila de "pastillas" para filtrar por categoría. Se desliza en horizontal si no caben.
export function CategoryChips({ categories, showUncategorized, value, onChange }: Props) {
  // Solo enseñamos las categorías que tienen algo (y la elegida, aunque se quede vacía)
  const visible = categories.filter((c) => c.product_count > 0 || c.id === value)
  if (visible.length === 0 && !showUncategorized) return null

  return (
    <div role="group" aria-label="Categorías"
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      <Chip active={value === 'all'} onClick={() => onChange('all')}>Todo</Chip>
      {visible.map((c) => (
        <Chip key={c.id} active={value === c.id} onClick={() => onChange(c.id)}>
          <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
          {c.name}
        </Chip>
      ))}
      {showUncategorized && (
        <Chip active={value === 'none'} onClick={() => onChange('none')}>Sin categoría</Chip>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // aria-pressed: un lector de pantalla dirá "Herramientas, botón, pulsado"
      aria-pressed={active}
      className={`flex h-11 flex-none items-center gap-2 rounded-full px-4 text-[15px] whitespace-nowrap transition-colors ${
        active ? 'bg-ink font-semibold text-cream' : 'border-[1.5px] border-line bg-cream font-medium text-ink'
      }`}
    >
      {children}
    </button>
  )
}
