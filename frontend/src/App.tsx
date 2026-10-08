import { Package, Plus } from 'lucide-react'
import { Badge } from './components/ui/Badge'
import { Button } from './components/ui/Button'
import { Card } from './components/ui/Card'
import { Input } from './components/ui/Input'

export default function App() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-white">
          <Package size={26} />
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight">Stockea</h1>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Taladro Bosch</span>
          <Badge tone="warn">Stock bajo</Badge>
        </div>
        <p className="text-muted">Estantería A · Caja 3</p>
        <div className="flex gap-2">
          <Badge>Solo ver</Badge>
          <Badge tone="brand">Técnico de mantenimiento</Badge>
          <Badge tone="dark">Administrador</Badge>
        </div>
      </Card>

      <Input label="Email" type="email" placeholder="tu@email.com" />
      <Input label="Contraseña" type="password" error="Email o contraseña incorrectos" />

      <Button fullWidth>Entrar</Button>
      <Button variant="secondary" fullWidth>Guardar</Button>
      <Button variant="ghost"><Plus size={20} /> Añadir</Button>
    </main>
  )
}