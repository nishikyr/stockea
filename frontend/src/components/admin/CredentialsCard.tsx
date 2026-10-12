import { Check, Copy, KeyRound, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { copyText } from '../../lib/clipboard'
import { firstName } from '../../lib/format'
import { Button } from '../ui/Button'

type Props = { name: string; email: string; password: string; onDone: () => void }

// Se muestra UNA vez tras crear una cuenta o poner una contraseña nueva: es el único momento
// en que se ve la contraseña (el backend solo guarda su hash y ya no se puede consultar).
export function CredentialsCard({ name, email, password, onDone }: Props) {
  const [copied, setCopied] = useState(false)
  const message =
    `¡Hola ${firstName(name)}! Ya puedes ver el trastero en Stockea:\n${window.location.origin}\n\n` +
    `Email: ${email}\nContraseña: ${password}\n\nCuando entres, puedes cambiar la contraseña en Ajustes.`

  async function copy() {
    setCopied(await copyText(message))
  }

  return (
    <div role="status" className="flex flex-col gap-3 rounded-3xl bg-in-soft p-4 text-ink">
      <p className="flex items-center gap-2 font-bold text-in">
        <KeyRound size={20} aria-hidden="true" /> Datos de acceso de {firstName(name)}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl bg-cream px-4 py-3 text-[15px]">
        <dt className="text-muted">Email</dt>
        <dd className="truncate font-semibold">{email}</dd>
        <dt className="text-muted">Contraseña</dt>
        <dd className="font-mono font-semibold tracking-wide select-all">{password}</dd>
      </dl>
      <p className="text-sm text-muted">Apúntala o envíasela ahora: después no se puede volver a ver.</p>
      <div className="flex flex-wrap gap-2">
        {/* wa.me abre WhatsApp con el mensaje escrito; ella elige a quién enviarlo */}
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 font-bold text-white">
          <MessageCircle size={20} aria-hidden="true" /> WhatsApp
        </a>
        <Button type="button" variant="secondary" className="flex-1" onClick={() => void copy()}>
          {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <Button type="button" variant="ghost" onClick={onDone}>Hecho</Button>
    </div>
  )
}
