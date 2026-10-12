import { useState, type KeyboardEvent } from 'react'
import { useCreateLocation, useUpdateLocation } from '../../api/inventory'
import { locationOptions, selfAndDescendants } from '../../lib/locations'
import type { Location } from '../../types/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

type Props = {
  projectId: string
  locations: Location[] // todas las del proyecto, para elegir "dentro de"
  location?: Location // si viene, EDITAMOS esa ubicación; si no, creamos una nueva
  onSaved: (id: string) => void
  onCancel: () => void
}

// Igual que CategoryForm: un <div>, no un <form> (no se pueden anidar formularios).
export function LocationForm({ projectId, locations, location, onSaved, onCancel }: Props) {
  const [name, setName] = useState(location?.name ?? '')
  const [parentId, setParentId] = useState(location?.parent_id ?? '')
  const create = useCreateLocation(projectId)
  const update = useUpdateLocation(projectId)
  const mutation = location ? update : create

  // Al editar, no puede ir dentro de sí misma ni de algo que ya está dentro de ella
  const excluded = location ? selfAndDescendants(locations, location.id) : new Set<string>()
  const options = locationOptions(locations).filter((o) => !excluded.has(o.id))

  function save() {
    if (!name.trim()) return
    const input = { name: name.trim(), parent_id: parentId || null }
    if (location) {
      // mandamos también la descripción que ya tenía, para no borrarla sin querer
      update.mutate({ id: location.id, description: location.description, ...input }, { onSuccess: (l) => onSaved(l.id) })
    } else {
      create.mutate(input, { onSuccess: (l) => onSaved(l.id) })
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      save()
    }
  }

  return (
    <div role="group" aria-label={location ? `Editar ${location.name}` : 'Nueva ubicación'}
      className="flex flex-col gap-4 rounded-3xl bg-cream p-4">
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
        <Button type="button" className="flex-1" onClick={save} disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : location ? 'Guardar' : 'Crear ubicación'}
        </Button>
      </div>
    </div>
  )
}
