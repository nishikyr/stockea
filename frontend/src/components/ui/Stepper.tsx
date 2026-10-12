import { Minus, Plus } from 'lucide-react'

type Props = {
  value: number // NaN = el campo está vacío (la persona está escribiendo)
  onChange: (value: number) => void
  min: number
  max: number
  label: string // para lectores de pantalla: "Cantidad a sacar"
  size?: 'lg' | 'sm'
  editable?: boolean // ¿se puede escribir el número? (por defecto, solo en grande)
}

// Contador "− 2 +". Si es editable, el número también se puede escribir (para cantidades altas).
export function Stepper({ value, onChange, min, max, label, size = 'lg', editable = size === 'lg' }: Props) {
  const current = Number.isNaN(value) ? min : value
  const big = size === 'lg'
  const btn = `flex flex-none items-center justify-center rounded-full bg-brand-soft text-brand-dark
    disabled:opacity-40 ${big ? 'size-15' : 'size-11'}`

  return (
    <div className={`flex items-center ${big ? 'justify-center gap-4' : 'gap-2'}`}>
      <button type="button" className={btn} aria-label={`Una menos (${label})`}
        disabled={current <= min} onClick={() => onChange(Math.max(min, current - 1))}>
        <Minus size={big ? 28 : 20} aria-hidden="true" />
      </button>

      {editable ? (
        <input
          type="text"
          inputMode="numeric" // en el móvil abre el teclado de números
          aria-label={label}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '')
            onChange(digits === '' ? NaN : Math.min(max, Number(digits)))
          }}
          onFocus={(e) => e.target.select()}
          className={`bg-transparent text-center font-display leading-none font-bold outline-none focus:rounded-2xl
            focus:bg-sand ${big ? 'w-32 text-[64px]' : 'h-11 w-16 text-2xl'}`}
        />
      ) : (
        <span className="min-w-8 text-center font-display text-2xl font-bold" aria-live="polite">{current}</span>
      )}

      <button type="button" className={btn} aria-label={`Una más (${label})`}
        disabled={current >= max} onClick={() => onChange(Math.min(max, current + 1))}>
        <Plus size={big ? 28 : 20} aria-hidden="true" />
      </button>
    </div>
  )
}
