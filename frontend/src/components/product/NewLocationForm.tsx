import { useState, type KeyboardEvent } from 'react'
import { useCreateLocation } from '../../api/inventory'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

type Props = {
  projectId: string
  options: { id: string; label: string }[] // ubicaciones existentes, para "dentro de"
  onCreated: (id: string) => void
  onCancel: () => void
}

// Igual que NewCategoryForm: un <div>, no un <form> (no se pueden anidar formularios).
export function NewLocationForm({ projectId, options, onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const mutation = useCreateLocation(projectId)

  function create() {
    if (!name.trim()) return
    mutation.mutate(
      { name: name.trim(), parent_id: parentId || null },
      { onSuccess: (l) => onCreated(l.id) },
    )
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      create()
    }
  }

  return (
    <div role="group" aria-label="Nueva ubicación" className="flex flex-col gap-4 rounded-3xl bg-cream p-4">
      <Input label="Nombre del sitio" value={name} maxLength={60} onKeyDown={onKeyDown}
        onChange={(e) => setName(e.target.value)} placeholder="Ej.: Caja 3, Altillo…" />
      {options.length > 0 && (
        <Select label="Está dentro de (opcional)" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Ningún sitio (está suelto en el trastero)</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      )}
      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" className="flex-1" onClick={create} disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Creando…' : 'Crear ubicación'}
        </Button>
      </div>
    </div>
  )
}
