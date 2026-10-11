import { useState } from 'react'
import { useCreateProject } from '../../api/projects'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

export function NewProjectForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const createProject = useCreateProject()

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-bold">Nuevo trastero</h2>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          createProject.mutate({ name: name.trim(), description: description.trim() }, { onSuccess: onDone })
        }}
      >
        <Input
          label="Nombre"
          placeholder="Ej.: HomeBox · Atocha"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <Input
          label="Descripción (opcional)"
          placeholder="Ej.: Madrid"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {createProject.error && (
          <p role="alert" className="rounded-2xl bg-out-soft px-4 py-3 text-[15px] font-medium text-out">
            {createProject.error.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={createProject.isPending}>
            {createProject.isPending ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
