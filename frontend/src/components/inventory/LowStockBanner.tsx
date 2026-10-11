import { ChevronRight, TriangleAlert } from 'lucide-react'
import { plural } from '../../lib/format'
import type { Product } from '../../types/api'

type Props = {
  lowProducts: Product[]
  active: boolean
  onToggle: () => void
}

// Aviso naranja de "se está acabando algo". Al pulsarlo, la lista muestra solo esos productos.
export function LowStockBanner({ lowProducts, active, onToggle }: Props) {
  if (lowProducts.length === 0) return null

  let title: string
  let detail: string
  if (active) {
    title = 'Viendo solo lo que se acaba'
    detail = 'Pulsa para ver todo otra vez'
  } else if (lowProducts.length === 1) {
    const p = lowProducts[0]
    title = p.quantity === 0 ? `No queda: ${p.name}` : `Queda poco: ${p.name}`
    detail = `${p.quantity} ${p.unit} · el mínimo es ${p.min_quantity}`
  } else {
    title = `${plural(lowProducts.length, 'producto', 'productos')} con stock bajo`
    detail = 'Pulsa para verlos'
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className="flex w-full items-center gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-left text-[15px] text-warn"
    >
      <TriangleAlert size={22} aria-hidden="true" className="flex-none" />
      <span className="min-w-0 flex-1">
        <strong className="block font-bold">{title}</strong>
        {detail}
      </span>
      <ChevronRight size={18} aria-hidden="true" className={`flex-none transition-transform ${active ? 'rotate-90' : ''}`} />
    </button>
  )
}
