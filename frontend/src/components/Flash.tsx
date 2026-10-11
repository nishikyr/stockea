import { CircleCheck } from 'lucide-react'
import { useEffect } from 'react'

// Mensaje verde de "hecho" que se va solo a los pocos segundos.
// role="status": el lector de pantalla lo lee sin interrumpir.
export function Flash({ message, onHide }: { message: string; onHide: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onHide, 4000)
    return () => clearTimeout(timer) // si el mensaje cambia o la pantalla se cierra, cancelamos el temporizador
  }, [message, onHide])

  return (
    <p role="status" className="flex items-center gap-2.5 rounded-2xl bg-in-soft px-4 py-3 font-semibold text-in">
      <CircleCheck size={20} aria-hidden="true" className="flex-none" /> {message}
    </p>
  )
}
