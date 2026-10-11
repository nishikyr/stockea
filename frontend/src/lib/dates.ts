// Fechas "para personas": Hoy, Ayer, lunes 5 oct… Todo en español y en la hora local del móvil.

const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })
const weekdayDay = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
const dayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const fullDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

// Días de diferencia por calendario (no por 24 h): ayer a las 23:59 sigue siendo "Ayer"
function daysAgo(date: Date, now = new Date()) {
  const a = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

const clean = (s: string) => s.replace(',', '').replace('.', '') // "lunes, 5 oct." → "lunes 5 oct"
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function timeOf(iso: string) {
  return time.format(new Date(iso))
}

// Para los títulos de cada día del historial
export function dayLabel(iso: string) {
  const d = new Date(iso)
  const diff = daysAgo(d)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (d.getFullYear() === new Date().getFullYear()) return capitalize(clean(weekdayDay.format(d)))
  return clean(fullDate.format(d))
}

// Versión corta, para una línea: "Hoy 20:14", "Ayer 18:02", "5 oct"
export function shortWhen(iso: string) {
  const d = new Date(iso)
  const diff = daysAgo(d)
  if (diff === 0) return `Hoy ${timeOf(iso)}`
  if (diff === 1) return `Ayer ${timeOf(iso)}`
  if (d.getFullYear() === new Date().getFullYear()) return clean(dayMonth.format(d))
  return clean(fullDate.format(d))
}

// Clave para agrupar por día (en hora local)
export function dayKey(iso: string) {
  return new Date(iso).toDateString()
}
