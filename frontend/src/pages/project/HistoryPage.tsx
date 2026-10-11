import { useSearchParams } from 'react-router'
import { useMovements } from '../../api/movements'
import { useCurrentProject } from '../../api/projects'
import { MovementList } from '../../components/movements/MovementList'
import { EmptyState, ErrorMessage, Loading } from '../../components/StatusMessage'
import { Chip, ChipRow } from '../../components/ui/Chip'
import type { MovementType } from '../../types/api'

const filters: { value: MovementType | undefined; label: string }[] = [
  { value: undefined, label: 'Todo' },
  { value: 'out', label: 'Salidas' },
  { value: 'in', label: 'Entradas' },
  { value: 'adjust', label: 'Recuentos' },
]

// El "changelog" del trastero: todo lo que ha entrado y salido, agrupado por días.
export function HistoryPage() {
  const { projectId } = useCurrentProject()
  // El filtro vive en la URL (?type=out): si recargas o vuelves atrás, sigue puesto
  const [params, setParams] = useSearchParams()
  const type = (params.get('type') as MovementType | null) ?? undefined
  const movements = useMovements(projectId, { type })

  const all = movements.data?.pages.flat() ?? []

  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">Historial</h1>
        <p className="mt-1.5 text-[15px] text-muted">Qué ha entrado y salido del trastero</p>
      </div>

      <ChipRow label="Filtrar movimientos">
        {filters.map((f) => (
          <Chip
            key={f.label}
            active={type === f.value}
            onClick={() => setParams(f.value ? { type: f.value } : {}, { replace: true })}
          >
            {f.label}
          </Chip>
        ))}
      </ChipRow>

      {movements.isPending && <Loading />}
      {movements.error && (
        <ErrorMessage message={movements.error.message} onRetry={() => void movements.refetch()} />
      )}
      {movements.data && all.length === 0 && (
        <EmptyState title={type ? 'Nada de este tipo todavía' : 'Aún no hay movimientos'}>
          Cada vez que algo entre o salga del trastero quedará apuntado aquí.
        </EmptyState>
      )}
      {all.length > 0 && (
        <MovementList
          movements={all}
          variant="project"
          hasMore={movements.hasNextPage}
          loadingMore={movements.isFetchingNextPage}
          onLoadMore={() => void movements.fetchNextPage()}
        />
      )}
    </main>
  )
}
