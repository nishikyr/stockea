import { ChevronRight, Plus, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useProjects } from '../api/projects'
import { useAuth } from '../auth/useAuth'
import { AppHeader } from '../components/AppHeader'
import { AdminProjectCard } from '../components/projects/AdminProjectCard'
import { NewProjectForm } from '../components/projects/NewProjectForm'
import { ProjectCard } from '../components/projects/ProjectCard'
import { EmptyState, ErrorMessage, Loading } from '../components/StatusMessage'
import { Button } from '../components/ui/Button'
import { firstName } from '../lib/format'

// La primera pantalla tras el login. Dos versiones según quién entra:
// - admin: todos los proyectos, contadores y botón para crear
// - resto (tu tía): tarjetas grandes con los trasteros que le has compartido
export function ProjectsPage() {
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-6 pb-10">
      <AppHeader />
      {isAdmin ? <AdminProjects /> : <MemberProjects name={firstName(user?.name ?? '')} />}
    </main>
  )
}

function MemberProjects({ name }: { name: string }) {
  const { data: projects, isPending, error, refetch } = useProjects()

  return (
    <>
      <h1 className="mt-6 font-display text-[34px] leading-tight font-bold tracking-tight">
        Hola, {name}. ¿Qué trastero quieres ver?
      </h1>

      {isPending && <Loading />}
      {error && <ErrorMessage message={error.message} onRetry={() => void refetch()} />}

      {projects?.length === 0 && (
        <EmptyState title="Todavía no tienes trasteros">
          Cuando te compartan uno, aparecerá aquí.
        </EmptyState>
      )}

      <div className="flex flex-col gap-4">
        {projects?.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>

      {projects && projects.length > 0 && (
        <p className="mt-auto pt-6 text-center text-[15px] text-muted">
          Aquí aparecen los trasteros que te han compartido.
        </p>
      )}
    </>
  )
}

function AdminProjects() {
  const { data: projects, isPending, error, refetch } = useProjects()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="mt-4 flex items-end justify-between gap-3">
        <h1 className="font-display text-[34px] leading-tight font-bold tracking-tight">Proyectos</h1>
        {!creating && (
          <Button className="min-h-11 rounded-full pl-3 text-[15px]" onClick={() => setCreating(true)}>
            <Plus size={20} aria-hidden="true" /> Nuevo
          </Button>
        )}
      </div>

      {creating && <NewProjectForm onDone={() => setCreating(false)} />}

      {isPending && <Loading />}
      {error && <ErrorMessage message={error.message} onRetry={() => void refetch()} />}

      {projects?.length === 0 && !creating && (
        <EmptyState title="Aún no hay proyectos">
          Crea el primero, por ejemplo «HomeBox · Atocha».
        </EmptyState>
      )}

      <div className="flex flex-col gap-4">
        {projects?.map((p) => <AdminProjectCard key={p.id} project={p} />)}
      </div>

      {projects && projects.length > 0 && !creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-28 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed
            border-[#D8CBB6] font-semibold text-muted transition-colors hover:bg-cream"
        >
          <Plus size={28} aria-hidden="true" />
          Crear otro trastero
        </button>
      )}

      <Link to="/accounts" className="flex min-h-14 items-center gap-3 rounded-3xl bg-cream px-5 font-semibold text-ink">
        <UserRound size={20} aria-hidden="true" className="text-muted" />
        <span className="flex-1">Cuentas de usuario</span>
        <ChevronRight size={20} aria-hidden="true" className="text-muted" />
      </Link>
    </>
  )
}
