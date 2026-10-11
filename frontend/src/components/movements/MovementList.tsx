import { dayKey, dayLabel } from '../../lib/dates'
import type { Movement } from '../../types/api'
import { Button } from '../ui/Button'
import { MovementRow } from './MovementRow'

type Props = {
  movements: Movement[]
  variant: 'project' | 'product'
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

// Agrupa los movimientos por día: "Hoy", "Ayer", "Lunes 5 oct"… como un changelog.
export function MovementList({ movements, variant, hasMore, loadingMore, onLoadMore }: Props) {
  const groups: { key: string; label: string; items: Movement[] }[] = []
  for (const m of movements) {
    const key = dayKey(m.created_at)
    const last = groups.at(-1)
    // Vienen ordenados del más nuevo al más viejo, así que basta con mirar el último grupo
    if (last?.key === key) last.items.push(m)
    else groups.push({ key, label: dayLabel(m.created_at), items: [m] })
  }

  return (
    <div className="flex flex-col gap-2.5">
      {variant === 'project'
        ? groups.map((g) => (
            <section key={g.key} className="flex flex-col gap-2.5 not-first:mt-2.5">
              <h2 className="text-sm font-bold tracking-wider text-muted uppercase">{g.label}</h2>
              <Rows items={g.items} variant={variant} />
            </section>
          ))
        : <Rows items={movements} variant={variant} />}

      {hasMore && (
        <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? 'Cargando…' : 'Ver más'}
        </Button>
      )}
    </div>
  )
}

function Rows({ items, variant }: { items: Movement[]; variant: Props['variant'] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((m) => (
        <li key={m.id}>
          <MovementRow movement={m} variant={variant} />
        </li>
      ))}
    </ul>
  )
}
