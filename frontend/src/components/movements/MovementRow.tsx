import { Link, useParams } from 'react-router'
import { shortWhen, timeOf } from '../../lib/dates'
import type { Movement, MovementType } from '../../types/api'

const pillTone: Record<MovementType, string> = {
  out: 'bg-out-soft text-out',
  in: 'bg-in-soft text-in',
  adjust: 'bg-adjust-soft text-adjust',
}

// Cómo se llama cada tipo cuando no hay motivo escrito
const movementLabel: Record<MovementType, string> = {
  out: 'Sacado',
  in: 'Guardado',
  adjust: 'Recuento',
}

// "+4", "−2" (con el signo menos tipográfico, que se lee mejor) o "±0"
function formatDelta(delta: number) {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `−${Math.abs(delta)}`
  return '±0'
}

type Props = {
  movement: Movement
  // "project": en el Historial (título = producto, la fecha ya va en el encabezado del día)
  // "product": en la ficha del producto (título = motivo)
  variant: 'project' | 'product'
}

export function MovementRow({ movement: m, variant }: Props) {
  const { projectId } = useParams()
  const label = movementLabel[m.type]
  const reason = m.reason || (m.type === 'adjust' ? label : '')

  const title = variant === 'project' ? m.product_name : m.reason || label
  const details =
    variant === 'project'
      ? [reason, m.user_name, timeOf(m.created_at)]
      : [m.user_name, shortWhen(m.created_at)]

  const content = (
    <>
      <span
        className={`flex h-8.5 min-w-13 flex-none items-center justify-center rounded-[10px] px-2 font-bold
          ${pillTone[m.type]}`}
        // El lector de pantalla dice "Sacado 2", no "menos 2"
        aria-label={`${label} ${Math.abs(m.delta)}`}
      >
        {formatDelta(m.delta)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-semibold">{title}</span>
        <span className="truncate text-sm text-muted">{details.filter(Boolean).join(' · ')}</span>
      </span>
    </>
  )

  const box = 'flex items-center gap-3 rounded-2xl bg-cream px-3.5 py-3'
  // En el Historial, cada fila lleva a la ficha de su producto
  return variant === 'project' ? (
    <Link to={`/projects/${projectId}/products/${m.product_id}`} className={`${box} text-ink`}>
      {content}
    </Link>
  ) : (
    <div className={box}>{content}</div>
  )
}
