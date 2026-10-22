import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isAulaChiusa } from '../../utils/aule'
import '../calendario/EventoModal.css'

// Scheda di sola lettura di un'aula EHS confermata: dal calendario ogni store (e HO)
// può vederla e iscrivere le proprie persone fino a esaurimento posti. Passati 7
// giorni l'aula è chiusa e resta solo la consultazione dei partecipanti (tranne Admin).
export default function EHSAulaInfoModal({ evento, onClose }) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const hasLimit = evento.max_partecipanti > 0
  const pieno = hasLimit && (evento.posti_disponibili ?? 0) <= 0
  const chiusa = !can(['admin']) && isAulaChiusa(evento.data)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{evento.ehs_corso_nome || evento.attivita_nome}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="evento-detail">
          <div className="detail-grid">
            <div className="detail-row"><span>Data</span><strong>{new Date(evento.data).toLocaleDateString('it-IT')}</strong></div>
            <div className="detail-row"><span>Orario</span><strong>{evento.ora_inizio?.slice(0, 5)} - {evento.ora_fine?.slice(0, 5)}</strong></div>
            <div className="detail-row"><span>Negozio</span><strong>{evento.location_display || '—'}</strong></div>
            {evento.ehs_luogo && <div className="detail-row"><span>Luogo</span><strong>{evento.ehs_luogo}</strong></div>}
            <div className="detail-row">
              <span>Iscritti</span>
              <strong>{evento.iscritti_count}{hasLimit ? ` su ${evento.max_partecipanti} posti` : ''}</strong>
            </div>
          </div>
          {pieno && !chiusa && (
            <div style={{ fontSize: 13, color: '#991B1B', background: '#FEE2E2', borderRadius: 6, padding: '8px 12px', marginTop: 12 }}>
              Posti esauriti: non è possibile iscrivere altre persone.
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>Chiudi</button>
            <button className="btn btn-primary" onClick={() => navigate(`/iscrizioni?evento=${evento.id}`)}>
              {chiusa || pieno ? 'Visualizza partecipanti' : 'Iscrivi persone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
