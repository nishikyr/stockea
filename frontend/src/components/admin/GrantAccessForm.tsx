import { useState, type FormEvent } from 'react'
import { useCreateUser, useSetMember } from '../../api/admin'
import { ApiError } from '../../api/client'
import { roleLabel } from '../../lib/format'
import { MIN_PASSWORD, generatePassword } from '../../lib/password'
import type { Member } from '../../types/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { CredentialsCard } from './CredentialsCard'
import { PasswordInput } from './PasswordInput'

// "Dar acceso a alguien": email + rol. Si esa persona aún no tiene cuenta, el formulario
// se amplía para crearla (nombre + contraseña) y darle acceso en el mismo paso.
export function GrantAccessForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Member['role']>('viewer')
  const [needsAccount, setNeedsAccount] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null)
  const [done, setDone] = useState('')

  const setMember = useSetMember(projectId)
  const createUser = useCreateUser()
  const pending = setMember.isPending || createUser.isPending
  const error = createUser.error ?? setMember.error

  function reset() {
    setEmail('')
    setName('')
    setPassword('')
    setRole('viewer')
    setNeedsAccount(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setDone('')
    setCreated(null)
    const cleanEmail = email.trim().toLowerCase()
    try {
      if (needsAccount) {
        // 1) crear la cuenta  2) darle acceso. Con async/await se lee de arriba abajo.
        await createUser.mutateAsync({ email: cleanEmail, name: name.trim(), password })
        await setMember.mutateAsync({ email: cleanEmail, role })
        setCreated({ name: name.trim(), email: cleanEmail, password })
        reset()
        return
      }
      const member = await setMember.mutateAsync({ email: cleanEmail, role })
      setDone(`${member.name} ya tiene acceso (${roleLabel[member.role]}).`)
      reset()
    } catch (err) {
      // 404 = no existe ninguna cuenta con ese email → ofrecemos crearla
      if (!needsAccount && err instanceof ApiError && err.status === 404) {
        setNeedsAccount(true)
        setPassword(generatePassword())
        setMember.reset() // no mostramos ese 404 como error: ya lo estamos resolviendo
      }
      // el resto de errores ya los muestra el formulario (createUser.error / setMember.error)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-cream p-5">
      <h2 className="font-display text-xl font-bold">Dar acceso a alguien</h2>

      {created && <CredentialsCard {...created} onDone={() => setCreated(null)} />}
      {done && <p role="status" className="rounded-2xl bg-in-soft px-4 py-3 font-semibold text-in">{done}</p>}

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <Input label="Email de la persona" type="email" value={email} required autoComplete="off"
          onChange={(e) => { setEmail(e.target.value); setNeedsAccount(false); setMember.reset() }} />
        <div className="flex flex-col gap-2">
          <Select label="Qué puede hacer" value={role} onChange={(e) => setRole(e.target.value as Member['role'])}>
            <option value="viewer">{roleLabel.viewer}</option>
            <option value="editor">{roleLabel.editor}</option>
          </Select>
          <p className="text-sm text-muted">
            {role === 'viewer'
              ? 'Ve todo lo que hay, las fotos y el historial, pero no cambia nada.'
              : 'Además puede añadir productos, hacer fotos y registrar lo que entra y sale.'}
          </p>
        </div>

        {needsAccount && (
          <div className="flex flex-col gap-4 rounded-2xl border-[1.5px] border-dashed border-line p-4">
            <p className="text-[15px]">
              <strong>Aún no tiene cuenta.</strong> Créasela aquí y le darás acceso a la vez.
            </p>
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              placeholder="Ej.: Rosa" />
            <PasswordInput value={password} onChange={setPassword} />
          </div>
        )}

        {error && <p role="alert" className="font-medium text-out">{error.message}</p>}

        <Button type="submit" disabled={pending || (needsAccount && (password.length < MIN_PASSWORD || !name.trim()))}>
          {pending ? 'Guardando…' : needsAccount ? 'Crear cuenta y dar acceso' : 'Dar acceso'}
        </Button>
      </form>
    </section>
  )
}
