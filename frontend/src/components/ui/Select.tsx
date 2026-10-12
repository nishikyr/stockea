import { ChevronDown } from 'lucide-react'
import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  action?: ReactNode // p. ej. un botón "+ Nueva" junto a la etiqueta
}

// <select> nativo con nuestro estilo. En el móvil abre la rueda/lista del sistema, que es lo más cómodo.
export function Select({ label, action, id, children, className = '', ...props }: Props) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <label htmlFor={selectId} className="text-[15px] font-semibold">{label}</label>
        {action}
      </div>
      <div className="relative">
        <select id={selectId}
          className={`h-14 w-full appearance-none rounded-2xl border-[1.5px] border-line bg-cream pr-11 pl-4 text-[17px]
            text-ink outline-none focus:border-brand ${className}`}
          {...props}>
          {children}
        </select>
        <ChevronDown size={20} aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  )
}
