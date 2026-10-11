import type { Photo } from '../../types/api'

// Fotos del producto en fila: se pasan deslizando con el dedo (scroll-snap = cada foto "encaja").
// Pulsar una la abre a tamaño completo en otra pestaña.
export function PhotoStrip({ photos, name }: { photos: Photo[]; name: string }) {
  const single = photos.length === 1
  return (
    <div className="-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 [scrollbar-width:none]">
      {photos.map((photo, i) => (
        <a
          key={photo.id}
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          className={`flex-none snap-center overflow-hidden rounded-3xl bg-line ${single ? 'w-full' : 'w-[85%]'}`}
        >
          <img
            src={photo.url}
            alt={`${name}, foto ${i + 1} de ${photos.length}`}
            className="aspect-[4/3] w-full object-cover"
          />
        </a>
      ))}
    </div>
  )
}
