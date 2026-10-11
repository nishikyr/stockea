import { X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRegisterMovement, type MovementResult } from '../../api/movements'
import { qty } from '../../lib/format'
import type { MovementType, Product } from '../../types/api'
import { Button } from '../ui/Button'
import { ReasonField } from '../ui/ReasonField'
import { Stepper } from '../ui/Stepper'

const MAX = 1_000_000 // el mismo límite que el backend

const texts: Record<MovementType, { tab: string; title: string; question: string; reasons: string[] }> = {
  out: { tab: 'Sacar', title: 'Sacar del trastero', question: '¿Cuántas sacas?', reasons: ['Me lo llevo', 'Prestado', 'Se rompió'] },
  in: { tab: 'Guardar', title: 'Guardar en el trastero', question: '¿Cuántas guardas?', reasons: ['Lo he traído', 'Devuelto', 'Compra'] },
  adjust: { tab: 'Recontar', title: 'Recontar', question: '¿Cuántas hay de verdad?', reasons: [] },
}

type Props = {
  projectId: string
  product: Product
  initialType: MovementType
  onClose: () => void
  onDone: (result: MovementResult, type: MovementType) => void
}

// Hoja que sube desde abajo para registrar un movimiento de UN producto.
// Usa <dialog> nativo del navegador: con showModal() ya trae el fondo oscuro, la tecla Escape
// y que el foco no se escape detrás. No hace falta ninguna librería.
export function MovementSheet({ projectId, product, initialType, onClose, onDone }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [type, setType] = useState<MovementType>(initialType)
  const [amount, setAmount] = useState(initialType === 'adjust' ? product.quantity : 1)
  const [reason, setReason] = useState('')
  const mutation = useRegisterMovement(projectId, product.id)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function changeType(t: MovementType) {
    setType(t)
    setAmount(t === 'adjust' ? product.quantity : 1)
    setReason('')
    mutation.reset() // borra el error anterior, si lo había
  }

  // Cómo quedará el stock (se calcula, no se guarda en ningún estado)
  const valid = !Number.isNaN(amount)
  const after = !valid ? product.quantity : type === 'out' ? product.quantity - amount : type === 'in' ? product.quantity + amount : amount
  const min = type === 'adjust' ? 0 : 1
  const max = type === 'out' ? product.quantity : MAX
  const canSubmit = valid && amount >= min && amount <= max && !(type === 'adjust' && amount === product.quantity)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    mutation.mutate(
      { type, quantity: amount, reason: reason.trim() },
      {
        onSuccess: (result) => {
          onDone(result, type)
          dialogRef.current?.close()
        },
      },
    )
  }

  const t = texts[type]
  const submitText =
    type === 'out' ? `Sacar ${qty(amount || 0, product.unit)}`
    : type === 'in' ? `Guardar ${qty(amount || 0, product.unit)}`
    : 'Guardar recuento'

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="sheet-title"
      onClose={onClose}
      // Pulsar fuera de la hoja (en el fondo oscuro) la cierra
      onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-md rounded-t-[28px] bg-cream text-ink
        backdrop:bg-ink/45"
    >
      <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <span className="mx-auto h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="sheet-title" className="font-display text-2xl font-bold">{t.title}</h2>
            <p className="truncate text-muted">{product.name} · hay {qty(product.quantity, product.unit)}</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={() => dialogRef.current?.close()}
            className="-mr-2 flex size-11 flex-none items-center justify-center rounded-full text-muted">
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-3 gap-1 rounded-2xl bg-sand p-1">
          {(Object.keys(texts) as MovementType[]).map((key) => (
            <button key={key} type="button" role="radio" aria-checked={type === key}
              disabled={key === 'out' && product.quantity === 0}
              onClick={() => changeType(key)}
              className={`h-11 rounded-xl text-[15px] disabled:opacity-40 ${
                type === key ? 'bg-cream font-bold shadow-[0_1px_3px_rgba(42,36,30,0.12)]' : 'font-semibold text-muted'
              }`}>
              {texts[key].tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="font-semibold">{t.question}</p>
          <Stepper value={amount} onChange={setAmount} min={min} max={max} label={t.question} />
          <Preview type={type} after={after} product={product} valid={valid && canSubmit} />
        </div>

        <ReasonField value={reason} onChange={setReason} suggestions={t.reasons} />

        {mutation.error && (
          <p role="alert" className="rounded-2xl bg-out-soft px-4 py-3 font-medium text-out">{mutation.error.message}</p>
        )}

        <Button type="submit" fullWidth disabled={!canSubmit || mutation.isPending} className="min-h-14 text-[17px]">
          {mutation.isPending ? 'Guardando…' : submitText}
        </Button>
      </form>
    </dialog>
  )
}

// La frase de debajo del contador: "Quedará 1 ud · por debajo del mínimo"
function Preview({ type, after, product, valid }: { type: MovementType; after: number; product: Product; valid: boolean }) {
  if (type === 'adjust' && after === product.quantity) {
    return <p className="text-center text-muted">Es lo mismo que ya había: cambia el número si has contado otro.</p>
  }
  if (!valid) return <p className="text-center text-muted">Elige una cantidad.</p>
  const low = after <= product.min_quantity
  const verb = type === 'out' ? 'Quedará' : type === 'in' ? 'Habrá' : 'Pasará a haber'
  const diff = after - product.quantity
  return (
    <p className={`text-center ${low ? 'text-warn' : 'text-muted'}`}>
      {verb} <strong className="font-bold">{qty(after, product.unit)}</strong>
      {type === 'adjust' && ` (${diff > 0 ? '+' : '−'}${Math.abs(diff)})`}
      {after === 0 ? ' · se acaba' : low ? ' · por debajo del mínimo' : ''}
    </p>
  )
}
