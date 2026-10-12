import type { Location } from '../types/api'

// Las ubicaciones llegan "planas", cada una con su parent_id. Aquí montamos el camino completo
// de cada una ("Estantería A › Caja 3"), su profundidad, y las ordenamos por ese camino.
export function locationOptions(locations: Location[]) {
  const byId = new Map(locations.map((l) => [l.id, l]))

  function chain(loc: Location): string[] {
    const names = [loc.name]
    let parent = loc.parent_id ? byId.get(loc.parent_id) : undefined
    // tope de 10 niveles por si acaso: nunca nos quedamos en un bucle infinito
    for (let i = 0; parent && i < 10; i++) {
      names.unshift(parent.name)
      parent = parent.parent_id ? byId.get(parent.parent_id) : undefined
    }
    return names
  }

  return locations
    .map((l) => {
      const names = chain(l)
      return { id: l.id, label: names.join(' › '), depth: names.length - 1 }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

// Una ubicación y todo lo que hay dentro (hijas, nietas…). Al editar "Estantería A" no puedes
// meterla dentro de "Caja 3" si Caja 3 está dentro de ella: sería un bucle (el backend también lo impide).
export function selfAndDescendants(locations: Location[], id: string) {
  const result = new Set([id])
  let added = true
  while (added) {
    added = false
    for (const l of locations) {
      if (l.parent_id && result.has(l.parent_id) && !result.has(l.id)) {
        result.add(l.id)
        added = true
      }
    }
  }
  return result
}
