import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import '../calendario/EventoModal.css'

const TESTO_CONFERMA = 'ELIMINA DEFINITIVAMENTE'
// Formazioni con una data fissata sul calendario EHS.
const STATI_PIANIFICATI = ['CONFERMATA', 'COMPLETATA']

function CestinoIcona() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// Elenco di tutte le formazioni EHS pianificate (solo Admin / Admin EHS), con
// eliminazione definitiva confermata digitando ELIMINA DEFINITIVAMENTE.
export default function EHSFormazioniPianificateModal({ onClose, onChanged }) {
  const [sessioni, setSessioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [cerca, setCerca] = useState('')
  const [daEliminare, setDaEliminare] = useState(null)
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState('')
  const [eliminando, setEliminando] = useState(false)

  const fetchSessioni = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ehs/sessioni/')
      setSessioni(data
        .filter(s => STATI_PIANIFICATI.includes(s.stato) && s.data_confermata)
        .sort((a, b) => b.data_confermata.localeCompare(a.data_confermata)))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessioni() }, [fetchSessioni])

  const apriConferma = (s) => { setDaEliminare(s); setConferma(''); setErrore('') }

  const handleElimina = async () => {
    setEliminando(true)
    setErrore('')
    try {
      await api.delete(`/ehs/sessioni/${daEliminare.id}/`, { data: { conferma } })
      setDaEliminare(null)
      fetchSessioni()
      onChanged?.()
    } catch (err) {
      setErrore(err.response?.data?.detail || 'Eliminazione non riuscita.')
    } finally {
      setEliminando(false)
    }
  }

  const filtro = cerca.trim().toLowerCase()
  const visibili = filtro
    ? sessioni.filter(s => `${s.corso_nome} ${s.negozio_nome} ${s.fornitore_nome || ''}`.toLowerCase().includes(filtro))
    : sessioni

  const fmtData = (iso) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Formazioni pianificate</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          <input
            className="form-control"
            placeholder="Cerca per corso, negozio o fornitore…"
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            style={{ marginBottom: 12, width: '100%' }}
          />
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : visibili.length === 0 ? (
            <p style={{ color: '#6B7280', fontSize: 14 }}>Nessuna formazione pianificata.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th><th>Corso</th><th>Negozio</th><th>Fornitore</th><th>Iscritti</th><th>Stato</th><th />
                  </tr>
                </thead>
                <tbody>
                  {visibili.map(s => (
                    <tr key={s.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtData(s.data_confermata)}</td>
                      <td>{s.corso_nome}</td>
                      <td>{s.negozio_nome}</td>
                      <td>{s.fornitore_nome || '—'}</td>
                      <td>{s.partecipanti_count}</td>
                      <td>{s.stato_display}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          title="Elimina definitivamente"
                          onClick={() => apriConferma(s)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}
                        >
                          <CestinoIcona />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {daEliminare && (
        <div className="modal-overlay" onClick={e => { e.stopPropagation(); setDaEliminare(null) }}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Elimina formazione</h2>
              <button className="modal-close" onClick={() => setDaEliminare(null)}>✕</button>
            </div>
            <div style={{ padding: '16px 24px 24px', fontSize: 14 }}>
              <p style={{ margin: '0 0 8px' }}>
                <strong>{daEliminare.corso_nome}</strong> — {daEliminare.negozio_nome}, {fmtData(daEliminare.data_confermata)}
              </p>
              <p style={{ margin: '0 0 12px', color: '#991B1B' }}>
                La formazione verrà rimossa dal calendario insieme a tutti gli iscritti ({daEliminare.partecipanti_count}).
                L'operazione non è reversibile.
              </p>
              <label style={{ display: 'block', marginBottom: 6 }}>
                Per confermare digita <strong>{TESTO_CONFERMA}</strong>
              </label>
              <input
                className="form-control"
                value={conferma}
                onChange={e => setConferma(e.target.value)}
                autoFocus
                style={{ width: '100%' }}
              />
              {errore && <div style={{ color: '#991B1B', marginTop: 8 }}>{errore}</div>}
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDaEliminare(null)}>Annulla</button>
                <button
                  className="btn btn-danger"
                  disabled={conferma !== TESTO_CONFERMA || eliminando}
                  onClick={handleElimina}
                >
                  {eliminando ? 'Eliminazione…' : 'Elimina definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
