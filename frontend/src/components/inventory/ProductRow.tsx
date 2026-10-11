import { categoryTint } from '../../lib/categoryStyle'
import type { Product } from '../../types/api'
import { CategoryIcon } from './CategoryIcon'

// Una fila del inventario: foto (o icono de la categoría), nombre, dónde está y cuántos quedan.
// En el paso 6 la convertiremos en enlace a la ficha del producto.
export function ProductRow({ product }: { product: Product }) {
  const { name, quantity, unit, low_stock, location, category, photo_url } = product
  const soldOut = quantity === 0

  return (
    <div
      className={`flex items-center gap-3.5 rounded-[20px] bg-cream p-3 ${
        low_stock ? 'shadow-[inset_0_0_0_2px_#E8B06A]' : ''
      }`}
    >
      {photo_url ? (
        <img src={photo_url} alt="" loading="lazy" className="size-14 flex-none rounded-2xl bg-line object-cover" />
      ) : (
        <span
          className="flex size-14 flex-none items-center justify-center rounded-2xl"
          style={categoryTint(category?.color)}
        >
          <CategoryIcon name={category?.icon} />
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="w-full truncate text-[17px] font-semibold">{name}</p>
        {low_stock && (
          <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[13px] font-bold text-warn">
            {soldOut ? 'Agotado' : 'Stock bajo'}
          </span>
        )}
        {location && <p className="w-full truncate text-sm text-muted">{location.name}</p>}
      </div>

      <div className="flex flex-col items-end">
        <span className={`font-display text-[26px] leading-none font-bold ${low_stock ? 'text-warn' : ''}`}>
          {quantity}
        </span>
        <span className="text-[13px] text-muted">{unit}</span>
      </div>
    </div>
  )
}
