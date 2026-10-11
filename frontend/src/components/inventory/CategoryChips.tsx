import type { CategoryFilter } from '../../lib/filterProducts'
import type { Category } from '../../types/api'
import { Chip, ChipRow } from '../ui/Chip'

type Props = {
  categories: Category[]
  showUncategorized: boolean
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}

// Filtro por categoría. Usa los Chip genéricos de components/ui.
export function CategoryChips({ categories, showUncategorized, value, onChange }: Props) {
  // Solo enseñamos las categorías que tienen algo (y la elegida, aunque se quede vacía)
  const visible = categories.filter((c) => c.product_count > 0 || c.id === value)
  if (visible.length === 0 && !showUncategorized) return null

  return (
    <ChipRow label="Categorías">
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
    </ChipRow>
  )
}
