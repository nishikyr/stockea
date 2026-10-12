import { RefreshCw } from 'lucide-react'
import { useId } from 'react'
import { MIN_PASSWORD, generatePassword } from '../../lib/password'

// Contraseña que el admin pone a otra persona: visible (la va a compartir) y con botón para generar otra.
export function PasswordInput({ value, onChange, label = 'Contraseña' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const id = useId()
  const short = value.length > 0 && value.length < MIN_PASSWORD
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold">{label}</label>
      <div className="flex gap-2">
        <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off"
          spellCheck={false} minLength={MIN_PASSWORD} maxLength={72} required
          className="h-14 min-w-0 flex-1 rounded-2xl border-[1.5px] border-line bg-cream px-4 font-mono text-[17px] outline-none
            focus:border-brand" />
        <button type="button" onClick={() => onChange(generatePassword())} aria-label="Generar otra contraseña"
          className="flex size-14 flex-none items-center justify-center rounded-2xl border-[1.5px] border-line bg-cream text-brand">
          <RefreshCw size={20} aria-hidden="true" />
        </button>
      </div>
      <p className={`text-sm ${short ? 'font-medium text-out' : 'text-muted'}`}>Mínimo {MIN_PASSWORD} caracteres.</p>
    </div>
  )
}
