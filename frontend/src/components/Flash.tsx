import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

export type FlashTone = 'ok' | 'warn'

// Mensaje de "hecho" que se va solo a los pocos segundos (en naranja si algo salió a medias).
// role="status": el lector de pantalla lo lee sin interrumpir.
export function Flash({ message, tone = 'ok', onHide }: { message: string; tone?: FlashTone; onHide: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onHide, tone === 'warn' ? 8000 : 4000)
    return () => clearTimeout(timer) // si el mensaje cambia o la pantalla se cierra, cancelamos el temporizador
  }, [message, tone, onHide])

  const Icon = tone === 'ok' ? CircleCheck : TriangleAlert
  return (
    <p role="status" className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 font-semibold ${
      tone === 'ok' ? 'bg-in-soft text-in' : 'bg-warn-soft text-warn'}`}>
      <Icon size={20} aria-hidden="true" className="flex-none" /> {message}
    </p>
  )
}
