import { format, subDays } from 'date-fns'

// Trascorsi 7 giorni dalla data l'aula è chiusa: in calendario appare grigia e,
// tranne che per l'Admin, i partecipanti sono solo consultabili (vedi backend
// participants.views.aula_chiusa).
export const GIORNI_CHIUSURA_AULA = 7

export function isAulaChiusa(data) {
  return !!data && data < format(subDays(new Date(), GIORNI_CHIUSURA_AULA), 'yyyy-MM-dd')
}
