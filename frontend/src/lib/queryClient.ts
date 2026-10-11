import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Si en cualquier pantalla el backend dice "no has iniciado sesión" (401),
    // la sesión ha caducado: recargamos en /login.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login')
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000, // durante 30 s los datos se consideran frescos: no se vuelven a pedir
      // Reintentar solo fallos de red o del servidor (5xx), nunca un 403/404
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
})
