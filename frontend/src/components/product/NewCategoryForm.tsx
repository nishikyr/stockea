import { useState, type KeyboardEvent } from 'react'
import { useCreateCategory } from '../../api/inventory'
import { categoryColors, categoryTint, iconChoices } from '../../lib/categoryStyle'
import { CategoryIcon } from '../inventory/CategoryIcon'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type Props = { projectId: string; onCreated: (id: string) => void; onCancel: () => void }

// Mini-formulario para crear una categoría sin salir del formulario del producto.
// OJO: NO es un <form>. Un <form> dentro de otro <form> no está permitido en HTML,
// así que usamos un <div> y gestionamos el Enter a mano.
export function NewCategoryForm({ projectId, onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(categoryColors[0])
  const [icon, setIcon] = useState('box')
  const mutation = useCreateCategory(projectId)

  function create() {
    if (!name.trim()) return
    mutation.mutate({ name: name.trim(), color, icon }, { onSuccess: (c) => onCreated(c.id) })
  }

  // Enter en el nombre crea la categoría (y no envía el formulario del producto)
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      create()
    }
  }

  return (
    <div role="group" aria-label="Nueva categoría" className="flex flex-col gap-4 rounded-3xl bg-cream p-4">
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
        <Button type="button" className="flex-1" onClick={create} disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? 'Creando…' : 'Crear categoría'}
        </Button>
      </div>
    </div>
  )
}
