// Las fotos del móvil pesan 3-8 MB y miden 4000 px. Para verlas en la app sobra con 1600 px:
// las reducimos EN EL NAVEGADOR antes de subirlas. Suben más rápido (también desde el extranjero),
// ocupan menos en el servidor y nunca chocan con el límite de 10 MB del backend.
export async function resizeImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  try {
    // createImageBitmap decodifica la imagen; imageOrientation corrige las fotos "de lado" del móvil
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    // Dibujamos la imagen más pequeña en un <canvas> invisible…
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    // …y lo exportamos como JPEG
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file // si el navegador no puede, subimos la original y que decida el backend
  }
}
