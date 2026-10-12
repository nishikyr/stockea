import { useState, type FormEvent } from 'react'
import { useChangeOwnPassword } from '../../api/admin'
import { MIN_PASSWORD } from '../../lib/password'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

// Cambiar TU contraseña (cualquier usuario). Pide la actual: si alguien coge tu móvil con la
// sesión abierta, no puede cambiártela sin saberla.
export function ChangePasswordForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const mutation = useChangeOwnPassword()

  const mismatch = repeat.length > 0 && next !== repeat
  const valid = current && next.length >= MIN_PASSWORD && next === repeat

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    mutation.mutate({ current_password: current, new_password: next }, { onSuccess })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-cream p-5">
      <h2 className="font-display text-xl font-bold">Cambiar mi contraseña</h2>
      {/* autoComplete ayuda a los gestores de contraseñas del móvil a rellenar y guardar */}
      <Input label="Contraseña actual" type="password" value={current} autoComplete="current-password"
        onChange={(e) => setCurrent(e.target.value)} required />
      <Input label="Contraseña nueva" type="password" value={next} autoComplete="new-password" minLength={MIN_PASSWORD}
        onChange={(e) => setNext(e.target.value)} required
        error={next.length > 0 && next.length < MIN_PASSWORD ? `Mínimo ${MIN_PASSWORD} caracteres` : undefined} />
      <Input label="Repite la nueva" type="password" value={repeat} autoComplete="new-password"
        onChange={(e) => setRepeat(e.target.value)} required error={mismatch ? 'No coinciden' : undefined} />
      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}
