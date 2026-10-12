import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useDeleteProject } from '../../api/admin'
import { plural } from '../../lib/format'
import type { Project } from '../../types/api'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

// "Zona peligrosa": borrar un trastero entero. Como no se puede deshacer, pedimos escribir su nombre
// (lo mismo que hace GitHub al borrar un repositorio): así es imposible hacerlo por un toque sin querer.
export function DeleteProject({ project, productCount }: { project: Project; productCount?: number }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const mutation = useDeleteProject(project.id)
  const matches = typed.trim() === project.name

  function remove() {
    mutation.mutate(undefined, {
      onSuccess: () => navigate('/', { replace: true, state: { flash: `«${project.name}» eliminado.` } }),
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex min-h-12 items-center justify-center gap-2 font-semibold text-out">
        <Trash2 size={18} aria-hidden="true" /> Eliminar trastero
      </button>
    )
  }

  return (
    <section aria-label="Eliminar trastero" className="flex flex-col gap-3 rounded-3xl bg-out-soft p-5">
      <h2 className="font-display text-xl font-bold text-out">Eliminar trastero</h2>
      <p className="font-medium text-out">
        Se borrará «{project.name}» con todo lo que tiene dentro
        {productCount !== undefined && <> ({plural(productCount, 'producto', 'productos')})</>}: fotos, historial,
        categorías, ubicaciones y quién tiene acceso. <strong>No se puede deshacer.</strong>
      </p>
      <Input label={`Escribe «${project.name}» para confirmar`} value={typed} onChange={(e) => setTyped(e.target.value)}
        autoComplete="off" spellCheck={false} />
      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setTyped('') }}>Cancelar</Button>
        <button type="button" disabled={!matches || mutation.isPending} onClick={remove}
          className="min-h-12 flex-1 rounded-2xl bg-out px-4 font-bold text-white disabled:opacity-40">
          {mutation.isPending ? 'Eliminando…' : 'Eliminar para siempre'}
        </button>
      </div>
    </section>
  )
}
