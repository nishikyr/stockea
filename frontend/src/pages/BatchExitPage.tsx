import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useProducts } from '../api/inventory'
import { useBatchMovement } from '../api/movements'
import { useProject } from '../api/projects'
import { CategoryIcon } from '../components/inventory/CategoryIcon'
import { SearchBox } from '../components/inventory/SearchBox'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusMessage'
import { Button } from '../components/ui/Button'
import { ReasonField } from '../components/ui/ReasonField'
import { Stepper } from '../components/ui/Stepper'
import { categoryTint } from '../lib/categoryStyle'
import { filterProducts } from '../lib/filterProducts'
import { plural, qty } from '../lib/format'
import type { Product } from '../types/api'

// "¿Qué te llevas?": marcar varios productos, cuántos de cada uno, un motivo… y sacarlos de golpe.
export function BatchExitPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { data: project } = useProject(projectId)
  const products = useProducts(projectId)
  const mutation = useBatchMovement(projectId)

  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  // Lo elegido: { idDelProducto: cantidad }. Un objeto es la forma más simple de "diccionario".
  const [selected, setSelected] = useState<Record<string, number>>({})

  const all = products.data ?? []
  const visible = filterProducts(all, { search, category: 'all', lowOnly: false })
  const chosen = all.filter((p) => selected[p.id])
  const total = chosen.reduce((sum, p) => sum + selected[p.id], 0)

  // Cambiar la cantidad de un producto. 0 = quitarlo de la lista.
  // Siempre creamos un objeto NUEVO: React solo repinta si el estado es otro objeto distinto.
  function setAmount(id: string, amount: number) {
    setSelected((prev) => {
      const next = { ...prev }
      if (amount > 0) next[id] = amount
      else delete next[id]
      return next
    })
    mutation.reset()
  }

  function goBack() {
    navigate(`/projects/${projectId}`)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate(
      {
        type: 'out',
        reason: reason.trim(),
        items: chosen.map((p) => ({ product_id: p.id, quantity: selected[p.id] })),
      },
      {
        // Volvemos al inventario y le pasamos un mensaje en el "state" de la navegación
        onSuccess: () =>
          navigate(`/projects/${projectId}`, {
            replace: true,
            state: { flash: `Hecho: has sacado ${plural(chosen.length, 'producto', 'productos')}.` },
          }),
      },
    )
  }

  if (project?.role === 'viewer') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-5">
        <ErrorMessage message="Con tu acceso puedes ver el trastero, pero no sacar cosas." />
        <Button variant="secondary" onClick={goBack}>Volver al inventario</Button>
      </main>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className={`flex flex-col gap-4 px-5 pt-4 ${chosen.length ? 'pb-96' : 'pb-10'}`}>
        <button type="button" onClick={goBack} className="-ml-2 min-h-11 w-fit px-2 font-semibold text-brand">
          Cancelar
        </button>
        <div>
          <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">¿Qué te llevas?</h1>
          <p className="mt-1.5 text-[15px] text-muted">Marca las cosas y cuántas sacas de cada una.</p>
        </div>

        {products.isPending && <Loading />}
        {products.error && <ErrorMessage message={products.error.message} />}
        {products.data && all.length === 0 && <EmptyState title="El trastero está vacío" />}

        {all.length > 0 && (
          <>
            <SearchBox value={search} onChange={setSearch} />
            <ul className="flex flex-col gap-2">
              {visible.map((p) => (
                <li key={p.id}>
                  <PickRow product={p} amount={selected[p.id] ?? 0} onChange={(n) => setAmount(p.id, n)} />
                </li>
              ))}
            </ul>
            {visible.length === 0 && <EmptyState title="No hay nada que coincida" />}
          </>
        )}
      </div>

      {/* Resumen fijo abajo: solo aparece cuando has elegido algo */}
      {chosen.length > 0 && (
        <section aria-label="Resumen de la salida"
          className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md flex-col gap-3 rounded-t-[28px] bg-cream
            px-5 pt-4.5 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(42,36,30,0.08)]">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl font-bold">{plural(chosen.length, 'producto', 'productos')}</span>
            <span className="text-muted">{plural(total, 'unidad', 'unidades')} en total</span>
          </div>
          <ReasonField value={reason} onChange={setReason} suggestions={['Mudanza', 'Me lo llevo', 'Prestado']} />
          {mutation.error && (
            <p role="alert" className="rounded-2xl bg-out-soft px-4 py-3 font-medium text-out">{mutation.error.message}</p>
          )}
          <Button type="submit" fullWidth disabled={mutation.isPending} className="min-h-14 text-[17px]">
            {mutation.isPending ? 'Sacando…' : `Sacar ${plural(chosen.length, 'producto', 'productos')}`}
          </Button>
        </section>
      )}
    </form>
  )
}

function PickRow({ product: p, amount, onChange }: { product: Product; amount: number; onChange: (n: number) => void }) {
  const empty = p.quantity === 0
  return (
    <div className={`flex items-center gap-3 rounded-[20px] bg-cream p-3 ${
      amount > 0 ? 'shadow-[inset_0_0_0_2px_var(--color-brand)]' : ''} ${empty ? 'opacity-55' : ''}`}>
      {p.photo_url ? (
        <img src={p.photo_url} alt="" loading="lazy" className="size-12 flex-none rounded-[14px] object-cover" />
      ) : (
        <span className="flex size-12 flex-none items-center justify-center rounded-[14px]" style={categoryTint(p.category?.color)}>
          <CategoryIcon name={p.category?.icon} size={22} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{p.name}</span>
        <span className="text-sm text-muted">{empty ? 'No queda' : `hay ${qty(p.quantity, p.unit)}`}</span>
      </span>
      {amount > 0 ? (
        // min 0: si bajas de 1, el producto sale de la lista
        <Stepper size="sm" value={amount} onChange={onChange} min={0} max={p.quantity} label={p.name} />
      ) : (
        <button type="button" disabled={empty} onClick={() => onChange(1)} aria-label={`Añadir ${p.name}`}
          className="flex size-11 flex-none items-center justify-center rounded-full bg-brand text-white disabled:bg-line">
          <Plus size={22} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
