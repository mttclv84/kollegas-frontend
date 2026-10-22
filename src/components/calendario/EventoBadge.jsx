import './EventoBadge.css'

export const TIPOLOGIA_COLORS = {
  ld:         '#00B5D8',
  recruiting: '#9B2FA6',
  ehs:        '#10B981',
  payroll:    '#F59E0B',
  altro:      '#6B7280',
}

export function getEventColor(evento) {
  if (evento.attivita_nome?.toLowerCase().includes('gwu ra-tm')) return '#F97316'
  return TIPOLOGIA_COLORS[evento.attivita_tipologia] || '#6B7280'
}

// Rosso fuoco del profilo delle formazioni EHS mostrate sul calendario principale.
export const ROSSO_FUOCO_EHS = '#E8170B'

// `ehsRidotto`: formazione EHS vista dal calendario principale — casella grigia larga
// la metà, solo profilo rosso fuoco e senza numero di iscritti (si gestisce nell'area EHS).
export default function EventoBadge({ evento, onClick, dimmed = false, clickable = true, ehsRidotto = false }) {
  const color = dimmed || ehsRidotto ? '#9CA3AF' : getEventColor(evento)

  const hasLimit = evento.max_partecipanti > 0
  const countsText = hasLimit
    ? `${evento.iscritti_count}/${evento.max_partecipanti} iscritti • ${evento.posti_disponibili ?? 0} liberi`
    : `${evento.iscritti_count} iscritti`

  // Sul calendario principale gli eventi EHS mostrano corso (prime due parole) e
  // numero store, invece del titolo generico fisso "EHS".
  // Calendario EHS del fornitore: le attività altrui arrivano già anonimizzate
  // dal backend (solo store + "Occupato"), senza conteggi iscritti.
  const occupato = !!evento.occupato || ehsRidotto
  const labelTesto = ehsRidotto
    ? `EHS · Store ${evento.ehs_negozio_codice || ''}`
    : occupato
    ? [evento.location_display, 'Occupato'].filter(Boolean).join(' · ')
    : evento.is_ehs && evento.ehs_corso_nome
    ? `${evento.ehs_corso_nome.split(' ').slice(0, 2).join(' ')} · Store ${evento.ehs_negozio_codice || ''}`
    : evento.attivita_nome

  const tooltip = [
    labelTesto,
    occupato ? null : evento.location_display,
    `${evento.ora_inizio?.slice(0,5)} - ${evento.ora_fine?.slice(0,5)}`,
    occupato ? null : countsText,
  ].filter(Boolean).join(' • ')

  const content = (
    <>
      <span className="badge-dot" />
      <span className="badge-text">{labelTesto}</span>
      {!occupato && (
        <span className="badge-count">
          {evento.iscritti_count}
          {hasLimit && (
            <> / <span className="badge-liberi">{evento.posti_disponibili ?? 0}</span></>
          )}
        </span>
      )}
    </>
  )

  const stileRidotto = ehsRidotto
    ? { width: '50%', border: `1.5px solid ${ROSSO_FUOCO_EHS}`, background: '#F3F4F6', color: '#6B7280' }
    : {}

  return (
    <div className="tooltip-wrap">
      {clickable ? (
        <button
          className="evento-badge"
          style={{ '--badge-color': color, opacity: dimmed ? 0.65 : 1, ...stileRidotto }}
          onClick={onClick}
          title={tooltip}
        >
          {content}
        </button>
      ) : (
        <div
          className="evento-badge evento-badge-readonly"
          style={{ '--badge-color': color, opacity: dimmed ? 0.65 : 1, ...stileRidotto }}
          title={tooltip}
          onClick={e => e.stopPropagation()}
        >
          {content}
        </div>
      )}
      <div className="tooltip-content">{tooltip}</div>
    </div>
  )
}
