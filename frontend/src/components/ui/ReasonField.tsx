import { useId } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  label?: string
}

// Motivo de un movimiento: unas sugerencias de un toque + un campo para escribir lo que quieras.
export function ReasonField({ value, onChange, suggestions, label = 'Motivo' }: Props) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label} <span className="font-normal text-muted">(opcional)</span>
      </label>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onChange(value === s ? '' : s)} aria-pressed={value === s}
              className={`h-10 rounded-full px-4 text-[15px] font-medium ${
                value === s ? 'bg-ink text-cream' : 'border-[1.5px] border-line bg-cream text-ink'
              }`}>
              {s}
            </button>
          ))}
        </div>
      )}
      <input id={id} type="text" value={value} maxLength={200} onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe un motivo…"
        className="h-13 rounded-2xl border-[1.5px] border-line bg-cream px-4 text-[17px] outline-none
          placeholder:text-muted focus:border-brand" />
    </div>
  )
}
