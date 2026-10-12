import type { Location } from '../types/api'

// Las ubicaciones llegan "planas", cada una con su parent_id. Aquí montamos el camino completo
// de cada una ("Estantería A › Caja 3") y las ordenamos por ese camino.
export function locationOptions(locations: Location[]) {
  const byId = new Map(locations.map((l) => [l.id, l]))

  function path(loc: Location): string {
    const names = [loc.name]
    let parent = loc.parent_id ? byId.get(loc.parent_id) : undefined
    // tope de 10 niveles por si acaso: nunca nos quedamos en un bucle infinito
    for (let i = 0; parent && i < 10; i++) {
      names.unshift(parent.name)
      parent = parent.parent_id ? byId.get(parent.parent_id) : undefined
    }
    return names.join(' › ')
  }

  return locations
    .map((l) => ({ id: l.id, label: path(l) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}
