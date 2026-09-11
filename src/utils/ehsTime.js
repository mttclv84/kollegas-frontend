// Gli orari EHS sono sempre a 00 o 30 minuti (ore intere o mezz'ore).
export const EHS_TIME_STEP = 1800 // secondi, per l'attributo step dei datetime-local

export function arrotondaMezzora(datetimeLocalValue) {
  if (!datetimeLocalValue) return datetimeLocalValue
  const d = new Date(datetimeLocalValue)
  if (Number.isNaN(d.getTime())) return datetimeLocalValue
  const minuti = d.getMinutes()
  const arrotondati = minuti < 15 ? 0 : minuti < 45 ? 30 : 60
  d.setMinutes(0, 0, 0)
  d.setMinutes(arrotondati)
  return d
}
