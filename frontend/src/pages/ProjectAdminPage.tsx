import { ChevronLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useMembers } from '../api/admin'
import { useProject, useProjects } from '../api/projects'
import { useAuth } from '../auth/useAuth'
import { DeleteProject } from '../components/admin/DeleteProject'
import { GrantAccessForm } from '../components/admin/GrantAccessForm'
import { MemberRow } from '../components/admin/MemberRow'
import { ProjectInfoForm } from '../components/admin/ProjectInfoForm'
import { ErrorMessage, Loading } from '../components/StatusMessage'
import { firstName } from '../lib/format'

// "Acceso y datos" de un trastero (solo admin): nombre, quién entra y con qué rol.
export function ProjectAdminPage() {
  const { projectId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.is_admin ?? false
  const project = useProject(projectId)
  // enabled: si no eres admin ni lo pedimos (el backend diría 403 igualmente)
  const members = useMembers(projectId, { enabled: isAdmin })
  // El nº de productos para el aviso de borrado sale de la lista de proyectos (ya suele estar en caché)
  const summary = useProjects().data?.find((p) => p.id === projectId)

  const back = (
    <button type="button" onClick={() => navigate(-1)}
      className="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 font-semibold text-ink">
      <ChevronLeft size={22} aria-hidden="true" /> Volver
    </button>
  )

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-4">
        {back}
        <ErrorMessage message="Solo el administrador puede gestionar el acceso." />
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      {back}
      {project.isPending && <Loading />}
      {project.error && <ErrorMessage message={project.error.message} />}

      {project.data && (
        <>
          <div>
            <p className="text-[15px] font-semibold text-muted">Acceso y datos</p>
            <h1 className="font-display text-[32px] leading-tight font-bold tracking-tight">{project.data.name}</h1>
          </div>

          {/* key: si cambia el nombre en el servidor, el formulario se reinicia con el valor nuevo */}
          <ProjectInfoForm key={`${project.data.name}|${project.data.description}`} project={project.data} />

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-bold">Quién tiene acceso</h2>
            <div className="flex items-center gap-3 rounded-[20px] bg-cream p-4">
              <span className="flex size-11 flex-none items-center justify-center rounded-full bg-brand font-display
                text-lg font-bold text-white" aria-hidden="true">
                {user?.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{firstName(user?.name ?? '')} (tú)</p>
                <p className="text-sm text-muted">Administrador · ve y cambia todo</p>
              </div>
            </div>
            {members.isPending && <Loading />}
            {members.error && <ErrorMessage message={members.error.message} />}
            {members.data?.length === 0 && (
              <p className="rounded-2xl border-2 border-dashed border-line p-4 text-center text-muted">
                Nadie más tiene acceso todavía.
              </p>
            )}
            <ul className="flex flex-col gap-3">
              {members.data?.map((m) => <MemberRow key={m.id} projectId={projectId} member={m} />)}
            </ul>
          </section>

          <GrantAccessForm projectId={projectId} />

          <DeleteProject project={project.data} productCount={summary?.product_count} />
        </>
      )}
    </main>
  )
}
