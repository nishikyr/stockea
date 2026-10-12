import { ChevronLeft, KeyRound, RotateCcw, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useCreateUser, useDeleteUser, useEnableUser, useResetPassword, useUsers, type DeleteUserResult } from '../api/admin'
import { useAuth } from '../auth/useAuth'
import { CredentialsCard } from '../components/admin/CredentialsCard'
import { PasswordInput } from '../components/admin/PasswordInput'
import { ErrorMessage, Loading } from '../components/StatusMessage'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { MIN_PASSWORD, generatePassword } from '../lib/password'
import type { User } from '../types/api'

type Shown = { name: string; email: string; password: string }

// Cuentas de usuario (solo admin): quién puede entrar en Stockea, crear cuentas y resetear contraseñas.
// Dar acceso a un trastero concreto se hace desde "Acceso y datos" de cada proyecto.
export function AccountsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const users = useUsers()
  const [creating, setCreating] = useState(false)
  const [shown, setShown] = useState<Shown | null>(null) // datos a enseñar tras crear/resetear
  const [notice, setNotice] = useState('') // "Cuenta de Pepe eliminada.", etc.

  function onDeleted(name: string, result: DeleteUserResult) {
    setNotice(result === 'deleted'
      ? `Cuenta de ${name} eliminada.`
      : `${name} tenía movimientos en el historial, así que su cuenta se ha desactivado en vez de borrarse: ya no puede entrar y ha perdido el acceso a los trasteros.`)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      <button type="button" onClick={() => navigate(-1)}
        className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-semibold text-ink">
        <ChevronLeft size={22} aria-hidden="true" /> Volver
      </button>

      {!user?.is_admin ? (
        <ErrorMessage message="Solo el administrador puede ver las cuentas." />
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <h1 className="font-display text-[34px] leading-tight font-bold tracking-tight">Cuentas</h1>
            {!creating && (
              <Button className="min-h-11 rounded-full pl-3 text-[15px]" onClick={() => { setCreating(true); setShown(null) }}>
                <UserPlus size={20} aria-hidden="true" /> Nueva
              </Button>
            )}
          </div>
          <p className="-mt-3 text-[15px] text-muted">
            Quién puede entrar en Stockea. El acceso a cada trastero se da desde el propio trastero.
          </p>

          {shown && <CredentialsCard {...shown} onDone={() => setShown(null)} />}
          {notice && <p role="status" className="rounded-2xl bg-in-soft px-4 py-3 font-semibold text-in">{notice}</p>}
          {creating && (
            <NewUserForm onCancel={() => setCreating(false)}
              onCreated={(s) => { setCreating(false); setShown(s) }} />
          )}

          {users.isPending && <Loading />}
          {users.error && <ErrorMessage message={users.error.message} />}
          <ul className="flex flex-col gap-3">
            {users.data?.map((u) => (
              <UserRow key={u.id} account={u} isMe={u.id === user.id} onReset={(c) => { setNotice(''); setShown(c) }}
                onDeleted={onDeleted} onEnabled={(name) => setNotice(`${name} puede volver a entrar. Dale acceso a los trasteros que quieras desde «Gestionar».`)} />
            ))}
          </ul>
        </>
      )}
    </main>
  )
}

function NewUserForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (s: Shown) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(generatePassword) // función: se llama solo la primera vez
  const mutation = useCreateUser()

  function submit(e: FormEvent) {
    e.preventDefault()
    const input = { name: name.trim(), email: email.trim().toLowerCase(), password }
    mutation.mutate(input, { onSuccess: () => onCreated(input) })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-cream p-5">
      <h2 className="font-display text-xl font-bold">Nueva cuenta</h2>
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
      <PasswordInput value={password} onChange={setPassword} />
      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={mutation.isPending || password.length < MIN_PASSWORD}>
          {mutation.isPending ? 'Creando…' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  )
}

type UserRowProps = {
  account: User
  isMe: boolean
  onReset: (s: Shown) => void
  onDeleted: (name: string, result: DeleteUserResult) => void
  onEnabled: (name: string) => void
}

function UserRow({ account, isMe, onReset, onDeleted, onEnabled }: UserRowProps) {
  const [resetting, setResetting] = useState(false)
  const [password, setPassword] = useState('')
  const mutation = useResetPassword()
  const remove = useDeleteUser()
  const enable = useEnableUser()
  const [confirming, setConfirming] = useState(false)
  const canRemove = !isMe && !account.is_admin

  function startReset() {
    setPassword(generatePassword())
    setResetting(true)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({ userId: account.id, password }, {
      onSuccess: () => {
        setResetting(false)
        onReset({ name: account.name, email: account.email, password })
      },
    })
  }

  return (
    <li className={`flex flex-col gap-3 rounded-[20px] p-4 ${account.disabled ? 'bg-sand ring-1 ring-line' : 'bg-cream'}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-brand-soft font-display
          text-lg font-bold text-brand-dark" aria-hidden="true">
          {account.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{account.name}{isMe && ' (tú)'}</p>
          <p className="truncate text-sm text-muted">{account.email}</p>
        </div>
        {account.is_admin && <Badge tone="dark">Admin</Badge>}
        {account.disabled && <Badge tone="warn">Desactivada</Badge>}
      </div>

      {account.disabled && (
        <button type="button" disabled={enable.isPending}
          onClick={() => enable.mutate(account.id, { onSuccess: () => onEnabled(account.name) })}
          className="flex min-h-11 items-center gap-2 self-start font-semibold text-brand disabled:opacity-50">
          <RotateCcw size={18} aria-hidden="true" /> {enable.isPending ? 'Reactivando…' : 'Reactivar cuenta'}
        </button>
      )}

      {/* Tu propia contraseña se cambia en Ajustes (pidiendo la actual), no aquí */}
      {!isMe && !resetting && !confirming && !account.disabled && (
        <div className="flex flex-wrap gap-x-4">
          <button type="button" onClick={startReset}
            className="flex min-h-11 items-center gap-2 font-semibold text-brand">
            <KeyRound size={18} aria-hidden="true" /> Poner contraseña nueva
          </button>
          {canRemove && (
            <button type="button" onClick={() => setConfirming(true)} aria-label={`Eliminar la cuenta de ${account.name}`}
              className="flex min-h-11 items-center gap-2 font-semibold text-out">
              <Trash2 size={18} aria-hidden="true" /> Eliminar
            </button>
          )}
        </div>
      )}

      {confirming && (
        <div className="flex flex-col gap-2 rounded-2xl bg-out-soft p-3">
          <p className="font-medium text-out">
            ¿Eliminar la cuenta de {account.name}? Si ya ha sacado o guardado cosas, no se borrará: se desactivará
            para que el historial siga diciendo quién lo hizo.
          </p>
          {remove.error && <p role="alert" className="font-medium text-out">{remove.error.message}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>No</Button>
            <button type="button" disabled={remove.isPending}
              onClick={() => remove.mutate(account.id, { onSuccess: (result) => { setConfirming(false); onDeleted(account.name, result) } })}
              className="min-h-12 flex-1 rounded-2xl bg-out px-4 font-bold text-white disabled:opacity-50">
              {remove.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      )}
      {enable.error && <p role="alert" className="font-medium text-out">{enable.error.message}</p>}
      {resetting && (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <PasswordInput label={`Contraseña nueva para ${account.name}`} value={password} onChange={setPassword} />
          {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setResetting(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending || password.length < MIN_PASSWORD}>
              {mutation.isPending ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </div>
        </form>
      )}
    </li>
  )
}
