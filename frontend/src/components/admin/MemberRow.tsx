import { X } from 'lucide-react'
import { useState } from 'react'
import { useRemoveMember, useSetMember } from '../../api/admin'
import { roleLabel } from '../../lib/format'
import type { Member } from '../../types/api'
import { Button } from '../ui/Button'

// Una persona con acceso: su rol se cambia al momento con el desplegable; quitarla pide confirmación.
export function MemberRow({ projectId, member }: { projectId: string; member: Member }) {
  const setMember = useSetMember(projectId)
  const remove = useRemoveMember(projectId)
  const [confirming, setConfirming] = useState(false)
  const error = setMember.error ?? remove.error

  return (
    <li className="flex flex-col gap-3 rounded-[20px] bg-cream p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-brand-soft font-display
          text-lg font-bold text-brand-dark" aria-hidden="true">
          {member.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{member.name}</p>
          <p className="truncate text-sm text-muted">{member.email}</p>
        </div>
        <button type="button" onClick={() => setConfirming(true)} aria-label={`Quitar acceso a ${member.name}`}
          className="flex size-11 flex-none items-center justify-center rounded-full text-muted hover:bg-sand">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <label className="sr-only" htmlFor={`rol-${member.id}`}>Rol de {member.name}</label>
      <select id={`rol-${member.id}`} value={member.role} disabled={setMember.isPending}
        onChange={(e) => setMember.mutate({ email: member.email, role: e.target.value as Member['role'] })}
        className="h-12 rounded-2xl border-[1.5px] border-line bg-sand px-3 font-semibold outline-none focus:border-brand
          disabled:opacity-60">
        <option value="viewer">{roleLabel.viewer}</option>
        <option value="editor">{roleLabel.editor}</option>
      </select>
      {setMember.isSuccess && <p role="status" className="sr-only">Rol cambiado</p>}

      {confirming && (
        <div className="flex flex-col gap-2 rounded-2xl bg-out-soft p-3">
          <p className="font-medium text-out">¿Quitar el acceso a {member.name}? Su cuenta seguirá existiendo.</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>No</Button>
            <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(member.id)}
              className="min-h-12 flex-1 rounded-2xl bg-out px-4 font-bold text-white disabled:opacity-50">
              {remove.isPending ? 'Quitando…' : 'Sí, quitar acceso'}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="font-medium text-out">{error.message}</p>}
    </li>
  )
}
