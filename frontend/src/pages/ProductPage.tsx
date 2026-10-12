import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ListChecks, MapPin } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useProduct } from '../api/inventory'
import { useMovements, type MovementResult } from '../api/movements'
import { useProject } from '../api/projects'
import { Flash } from '../components/Flash'
import { MovementSheet } from '../components/movements/MovementSheet'
import { CategoryIcon } from '../components/inventory/CategoryIcon'
import { MovementList } from '../components/movements/MovementList'
import { PhotoStrip } from '../components/inventory/PhotoStrip'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusMessage'
import { categoryTint } from '../lib/categoryStyle'
import { qty } from '../lib/format'
import { useRouteFlash } from '../lib/useRouteFlash'
import type { MovementType } from '../types/api'

// Ficha de un producto: fotos, cuántos hay, botones para moverlo y su historial.
export function ProductPage() {
  const { projectId = '', productId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: product, isPending, error } = useProduct(projectId, productId)
  const movements = useMovements(projectId, { productId }, 10)
  const { data: project } = useProject(projectId)
  const canEdit = project !== undefined && project.role !== 'viewer'

  // Qué hoja está abierta (null = ninguna) y el mensaje de "hecho"
  const [sheet, setSheet] = useState<MovementType | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  // useCallback: la misma función en cada render, para que el temporizador de Flash no se reinicie
  const hideFlash = useCallback(() => setFlash(null), [])
  // …y el que nos manda el formulario al crear un producto ("Producto añadido.")
  const routeFlash = useRouteFlash()

  function handleDone(result: MovementResult, type: MovementType) {
    const left = qty(result.new_quantity, result.movement.unit)
    const delta = qty(Math.abs(result.movement.delta), result.movement.unit)
    setFlash(type === 'out' ? `Sacado: ${delta}. Quedan ${left}.` : type === 'in' ? `Guardado: ${delta}. Hay ${left}.` : `Recuento guardado: hay ${left}.`)
  }

  // "Atrás": si venimos de dentro de la app, volvemos a donde estábamos (con los filtros puestos).
  // Si se abrió el enlace directamente, no hay "atrás": vamos al inventario.
  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate(`/projects/${projectId}`)
  }

  const all = movements.data?.pages.flat() ?? []

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-4 pb-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-semibold text-ink"
        >
          <ChevronLeft size={22} aria-hidden="true" /> Volver
        </button>
        {canEdit && product && (
          <Link to="edit" className="-mr-3 flex min-h-11 items-center px-3 font-semibold text-brand">Editar</Link>
        )}
      </div>

      {isPending && <Loading />}
      {error && (
        <div className="flex flex-col items-center gap-3">
          <ErrorMessage message={error.message} />
          <Link to={`/projects/${projectId}`} className="font-semibold text-brand">Ir al inventario</Link>
        </div>
      )}

      {product && (
        <>
          {product.photos && product.photos.length > 0 && (
            <PhotoStrip photos={product.photos} name={product.name} />
          )}

          <section className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3.5">
              {!product.photos?.length && (
                <span className="flex size-18 flex-none items-center justify-center rounded-[20px]"
                  style={categoryTint(product.category?.color)}>
                  <CategoryIcon name={product.category?.icon} size={34} />
                </span>
              )}
              <div className="flex min-w-0 flex-col items-start gap-1.5">
                {product.category && (
                  <span className="rounded-full px-2.5 py-0.5 text-[13px] font-bold"
                    style={categoryTint(product.category.color)}>
                    {product.category.name}
                  </span>
                )}
                <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight">{product.name}</h1>
              </div>
            </div>
            {product.location && (
              <p className="flex items-center gap-2 text-[15px] text-muted">
                <MapPin size={18} aria-hidden="true" className="flex-none" /> {product.location.name}
              </p>
            )}
            {product.description && <p className="text-[15px] whitespace-pre-line">{product.description}</p>}
          </section>

          <section
            className={`flex flex-col gap-4.5 rounded-3xl bg-cream p-5 ${
              product.low_stock ? 'shadow-[inset_0_0_0_2px_#E8B06A]' : ''
            }`}
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[15px] text-muted">Hay ahora</p>
                <p className={`font-display text-[56px] leading-none font-bold ${product.low_stock ? 'text-warn' : ''}`}>
                  {product.quantity} <span className="text-[22px] font-semibold">{product.unit}</span>
                </p>
              </div>
              <div className="mb-1.5 flex flex-col items-end gap-1 text-right">
                {product.low_stock && (
                  <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[13px] font-bold text-warn">
                    {product.quantity === 0 ? 'Agotado' : 'Stock bajo'}
                  </span>
                )}
                {product.min_quantity > 0 && <p className="text-sm text-muted">Mínimo: {product.min_quantity}</p>}
              </div>
            </div>

            {canEdit && (
              <div className="grid grid-cols-3 gap-2.5">
                <ActionButton primary icon={ArrowUpFromLine} label="Sacar" disabled={product.quantity === 0}
                  onClick={() => setSheet('out')} />
                <ActionButton icon={ArrowDownToLine} label="Guardar" onClick={() => setSheet('in')} />
                <ActionButton icon={ListChecks} label="Recontar" onClick={() => setSheet('adjust')} />
              </div>
            )}
          </section>

          {flash && <Flash message={flash} onHide={hideFlash} />}
          {routeFlash.flash && <Flash message={routeFlash.flash} tone={routeFlash.tone} onHide={routeFlash.hide} />}

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold">Movimientos</h2>
            {movements.isPending && <Loading />}
            {movements.data && all.length === 0 && <EmptyState title="Sin movimientos todavía" />}
            {all.length > 0 && (
              <MovementList
                movements={all}
                variant="product"
                hasMore={movements.hasNextPage}
                loadingMore={movements.isFetchingNextPage}
                onLoadMore={() => void movements.fetchNextPage()}
              />
            )}
          </section>
        </>
      )}

      {/* La hoja solo existe mientras está abierta: al cerrarse se desmonta y se resetea sola */}
      {product && sheet && (
        <MovementSheet projectId={projectId} product={product} initialType={sheet}
          onClose={() => setSheet(null)} onDone={handleDone} />
      )}
    </main>
  )
}

type ActionProps = {
  icon: typeof ArrowUpFromLine
  label: string
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}

function ActionButton({ icon: Icon, label, onClick, primary, disabled }: ActionProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex h-18 flex-col items-center justify-center gap-1 rounded-[18px] text-[15px] font-bold
        disabled:opacity-40 ${primary ? 'bg-brand text-white' : 'border-[1.5px] border-line bg-cream text-ink'}`}>
      <Icon size={24} aria-hidden="true" />
      {label}
    </button>
  )
}
