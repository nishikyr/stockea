import { useState, type FormEvent } from 'react'
import { useUpdateProject } from '../../api/admin'
import type { Project } from '../../types/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function ProjectInfoForm({ project }: { project: Project }) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const mutation = useUpdateProject(project.id)
  // ¿Ha cambiado algo? (estado derivado: se calcula, no se guarda)
  const dirty = name.trim() !== project.name || description.trim() !== project.description

  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({ name: name.trim(), description: description.trim() })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-cream p-5">
      <h2 className="font-display text-xl font-bold">Datos del trastero</h2>
      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
      <Input label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
        placeholder="Ej.: Madrid" />
      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      {mutation.isSuccess && !dirty && <p role="status" className="font-semibold text-in">Guardado.</p>}
      <Button type="submit" variant="secondary" disabled={!dirty || !name.trim() || mutation.isPending}>
        {mutation.isPending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
