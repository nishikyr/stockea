import type { ReactNode } from 'react'
import { Button } from './ui/Button'

// Mensajes de "cargando", "error" o "no hay nada", con el mismo aspecto en toda la app
export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return (
    <p role="status" className="py-12 text-center text-muted">
      {text}
    </p>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl bg-out-soft p-6 text-center">
      <p className="font-medium text-out">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line p-8 text-center">
      <p className="font-display text-xl font-bold">{title}</p>
      {children && <div className="text-muted">{children}</div>}
    </div>
  )
}
