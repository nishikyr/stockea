import { ChevronRight, Users, Warehouse } from 'lucide-react'
import { Link } from 'react-router'
import { plural } from '../../lib/format'
import type { ProjectSummary } from '../../types/api'

// Tarjeta compacta para el admin: datos del proyecto + cuántas personas tienen acceso
export function AdminProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="flex flex-col gap-4 rounded-3xl bg-cream p-5">
      <Link to={`/projects/${project.id}`} className="flex items-center gap-3.5 text-ink">
        <span className="flex size-14 flex-none items-center justify-center rounded-[18px] bg-brand-soft text-brand-dark">
          <Warehouse size={28} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[22px] font-bold">{project.name}</span>
          <span className="mt-0.5 block text-[15px] text-muted">
            {plural(project.product_count, 'producto', 'productos')}
            {project.low_stock_count > 0 && (
              <span className="font-semibold whitespace-nowrap text-warn"> · {project.low_stock_count} con stock bajo</span>
            )}
          </span>
        </span>
        <ChevronRight size={22} aria-hidden="true" className="text-muted" />
      </Link>

      <div className="flex items-center gap-2 border-t border-[#EFE6D8] pt-3.5 text-[15px] text-muted">
        <Users size={18} aria-hidden="true" />
        {project.member_count === 0
          ? 'Nadie más tiene acceso todavía'
          : plural(project.member_count, 'persona con acceso', 'personas con acceso')}
      </div>
    </article>
  )
}
