import type { ReactNode } from 'react'

// "Pastilla" seleccionable para filtros (categorías, tipos de movimiento…)
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // aria-pressed: un lector de pantalla dirá "Herramientas, botón, pulsado"
      aria-pressed={active}
      className={`flex h-11 flex-none items-center gap-2 rounded-full px-4 text-[15px] whitespace-nowrap transition-colors ${
        active ? 'bg-ink font-semibold text-cream' : 'border-[1.5px] border-line bg-cream font-medium text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// Fila de chips que se desliza en horizontal si no caben (sin barra de scroll visible)
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {children}
    </div>
  )
}
