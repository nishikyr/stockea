import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  productApi, useCategories, useDeleteProduct, useLocations, useProduct, type ProductInput,
} from '../api/inventory'
import { useInvalidateProjects } from '../api/invalidate'
import { useProject } from '../api/projects'
import { CategoryForm } from '../components/product/CategoryForm'
import { LocationForm } from '../components/product/LocationForm'
import { PhotoPicker, type PendingPhoto } from '../components/product/PhotoPicker'
import { ErrorMessage, Loading } from '../components/StatusMessage'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Stepper } from '../components/ui/Stepper'
import { locationOptions } from '../lib/locations'
import { resizeImage } from '../lib/resizeImage'
import type { FlashState } from '../lib/useRouteFlash'
import type { Product } from '../types/api'

const UNIT_SUGGESTIONS = ['uds', 'cajas', 'bolsas', 'pares']

// La misma pantalla sirve para AÑADIR (/products/new) y EDITAR (/products/:id/edit).
export function ProductFormPage() {
  const { projectId = '', productId } = useParams()
  const navigate = useNavigate()
  const { data: project } = useProject(projectId)
  // Al añadir no hay producto que cargar: "enabled: false" hace que la consulta no se lance
  const product = useProduct(projectId, productId ?? '', { enabled: Boolean(productId) })

  const cancel = () => navigate(-1)

  if (project?.role === 'viewer') {
    return (
      <Shell title="Sin permiso" onCancel={cancel}>
        <ErrorMessage message="Con tu acceso puedes ver el trastero, pero no añadir ni cambiar productos." />
      </Shell>
    )
  }
  if (productId && product.isPending) return <Shell title="Editar producto" onCancel={cancel}><Loading /></Shell>
  if (productId && product.error) {
    return <Shell title="Editar producto" onCancel={cancel}><ErrorMessage message={product.error.message} /></Shell>
  }

  // key: si cambiamos de producto, React crea el formulario DE CERO (con el estado inicial del nuevo).
  // Así los useState del formulario se rellenan una sola vez con los datos cargados, sin useEffect.
  return (
    <Shell title={productId ? 'Editar producto' : 'Nuevo producto'} onCancel={cancel}>
      <ProductForm key={productId ?? 'new'} projectId={projectId} product={product.data} />
    </Shell>
  )
}

function Shell({ title, onCancel, children }: { title: string; onCancel: () => void; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center">
        <button type="button" onClick={onCancel} className="-ml-2 min-h-11 w-fit px-2 font-semibold text-brand">
          Cancelar
        </button>
        <h1 className="font-display text-lg font-bold">{title}</h1>
        <span />
      </header>
      {children}
    </main>
  )
}

type FormProps = { projectId: string; product?: Product }

function ProductForm({ projectId, product }: FormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const invalidate = useInvalidateProjects()
  const categories = useCategories(projectId)
  const locations = useLocations(projectId)
  const locOptions = locationOptions(locations.data ?? [])

  // --- Estado del formulario (valores iniciales: los del producto si estamos editando)
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? '')
  const [locationId, setLocationId] = useState(product?.location?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState(product?.unit ?? 'uds')
  const [minQuantity, setMinQuantity] = useState(product?.min_quantity ?? 0)
  const [newCategory, setNewCategory] = useState(false)
  const [newLocation, setNewLocation] = useState(false)

  // --- Fotos: las que ya tenía (menos las que quites) + las nuevas, que se suben al guardar
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const [preparing, setPreparing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [progress, setProgress] = useState('')
  const [warning, setWarning] = useState('')
  const existing = (product?.photos ?? []).filter((p) => !removedPhotoIds.includes(p.id))

  // Las vistas previas son URLs temporales (blob:...) que ocupan memoria: las liberamos al salir.
  const previewUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = previewUrls.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  // Id para cada foto nueva (solo sirve como "key" de React). OJO: no usamos crypto.randomUUID()
  // porque el navegador solo lo permite en HTTPS o en localhost, y desde el móvil entrabas por
  // http://192.168.x.x → "crypto.randomUUID is not a function" y se quedaba en "Preparando fotos…".
  const nextKey = useRef(0)

  async function addPhotos(files: File[]) {
    setPreparing(true)
    setPhotoError('')
    try {
      for (const file of files) {
        const blob = await resizeImage(file) // reducimos ANTES de subir
        const preview = URL.createObjectURL(blob)
        previewUrls.current.add(preview)
        const photo: PendingPhoto = { key: `foto-${nextKey.current++}`, blob, preview }
        setPending((prev) => [...prev, photo]) // cada foto aparece en cuanto está lista
      }
    } catch {
      setPhotoError('No se ha podido preparar la foto. Prueba con otra o vuelve a intentarlo.')
    } finally {
      // finally se ejecuta SIEMPRE, vaya bien o mal: así nunca nos quedamos en "Preparando fotos…"
      setPreparing(false)
    }
  }

  function removePending(key: string) {
    setPending((prev) => {
      const photo = prev.find((p) => p.key === key)
      if (photo) {
        URL.revokeObjectURL(photo.preview)
        previewUrls.current.delete(photo.preview)
      }
      return prev.filter((p) => p.key !== key)
    })
  }

  // --- Guardar: UNA mutación que encadena varias peticiones
  const save = useMutation({
    mutationFn: async () => {
      const input: ProductInput = {
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        location_id: locationId || null,
        unit: unit.trim() || 'uds',
        min_quantity: minQuantity,
      }
      const saved = product
        ? await productApi.update(projectId, product.id, input)
        : await productApi.create(projectId, { ...input, quantity })

      // El producto ya está guardado. Si una foto falla, no lo deshacemos: apuntamos cuál y seguimos.
      const failures: string[] = []
      const failedDeletes: string[] = []
      const failedUploads: string[] = []
      for (const photoId of removedPhotoIds) {
        try {
          await productApi.deletePhoto(projectId, saved.id, photoId)
        } catch (e) {
          failedDeletes.push(photoId)
          failures.push(e instanceof ApiError ? e.message : 'error de red')
        }
      }
      for (const [i, photo] of pending.entries()) {
        setProgress(`Subiendo foto ${i + 1} de ${pending.length}…`)
        try {
          await productApi.uploadPhoto(projectId, saved.id, photo.blob)
        } catch (e) {
          failedUploads.push(photo.key)
          failures.push(e instanceof ApiError ? e.message : 'error de red')
        }
      }
      return { saved, failures, failedDeletes, failedUploads }
    },
    // onSettled = pase lo que pase (bien, mal o a medias): refrescamos los datos
    onSettled: () => {
      setProgress('')
      return invalidate()
    },
    onSuccess: ({ saved, failures, failedDeletes, failedUploads }) => {
      const productUrl = `/projects/${projectId}/products/${saved.id}`
      const warning = `${failures.length === 1 ? 'Una foto ha fallado' : `${failures.length} fotos han fallado`}: ${failures[0]}`

      if (!product) {
        // Al AÑADIR vamos a la ficha nueva. replace: el formulario desaparece del historial,
        // así "Volver" desde la ficha lleva al inventario y no otra vez al formulario.
        const state: FlashState = failures.length
          ? { flash: `Producto añadido, pero ${warning.charAt(0).toLowerCase()}${warning.slice(1)}`, flashTone: 'warn' }
          : { flash: 'Producto añadido.' }
        navigate(productUrl, { replace: true, state })
      } else if (failures.length) {
        // Al EDITAR, si algo falla nos quedamos aquí: solo quedan pendientes las fotos que fallaron
        setPending((prev) => prev.filter((p) => failedUploads.includes(p.key)))
        setRemovedPhotoIds(failedDeletes)
        setWarning(`Cambios guardados, pero ${warning.charAt(0).toLowerCase()}${warning.slice(1)}. Puedes reintentarlo.`)
      } else if (location.key !== 'default') {
        navigate(-1) // volvemos a la ficha: ya muestra los datos nuevos
      } else {
        navigate(productUrl, { replace: true })
      }
    },
  })

  const validNumbers = !Number.isNaN(quantity) && !Number.isNaN(minQuantity)
  const canSave = name.trim() !== '' && validNumbers && !preparing && !save.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    setWarning('')
    if (canSave) save.mutate()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PhotoPicker existing={existing} pending={pending} busy={preparing} onAdd={(f) => void addPhotos(f)}
        onRemoveExisting={(id) => setRemovedPhotoIds((prev) => [...prev, id])} onRemovePending={removePending} />
      {photoError && <p role="alert" className="-mt-3 font-medium text-out">{photoError}</p>}

      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
        placeholder="Ej.: Taladro Bosch" />

      <Select label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
        action={!newCategory && <NewButton onClick={() => setNewCategory(true)} label="Nueva categoría" />}>
        <option value="">Sin categoría</option>
        {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      {newCategory && (
        <CategoryForm projectId={projectId} onCancel={() => setNewCategory(false)}
          onSaved={(id) => { setCategoryId(id); setNewCategory(false) }} />
      )}

      <Select label="¿Dónde está?" value={locationId} onChange={(e) => setLocationId(e.target.value)}
        action={!newLocation && <NewButton onClick={() => setNewLocation(true)} label="Nueva ubicación" />}>
        <option value="">Sin ubicación</option>
        {locOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Select>
      {newLocation && (
        <LocationForm projectId={projectId} locations={locations.data ?? []} onCancel={() => setNewLocation(false)}
          onSaved={(id) => { setLocationId(id); setNewLocation(false) }} />
      )}

      {product ? (
        <p className="rounded-2xl bg-cream px-4 py-3 text-[15px] text-muted">
          Hay <strong className="text-ink">{product.quantity} {product.unit}</strong>. Para cambiarlo usa Sacar,
          Guardar o Recontar en la ficha: así queda apuntado en el historial.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">Cuántas hay</span>
          <Stepper size="sm" editable value={quantity} onChange={setQuantity} min={0} max={1_000_000} label="Cuántas hay" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Input label="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} />
        <div className="flex flex-wrap gap-2">
          {UNIT_SUGGESTIONS.map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u}
              className={`h-10 rounded-full px-4 text-[15px] font-medium ${
                unit === u ? 'bg-ink text-cream' : 'border-[1.5px] border-line bg-cream text-ink'}`}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold">Avisar si quedan</span>
          <Stepper size="sm" editable value={minQuantity} onChange={setMinQuantity} min={0} max={1_000_000}
            label="Avisar si quedan" />
        </div>
        <p className="text-sm text-muted">
          {minQuantity > 0
            ? `Saldrá el aviso de stock bajo cuando queden ${minQuantity} o menos.`
            : 'Con 0, solo avisa cuando se acabe.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="descripcion" className="text-[15px] font-semibold">
          Notas <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea id="descripcion" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000}
          rows={3} placeholder="Ej.: Con maletín y dos baterías"
          className="rounded-2xl border-[1.5px] border-line bg-cream px-4 py-3 text-[17px] outline-none focus:border-brand" />
      </div>

      {warning && <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">{warning}</p>}
      {save.error && <p role="alert" className="rounded-2xl bg-out-soft px-4 py-3 font-medium text-out">{save.error.message}</p>}

      <Button type="submit" fullWidth disabled={!canSave} className="min-h-14 text-[17px]">
        {save.isPending ? progress || 'Guardando…' : product ? 'Guardar cambios' : 'Guardar producto'}
      </Button>

      {product && <DeleteProduct projectId={projectId} product={product} />}
    </form>
  )
}

function NewButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="-my-2 flex min-h-11 items-center gap-1 px-1 text-[15px] font-semibold text-brand">
      <Plus size={18} aria-hidden="true" /> Nueva
    </button>
  )
}

// Borrar pide confirmación en dos pasos (sin ventanas emergentes del navegador)
function DeleteProduct({ projectId, product }: { projectId: string; product: Product }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const mutation = useDeleteProduct(projectId)

  function remove() {
    mutation.mutate(product.id, {
      onSuccess: () =>
        navigate(`/projects/${projectId}`, { replace: true, state: { flash: `«${product.name}» eliminado.` } }),
    })
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)}
        className="flex min-h-12 items-center justify-center gap-2 font-semibold text-out">
        <Trash2 size={18} aria-hidden="true" /> Eliminar producto
      </button>
    )
  }
  return (
    <div role="group" aria-label="Confirmar borrado" className="flex flex-col gap-3 rounded-3xl bg-out-soft p-4">
      <p className="font-medium text-out">
        Se borrará «{product.name}» con sus fotos y todo su historial. No se puede deshacer.
      </p>
      {mutation.error && <p role="alert" className="font-medium text-out">{mutation.error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>No, dejarlo</Button>
        <button type="button" onClick={remove} disabled={mutation.isPending}
          className="min-h-12 flex-1 rounded-2xl bg-out px-4 font-bold text-white disabled:opacity-50">
          {mutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
      </div>
    </div>
  )
}
