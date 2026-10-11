import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useProject } from '../api/projects'
import { ErrorMessage, Loading } from '../components/StatusMessage'
import { Badge } from '../components/ui/Badge'
import { roleLabel } from '../lib/format'

// Provisional: en el paso 5 aquí irá el inventario del proyecto.
export function ProjectPage() {
  const { projectId = '' } = useParams()
  const { data: project, isPending, error } = useProject(projectId)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-4 pb-10">
      <Link to="/" className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-semibold text-ink">
        <ChevronLeft size={22} aria-hidden="true" /> Proyectos
      </Link>

      {isPending && <Loading />}
      {error && <ErrorMessage message={error.message} />}

      {project && (
        <>
          <div className="flex flex-col gap-2">
            <Badge tone={project.role === 'viewer' ? 'neutral' : 'brand'}>{roleLabel[project.role]}</Badge>
            <h1 className="font-display text-[34px] leading-tight font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted">{project.description}</p>}
          </div>
          <p className="text-center text-muted">Aquí irá el inventario (paso 5).</p>
        </>
      )}
    </main>
  )
}
