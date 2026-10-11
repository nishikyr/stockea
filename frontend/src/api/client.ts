// Un único sitio desde el que el frontend habla con el backend de Go.
// Todas las pantallas usan api(), así el manejo de errores es igual en toda la app.

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Options = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown // un objeto (se envía como JSON) o un FormData (para fotos)
  headers?: Record<string, string>
}

export async function api<T>(path: string, { body, headers, ...init }: Options = {}): Promise<T> {
  const isForm = body instanceof FormData

  const res = await fetch(`/api${path}`, {
    ...init,
    // Envía la cookie de sesión. Como Vite redirige /api al backend, es el "mismo origen".
    credentials: 'same-origin',
    headers: {
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })

  if (!res.ok) {
    // El backend siempre responde los errores como {"message": "..."}
    let message = 'Algo ha fallado. Inténtalo de nuevo.'
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
    } catch {
      // la respuesta no era JSON: nos quedamos con el mensaje genérico
    }
    if (res.status === 429) message = 'Demasiados intentos. Espera un minuto y vuelve a probar.'
    // El backend escribe los mensajes en minúscula; en pantalla queda mejor con mayúscula inicial
    message = message.charAt(0).toUpperCase() + message.slice(1)
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T // respuesta sin contenido (p. ej. logout)
  return (await res.json()) as T
}
