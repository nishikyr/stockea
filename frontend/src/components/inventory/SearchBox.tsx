import { Search, X } from 'lucide-react'

export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-13 items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-cream pl-4 text-muted
      focus-within:border-brand">
      <Search size={20} aria-hidden="true" />
      <label htmlFor="buscar" className="sr-only">Buscar productos</label>
      <input
        id="buscar"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar en el trastero…"
        autoComplete="off"
        // [&::-webkit-search-cancel-button]:hidden → quitamos la X del navegador; ponemos la nuestra, más grande
        className="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-muted
          [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Borrar búsqueda"
          className="flex size-12 items-center justify-center text-muted"
        >
          <X size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
