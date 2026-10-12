import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { FlashTone } from '../components/Flash'

export type FlashState = { flash?: string; flashTone?: FlashTone }

// Mensaje que nos manda otra pantalla al navegar hasta aquí:
//   navigate('/ruta', { state: { flash: 'Producto añadido.' } })
// Viaja en el "state" de la navegación, no en la URL. Al ocultarlo lo borramos de ese state
// para que no vuelva a salir si recargas la página.
export function useRouteFlash() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as FlashState | null) ?? {}
  const hide = useCallback(
    () => navigate({ search: location.search }, { replace: true, state: null }),
    [navigate, location.search],
  )
  return { flash: state.flash, tone: state.flashTone ?? 'ok', hide }
}
