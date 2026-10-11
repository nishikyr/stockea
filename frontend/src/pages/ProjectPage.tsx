import { ChevronDown } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { useCurrentProject } from '../api/projects'
import { useAuth } from '../auth/useAuth'
import { ProjectNav } from '../components/ProjectNav'
import { ErrorMessage, Loading } from '../components/StatusMessage'

// El "marco" de un proyecto: cabecera arriba, pestañas abajo y, en medio (<Outlet />),
// la pestaña que toque: Inventario, Historial o Ajustes.
export function ProjectPage() {
  const { user } = useAuth()
  const { data: project, isPending, error, refetch } = useCurrentProject()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-28">
      <header className="flex items-center justify-between gap-3 pt-4 pb-2">
        <Link
          to="/"
          aria-label="Cambiar de trastero"
          className="-ml-1 flex min-h-11 min-w-0 items-center gap-1.5 px-1 text-[15px] font-semibold text-muted"
        >
          <span className="truncate">{project?.name ?? 'Proyectos'}</span>
          <ChevronDown size={18} aria-hidden="true" className="flex-none" />
        </Link>
        <Link
          to="settings"
          aria-label="Tu cuenta"
          className="flex size-11 flex-none items-center justify-center rounded-full bg-brand font-display text-lg
            font-bold text-white"
        >
          {user?.name.charAt(0).toUpperCase()}
        </Link>
      </header>

      {isPending && <Loading />}
      {error && <ErrorMessage message={error.message} onRetry={() => void refetch()} />}
      {project && <Outlet />}

      <ProjectNav />
    </div>
  )
}
