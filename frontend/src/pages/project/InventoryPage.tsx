import { useState } from 'react'
import { useCategories, useProducts } from '../../api/inventory'
import { useCurrentProject } from '../../api/projects'
import { CategoryChips } from '../../components/inventory/CategoryChips'
import { LowStockBanner } from '../../components/inventory/LowStockBanner'
import { ProductRow } from '../../components/inventory/ProductRow'
import { SearchBox } from '../../components/inventory/SearchBox'
import { EmptyState, ErrorMessage, Loading } from '../../components/StatusMessage'
import { Button } from '../../components/ui/Button'
import { filterProducts, type CategoryFilter } from '../../lib/filterProducts'
import { plural } from '../../lib/format'

export function InventoryPage() {
  const { projectId, data: project } = useCurrentProject()
  const products = useProducts(projectId)
  const categories = useCategories(projectId)

  // Estado de los filtros: vive solo en esta pantalla
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [lowOnly, setLowOnly] = useState(false)

  const all = products.data ?? []
  const low = all.filter((p) => p.low_stock)
  // No guardamos la lista filtrada en otro useState: se calcula en cada render a partir
  // de los datos + los filtros. Así nunca puede quedarse "desincronizada".
  const visible = filterProducts(all, { search, category, lowOnly })
  const hasFilters = search !== '' || category !== 'all' || lowOnly
  const canEdit = project?.role !== 'viewer'

  function clearFilters() {
    setSearch('')
    setCategory('all')
    setLowOnly(false)
  }

  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">Inventario</h1>
        {products.data && (
          <p className="mt-1.5 text-[15px] text-muted">
            {plural(all.length, 'producto', 'productos')}
            {low.length > 0 && <span className="whitespace-nowrap"> · {low.length} con stock bajo</span>}
          </p>
        )}
      </div>

      {products.isPending && <Loading />}
      {products.error && (
        <ErrorMessage message={products.error.message} onRetry={() => void products.refetch()} />
      )}

      {products.data && all.length === 0 && (
        <EmptyState title="El trastero está vacío">
          {canEdit
            ? 'Cuando añadas el primer producto aparecerá aquí.'
            : 'Todavía no se ha guardado nada. Cuando se añadan cosas las verás aquí.'}
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
    </main>
  )
}
