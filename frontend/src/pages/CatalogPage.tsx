import { ChevronLeft, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCategories, useDeleteCategory, useDeleteLocation, useLocations } from '../api/inventory'
import { useProject } from '../api/projects'
import { CategoryIcon } from '../components/inventory/CategoryIcon'
import { CategoryForm } from '../components/product/CategoryForm'
import { LocationForm } from '../components/product/LocationForm'
import { ErrorMessage, Loading } from '../components/StatusMessage'
import { Button } from '../components/ui/Button'
import { categoryTint } from '../lib/categoryStyle'
import { plural } from '../lib/format'
import { locationOptions } from '../lib/locations'
import type { Category, Location } from '../types/api'

// Qué fila se está editando o borrando ahora mismo (solo una a la vez)
type Editing =
  | { kind: 'new-category' }
  | { kind: 'new-location' }
  | { kind: 'category'; id: string; mode: 'edit' | 'delete' }
  | { kind: 'location'; id: string; mode: 'edit' | 'delete' }
  | null

// "Categorías y ubicaciones": ver, crear, renombrar y borrar (técnicos y admin).
export function CatalogPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(projectId)
  const categories = useCategories(projectId)
  const locations = useLocations(projectId)
  const [editing, setEditing] = useState<Editing>(null)
  const close = () => setEditing(null)

  const allLocations = locations.data ?? []
  const byId = new Map(allLocations.map((l) => [l.id, l]))

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      <button type="button" onClick={() => navigate(-1)}
        className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-semibold text-ink">
        <ChevronLeft size={22} aria-hidden="true" /> Volver
      </button>

      {project.data?.role === 'viewer' ? (
        <ErrorMessage message="Con tu acceso puedes ver el trastero, pero no cambiar categorías ni ubicaciones." />
      ) : (
        <>
          <div>
            <p className="text-[15px] font-semibold text-muted">{project.data?.name}</p>
            <h1 className="font-display text-[32px] leading-tight font-bold tracking-tight">Categorías y ubicaciones</h1>
          </div>

          {/* ---------------- Categorías ---------------- */}
          <section className="flex flex-col gap-3" aria-labelledby="h-cat">
            <div className="flex items-center justify-between">
              <h2 id="h-cat" className="font-display text-xl font-bold">Categorías</h2>
              <AddButton label="Nueva categoría" onClick={() => setEditing({ kind: 'new-category' })} />
            </div>
            {editing?.kind === 'new-category' && <CategoryForm projectId={projectId} onSaved={close} onCancel={close} />}
            {categories.isPending && <Loading />}
            {categories.error && <ErrorMessage message={categories.error.message} />}
            {categories.data?.length === 0 && <Empty>Aún no hay categorías.</Empty>}
            <ul className="flex flex-col gap-2.5">
              {categories.data?.map((c) =>
                editing?.kind === 'category' && editing.id === c.id && editing.mode === 'edit' ? (
                  <li key={c.id}><CategoryForm projectId={projectId} category={c} onSaved={close} onCancel={close} /></li>
                ) : (
                  <CategoryRow key={c.id} projectId={projectId} category={c}
                    deleting={editing?.kind === 'category' && editing.id === c.id && editing.mode === 'delete'}
                    onEdit={() => setEditing({ kind: 'category', id: c.id, mode: 'edit' })}
                    onDelete={() => setEditing({ kind: 'category', id: c.id, mode: 'delete' })}
                    onCancel={close} />
                ),
              )}
            </ul>
          </section>

          {/* ---------------- Ubicaciones ---------------- */}
          <section className="flex flex-col gap-3" aria-labelledby="h-loc">
            <div className="flex items-center justify-between">
              <h2 id="h-loc" className="font-display text-xl font-bold">Ubicaciones</h2>
              <AddButton label="Nueva ubicación" onClick={() => setEditing({ kind: 'new-location' })} />
            </div>
            {editing?.kind === 'new-location' && (
              <LocationForm projectId={projectId} locations={allLocations} onSaved={close} onCancel={close} />
            )}
            {locations.isPending && <Loading />}
            {locations.error && <ErrorMessage message={locations.error.message} />}
            {locations.data?.length === 0 && <Empty>Aún no hay ubicaciones.</Empty>}
            <ul className="flex flex-col gap-2.5">
              {locationOptions(allLocations).map(({ id, depth }) => {
                const loc = byId.get(id)!
                const inside = allLocations.filter((l) => l.parent_id === id)
                return editing?.kind === 'location' && editing.id === id && editing.mode === 'edit' ? (
                  <li key={id}>
                    <LocationForm projectId={projectId} locations={allLocations} location={loc} onSaved={close} onCancel={close} />
                  </li>
                ) : (
                  <LocationRow key={id} projectId={projectId} location={loc} depth={depth} inside={inside}
                    deleting={editing?.kind === 'location' && editing.id === id && editing.mode === 'delete'}
                    onEdit={() => setEditing({ kind: 'location', id, mode: 'edit' })}
                    onDelete={() => setEditing({ kind: 'location', id, mode: 'delete' })}
                    onCancel={close} />
                )
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex min-h-11 items-center gap-1 px-1 font-semibold text-brand">
      <Plus size={18} aria-hidden="true" /> Nueva
    </button>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl border-2 border-dashed border-line p-4 text-center text-muted">{children}</p>
}

type RowActions = { deleting: boolean; onEdit: () => void; onDelete: () => void; onCancel: () => void }

function CategoryRow({ projectId, category: c, deleting, onEdit, onDelete, onCancel }: RowActions & { projectId: string; category: Category }) {
  const remove = useDeleteCategory(projectId)
  return (
    <li className="flex flex-col gap-3 rounded-[20px] bg-cream p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-12 flex-none items-center justify-center rounded-[14px]" style={categoryTint(c.color)}>
          <CategoryIcon name={c.icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{c.name}</p>
          <p className="text-sm text-muted">{plural(c.product_count, 'producto', 'productos')}</p>
        </div>
        <RowButtons name={c.name} onEdit={onEdit} onDelete={onDelete} />
      </div>
      {deleting && (
        <ConfirmDelete
          text={[`¿Borrar «${c.name}»?`, productsWillBe(c.product_count, 'Sin categoría')].join(' ')}
          pending={remove.isPending} error={remove.error?.message}
          onConfirm={() => remove.mutate(c.id, { onSuccess: onCancel })} onCancel={onCancel} />
      )}
    </li>
  )
}

type LocationRowProps = RowActions & { projectId: string; location: Location; depth: number; inside: Location[] }

function LocationRow({ projectId, location: l, depth, inside, deleting, onEdit, onDelete, onCancel }: LocationRowProps) {
  const remove = useDeleteLocation(projectId)
  const names = inside.map((ch) => `«${ch.name}»`).join(' y ')
  const parts = [
    `¿Borrar «${l.name}»?`,
    productsWillBe(l.product_count, 'Sin ubicación'),
    inside.length === 1 ? `${names} pasará a estar suelta en el trastero.` : '',
    inside.length > 1 ? `${names} pasarán a estar sueltas en el trastero.` : '',
  ]
  return (
    // La sangría muestra qué está dentro de qué (Estantería A → Caja 3)
    <li className="flex flex-col gap-3 rounded-[20px] bg-cream p-3" style={{ marginLeft: Math.min(depth, 4) * 20 }}>
      <div className="flex items-center gap-3">
        <span className="flex size-12 flex-none items-center justify-center rounded-[14px] bg-sand text-muted">
          <MapPin size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{l.name}</p>
          <p className="text-sm text-muted">{plural(l.product_count, 'producto', 'productos')}</p>
        </div>
        <RowButtons name={l.name} onEdit={onEdit} onDelete={onDelete} />
      </div>
      {deleting && (
        <ConfirmDelete text={parts.filter(Boolean).join(' ')} pending={remove.isPending} error={remove.error?.message}
          onConfirm={() => remove.mutate(l.id, { onSuccess: onCancel })} onCancel={onCancel} />
      )}
    </li>
  )
}

// "Su producto no se borra: quedará «Sin categoría»." / "Sus 2 productos no se borran: quedarán…"
function productsWillBe(count: number, label: string) {
  if (count === 0) return ''
  if (count === 1) return `Su producto no se borra: quedará «${label}».`
  return `Sus ${count} productos no se borran: quedarán «${label}».`
}

function RowButtons({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  const btn = 'flex size-11 flex-none items-center justify-center rounded-full text-muted hover:bg-sand'
  return (
    <>
      <button type="button" onClick={onEdit} aria-label={`Editar ${name}`} className={btn}>
        <Pencil size={19} aria-hidden="true" />
      </button>
      <button type="button" onClick={onDelete} aria-label={`Borrar ${name}`} className={btn}>
        <Trash2 size={19} aria-hidden="true" />
      </button>
    </>
  )
}

type ConfirmProps = { text: string; pending: boolean; error?: string; onConfirm: () => void; onCancel: () => void }

function ConfirmDelete({ text, pending, error, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-out-soft p-3">
      <p className="font-medium text-out">{text}</p>
      {error && <p role="alert" className="font-medium text-out">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>No</Button>
        <button type="button" disabled={pending} onClick={onConfirm}
          className="min-h-12 flex-1 rounded-2xl bg-out px-4 font-bold text-white disabled:opacity-50">
          {pending ? 'Borrando…' : 'Sí, borrar'}
        </button>
      </div>
    </div>
  )
}
