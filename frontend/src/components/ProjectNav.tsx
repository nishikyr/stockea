import { Boxes, History, SlidersHorizontal } from 'lucide-react'
import { NavLink } from 'react-router'

const tabs = [
  { to: '', label: 'Inventario', icon: Boxes, end: true },
  { to: 'history', label: 'Historial', icon: History, end: false },
  { to: 'settings', label: 'Ajustes', icon: SlidersHorizontal, end: false },
]

// Barra inferior de pestañas, como en las apps del móvil (el pulgar llega bien).
// NavLink sabe si su ruta es la actual y nos deja pintarla "activa" (y añade aria-current="page").
export function ProjectNav() {
  return (
    <nav aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-cream pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-18 max-w-md grid-cols-3">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[13px] ${
                isActive ? 'font-bold text-brand' : 'font-semibold text-muted'
              }`
            }
          >
            <Icon size={24} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
