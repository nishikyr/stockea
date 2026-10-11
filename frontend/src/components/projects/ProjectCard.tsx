import { ArrowRight, Warehouse } from 'lucide-react'
import { Link } from 'react-router'
import { plural, roleLabel } from '../../lib/format'
import type { ProjectSummary } from '../../types/api'
import { Badge } from '../ui/Badge'

// Tarjeta grande: lo que ve tu tía nada más entrar. Toda la tarjeta es un enlace.
export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex flex-col gap-5 rounded-[28px] bg-cream p-5.5 text-ink shadow-[0_2px_0_var(--color-line)]
        transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="flex size-16 items-center justify-center rounded-[20px] bg-brand-soft text-brand-dark">
          <Warehouse size={32} aria-hidden="true" />
        </span>
        <Badge tone={project.role === 'viewer' ? 'neutral' : 'brand'}>{roleLabel[project.role]}</Badge>
      </div>

      <div>
        <p className="font-display text-[28px] leading-tight font-bold">{project.name}</p>
        {project.description && <p className="mt-1.5 text-base text-muted">{project.description}</p>}
      </div>

      <div className="flex items-center justify-between border-t border-[#EFE6D8] pt-4">
        <span className="text-[15px] text-muted">
          {plural(project.product_count, 'producto', 'productos')}
          {project.low_stock_count > 0 && (
            <span className="font-semibold whitespace-nowrap text-warn"> · {project.low_stock_count} con stock bajo</span>
          )}
        </span>
        <span className="flex size-11 items-center justify-center rounded-full bg-brand text-white">
          <ArrowRight size={22} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
