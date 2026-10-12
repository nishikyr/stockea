import { PackageMinus, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useCategories, useProducts } from '../../api/inventory'
import { useCurrentProject } from '../../api/projects'
import { Flash } from '../../components/Flash'
import { CategoryChips } from '../../components/inventory/CategoryChips'
import { LowStockBanner } from '../../components/inventory/LowStockBanner'
import { ProductRow } from '../../components/inventory/ProductRow'
import { SearchBox } from '../../components/inventory/SearchBox'
import { EmptyState, ErrorMessage, Loading } from '../../components/StatusMessage'
import { Button } from '../../components/ui/Button'
import { filterProducts, type CategoryFilter } from '../../lib/filterProducts'
import { plural } from '../../lib/format'
import { useRouteFlash } from '../../lib/useRouteFlash'

export function InventoryPage() {
  const { projectId, data: project } = useCurrentProject()
  const products = useProducts(projectId)
  const categories = useCategories(projectId)

  // Los filtros viven en la URL (?q=taladro&cat=…&low=1) y no en useState. Así, al entrar
  // en un producto y volver atrás, siguen puestos; y si recargas la página, también.
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const category: CategoryFilter = params.get('cat') ?? 'all'
  const lowOnly = params.get('low') === '1'

  // Cambia un filtro y deja los demás como estaban. replace: true → escribir en el buscador
  // no llena el historial del navegador (el botón Atrás no va letra a letra).
  function setFilter(key: 'q' | 'cat' | 'low', value: string | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }
  const setSearch = (v: string) => setFilter('q', v || null)
  const setCategory = (v: CategoryFilter) => setFilter('cat', v === 'all' ? null : v)
  const setLowOnly = (v: boolean) => setFilter('low', v ? '1' : null)

  const all = products.data ?? []
  const low = all.filter((p) => p.low_stock)
  // No guardamos la lista filtrada en otro useState: se calcula en cada render a partir
  // de los datos + los filtros. Así nunca puede quedarse "desincronizada".
  const visible = filterProducts(all, { search, category, lowOnly })
  const hasFilters = search !== '' || category !== 'all' || lowOnly
  const canEdit = project?.role !== 'viewer'

  // Mensaje que nos manda otra pantalla al volver ("Producto añadido", "Hecho: has sacado…")
  const { flash, tone, hide: hideFlash } = useRouteFlash()

  function clearFilters() {
    setParams({}, { replace: true })
  }

  return (
    <main className="flex flex-col gap-4">
      {flash && <Flash message={flash} tone={tone} onHide={hideFlash} />}

      <div>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">Inventario</h1>
        {products.data && (
          <p className="mt-1.5 text-[15px] text-muted">
            {plural(all.length, 'producto', 'productos')}
            {low.length > 0 && <span className="whitespace-nowrap"> · {low.length} con stock bajo</span>}
          </p>
        )}
      </div>

      {canEdit && all.some((p) => p.quantity > 0) && (
        <Link to="exit" className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-line
          bg-cream px-5 font-bold text-ink">
          <PackageMinus size={20} aria-hidden="true" /> Sacar varias cosas
        </Link>
      )}

      {products.isPending && <Loading />}
      {products.error && (
        <ErrorMessage message={products.error.message} onRetry={() => void products.refetch()} />
      )}

      {products.data && all.length === 0 && (
        <EmptyState title="El trastero está vacío">
          {canEdit ? (
            <Link to="products/new" className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-5
              font-bold text-white">
              <Plus size={20} aria-hidden="true" /> Añadir el primero
            </Link>
          ) : (
            'Todavía no se ha guardado nada. Cuando se añadan cosas las verás aquí.'
          )}
        </EmptyState>
      )}

      {all.length > 0 && (
        <>
          <SearchBox value={search} onChange={setSearch} />
          <CategoryChips
            categories={categories.data ?? []}
            showUncategorized={all.some((p) => !p.category)}
            value={category}
            onChange={setCategory}
          />
          <LowStockBanner lowProducts={low} active={lowOnly} onToggle={() => setLowOnly(!lowOnly)} />

          {/* aria-live: el lector de pantalla anuncia cuántos resultados hay al filtrar */}
          <p className="sr-only" aria-live="polite">
            {plural(visible.length, 'resultado', 'resultados')}
          </p>

          {visible.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {visible.map((p) => (
                <li key={p.id}>
                  <ProductRow product={p} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No hay nada que coincida">
              <p>{search ? `Nada encaja con «${search}».` : 'Ningún producto cumple estos filtros.'}</p>
              {hasFilters && (
                <Button variant="ghost" className="mt-2" onClick={clearFilters}>
                  Quitar filtros
                </Button>
              )}
            </EmptyState>
          )}
        </>
      )}

      {/* Botón flotante "Añadir" (solo quien puede editar). Se coloca sobre la barra de pestañas,
          alineado con la columna central también en pantallas anchas. */}
      {canEdit && all.length > 0 && (
        <Link to="products/new"
          className="fixed right-[max(1.25rem,calc(50%-14rem+1.25rem))] bottom-24 z-10 flex h-14 items-center gap-2
            rounded-full bg-brand pr-5.5 pl-4.5 text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(30,107,102,0.3)]">
          <Plus size={22} strokeWidth={2.4} aria-hidden="true" /> Añadir
        </Link>
      )}
    </main>
  )
}
