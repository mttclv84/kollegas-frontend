import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import api from '../../api/client'

const STATO_LABELS = {
  RICHIESTA_INVIATA: 'Richiesta inviata',
  DATA_PROPOSTA: 'Data proposta',
  DATA_CONTROPROPOSTA: 'Contro-proposta',
  CONFERMATA: 'Confermata',
  COMPLETATA: 'Completata',
  ANNULLATA: 'Annullata',
}

const STATO_COLORS = {
  RICHIESTA_INVIATA: { bg: '#DBEAFE', text: '#1E40AF' },
  DATA_PROPOSTA: { bg: '#FEF3C7', text: '#92400E' },
  DATA_CONTROPROPOSTA: { bg: '#FEF3C7', text: '#92400E' },
  CONFERMATA: { bg: '#D1FAE5', text: '#065F46' },
  COMPLETATA: { bg: '#E5E7EB', text: '#374151' },
  ANNULLATA: { bg: '#FEE2E2', text: '#991B1B' },
}

function StoricoIcon({ sessioneId }) {
  const [log, setLog] = useState(null)
  const [hover, setHover] = useState(false)

  const handleEnter = () => {
    setHover(true)
    if (log === null) {
      api.get(`/ehs/sessioni/${sessioneId}/`)
        .then(({ data }) => setLog(data.log || []))
        .catch(() => setLog([]))
    }
  }

  return (
    <span
      style={{ position: 'relative', cursor: 'default', fontSize: 15 }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHover(false)}
      onClick={e => e.stopPropagation()}
    >
      📄
      {hover && (
        <div style={{
          position: 'absolute', right: 0, top: '120%', zIndex: 50,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '10px 14px',
          minWidth: 260, maxWidth: 340, fontSize: 12, color: '#374151',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Storico</div>
          {log === null ? (
            <div style={{ color: '#9CA3AF' }}>Caricamento...</div>
          ) : log.length === 0 ? (
            <div style={{ color: '#9CA3AF' }}>Nessuna voce.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {log.map(l => (
                <div key={l.id}>
                  • {new Date(l.timestamp).toLocaleString('it-IT')} — {l.nota || `${l.stato_precedente || '—'} → ${l.stato_nuovo}`}
                  {l.utente_nome && <span style={{ color: '#9CA3AF' }}> ({l.utente_nome})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  )
}

const EHSRichiesteList = forwardRef(function EHSRichiesteList({ onSelect }, ref) {
  const [sessioni, setSessioni] = useState([])
  const [loading, setLoading] = useState(true)
  const primaVolta = useRef(true)

  const fetchSessioni = useCallback(async () => {
    if (primaVolta.current) setLoading(true)
    try {
      const { data } = await api.get('/ehs/sessioni/')
      setSessioni(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      primaVolta.current = false
    }
  }, [])

  useEffect(() => {
    fetchSessioni()
    const timer = setInterval(fetchSessioni, 3600000)
    return () => clearInterval(timer)
  }, [fetchSessioni])
  useImperativeHandle(ref, () => ({ refresh: fetchSessioni }))

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  if (sessioni.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
          Nessuna richiesta EHS.
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ overflow: 'visible' }}>
      <div className="table-wrapper" style={{ overflow: 'visible' }}>
        <table>
          <thead>
            <tr>
              <th>Corso</th>
              <th>Negozio</th>
              <th>Stato</th>
              <th>Partecipanti</th>
              <th>Programmazione</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessioni.map(s => {
              const stato = STATO_COLORS[s.stato] || { bg: '#F3F4F6', text: '#374151' }
              return (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(s.id)}>
                  <td><strong>{s.corso_nome}</strong></td>
                  <td>{s.negozio_nome}</td>
                  <td>
                    <span style={{
                      background: stato.bg, color: stato.text,
                      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      {STATO_LABELS[s.stato] || s.stato}
                    </span>
                  </td>
                  <td>{s.partecipanti_count}</td>
                  <td>{s.data_confermata ? new Date(s.data_confermata).toLocaleString('it-IT') : '—'}</td>
                  <td style={{ textAlign: 'right' }}><StoricoIcon sessioneId={s.id} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default EHSRichiesteList
