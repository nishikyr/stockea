import { useQueryClient } from '@tanstack/react-query'
import { projectKeys } from './projects'

// Cuando cambiamos algo (un movimiento, un producto, una categoría…) cambian MUCHAS cosas a la vez:
// el inventario, el historial, los contadores de la tarjeta del proyecto… En vez de actualizar
// cada una a mano, marcamos como "caducado" todo lo que empieza por ['projects'] y TanStack Query
// vuelve a pedir lo que esté en pantalla. Por eso todas nuestras claves empiezan igual.
export function useInvalidateProjects() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.all })
}
