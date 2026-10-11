import { EmptyState } from '../../components/StatusMessage'

// Provisional: en el paso 6 aquí irá el historial de entradas y salidas.
export function HistoryPage() {
  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">Historial</h1>
      <EmptyState title="Muy pronto">Aquí verás cada cosa que entra y sale del trastero.</EmptyState>
    </main>
  )
}
