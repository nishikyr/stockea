import { Camera, ImagePlus, X } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { Photo } from '../../types/api'

export const MAX_PHOTOS = 10 // el mismo límite que el backend

// Una foto nueva que aún no se ha subido: ya reducida, con su vista previa
export type PendingPhoto = { key: string; blob: Blob; preview: string }

type Props = {
  existing: Photo[] // fotos ya guardadas (al editar)
  pending: PendingPhoto[]
  busy: boolean // reduciendo fotos
  onAdd: (files: File[]) => void
  onRemoveExisting: (id: string) => void
  onRemovePending: (key: string) => void
}

export function PhotoPicker({ existing, pending, busy, onAdd, onRemoveExisting, onRemovePending }: Props) {
  const count = existing.length + pending.length
  const full = count >= MAX_PHOTOS

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // vaciamos el input: así se puede volver a elegir la misma foto
    if (files.length) onAdd(files.slice(0, MAX_PHOTOS - count))
  }

  // Un <label> que envuelve un <input type="file"> escondido: pulsar el label abre el selector.
  // capture="environment" pide al móvil la cámara trasera directamente.
  const pickBtn = `flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl font-bold
    focus-within:ring-2 focus-within:ring-brand ${full || busy ? 'pointer-events-none opacity-40' : ''}`

  return (
    <div className="flex flex-col gap-3">
      {count > 0 && (
        <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" aria-label="Fotos">
          {existing.map((p, i) => (
            <Thumb key={p.id} src={p.url} label={`Foto ${i + 1}`} onRemove={() => onRemoveExisting(p.id)} />
          ))}
          {pending.map((p, i) => (
            <Thumb key={p.key} src={p.preview} label={`Foto nueva ${i + 1}`} onRemove={() => onRemovePending(p.key)} />
          ))}
        </ul>
      )}

      {count === 0 && (
        <div className="flex h-36 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-line text-muted">
          <Camera size={34} aria-hidden="true" />
          <span className="text-[15px]">Una foto ayuda a encontrarlo</span>
        </div>
      )}

      <div className="flex gap-2.5">
        <label className={`${pickBtn} bg-brand text-white`}>
          <Camera size={20} aria-hidden="true" /> Hacer foto
          <input type="file" accept="image/*" capture="environment" className="sr-only"
            disabled={full || busy} onChange={handleFiles} />
        </label>
        <label className={`${pickBtn} border-[1.5px] border-line bg-cream text-ink`}>
          <ImagePlus size={20} aria-hidden="true" /> Galería
          <input type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple className="sr-only"
            disabled={full || busy} onChange={handleFiles} />
        </label>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {busy ? 'Preparando fotos…' : full ? `Máximo ${MAX_PHOTOS} fotos.` : `${count} de ${MAX_PHOTOS} fotos`}
      </p>
    </div>
  )
}

function Thumb({ src, label, onRemove }: { src: string; label: string; onRemove: () => void }) {
  return (
    <li className="relative flex-none">
      <img src={src} alt={label} className="size-28 rounded-2xl bg-line object-cover" />
      <button type="button" onClick={onRemove} aria-label={`Quitar ${label.toLowerCase()}`}
        className="absolute -top-1 -right-1 flex size-9 items-center justify-center rounded-full bg-ink text-cream shadow">
        <X size={18} aria-hidden="true" />
      </button>
    </li>
  )
}
