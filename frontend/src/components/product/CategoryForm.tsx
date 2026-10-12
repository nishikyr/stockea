import { useState, type KeyboardEvent } from 'react'
import { useCreateCategory, useUpdateCategory } from '../../api/inventory'
import { categoryColors, categoryTint, iconChoices } from '../../lib/categoryStyle'
import type { Category } from '../../types/api'
import { CategoryIcon } from '../inventory/CategoryIcon'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type Props = {
  projectId: string
  category?: Category // si viene, EDITAMOS esa categoría; si no, creamos una nueva
  onSaved: (id: string) => void
  onCancel: () => void
}

// Crear o editar una categoría. OJO: NO es un <form>. Se usa también dentro del formulario de
// producto, y un <form> dentro de otro <form> no está permitido en HTML: gestionamos el Enter a mano.
export function CategoryForm({ projectId, category, onSaved, onCancel }: Props) {
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? categoryColors[0])
  const [icon, setIcon] = useState(category?.icon || 'box')
  const create = useCreateCategory(projectId)
  const update = useUpdateCategory(projectId)
  const mutation = category ? update : create

  function save() {
    if (!name.trim()) return
    const input = { name: name.trim(), color, icon }
    if (category) update.mutate({ id: category.id, ...input }, { onSuccess: (c) => onSaved(c.id) })
    else create.mutate(input, { onSuccess: (c) => onSaved(c.id) })
  }

  // Enter en el nombre guarda la categoría (y no envía el formulario del producto)
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      save()
    }
  }

  return (
    <div role="group" aria-label={category ? `Editar ${category.name}` : 'Nueva categoría'}
      className="flex flex-col gap-4 rounded-3xl bg-cream p-4">
      <Input label="Nombre de la categoría" value={name} maxLength={60} onKeyDown={onKeyDown}
        onChange={(e) => setName(e.target.value)} placeholder="Ej.: Herramientas" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-semibold">Color</legend>
        <div className="flex flex-wrap gap-2">
          {categoryColors.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
              className={`size-10 rounded-full ${color === c ? 'ring-3 ring-ink ring-offset-2 ring-offset-cream' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[15px] font-semibold">Icono</legend>
        <div className="grid grid-cols-5 gap-2">
          {iconChoices.map((i) => (
            <button key={i.key} type="button" onClick={() => setIcon(i.key)} aria-label={i.label} aria-pressed={icon === i.key}
              className={`flex aspect-square items-center justify-center rounded-2xl ${
                icon === i.key ? 'ring-2 ring-ink' : ''}`}
              style={icon === i.key ? categoryTint(color) : undefined}>
              <CategoryIcon name={i.key} size={24} />
            </button>
          ))}
        </div>
      </fieldset>

      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" className="flex-1" onClick={save} disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : category ? 'Guardar' : 'Crear categoría'}
        </Button>
      </div>
    </div>
  )
}
