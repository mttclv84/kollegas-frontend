import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

// Colore del countdown: scaduto / meno di 15 giorni / meno di 30 / entro i 45 del pannello.
const countdownStile = (giorni) => {
  if (giorni < 0) return { bg: '#FEE2E2', text: '#991B1B' }
  if (giorni <= 15) return { bg: '#FFEDD5', text: '#9A3412' }
  if (giorni <= 30) return { bg: '#FEF3C7', text: '#92400E' }
  return { bg: '#DBEAFE', text: '#1E40AF' }
}

const countdownTesto = (giorni) => {
  if (giorni < 0) return `Scaduto da ${-giorni} gg`
  if (giorni === 0) return 'Scade oggi'
  if (giorni === 1) return 'Scade domani'
  return `${giorni} giorni`
}

export default function EHSScadenzeList() {
  const { can } = useAuth()
  const isAdminHO = can(['admin', 'admin_ehs', 'ho'])
  const [scadenze, setScadenze] = useState([])
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState([])
  const [corsi, setCorsi] = useState([])
  const [filterNegozio, setFilterNegozio] = useState('')
  const [filterCorso, setFilterCorso] = useState('')
  const [nascondiScaduti, setNascondiScaduti] = useState(false)

  const fetchScadenze = useCallback(async () => {
    try {
      const params = {}
      if (filterNegozio) params.negozio = filterNegozio
      const { data } = await api.get('/ehs/scadenze/', { params })
      setScadenze(data)
    } finally {
      setLoading(false)
    }
  }, [filterNegozio])

  useEffect(() => {
    fetchScadenze()
    const timer = setInterval(fetchScadenze, 3600000)
    return () => clearInterval(timer)
  }, [fetchScadenze])

  useEffect(() => {
    api.get('/ehs/corsi/').then(({ data }) => setCorsi(data)).catch(() => {})
    if (isAdminHO) api.get('/stores/').then(({ data }) => setStores(data.results || data)).catch(() => {})
  }, [isAdminHO])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  const visibili = scadenze.filter(s =>
    (!filterCorso || s.corso_id === Number(filterCorso)) &&
    (!nascondiScaduti || s.giorni_mancanti >= 0)
  )
  const scaduti = scadenze.filter(s => s.giorni_mancanti < 0).length
  const entro15 = scadenze.filter(s => s.giorni_mancanti >= 0 && s.giorni_mancanti <= 15).length

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 16px' }}>
          <div style={{ fontSize: 13, color: '#374151', marginRight: 'auto' }}>
            Formazioni in scadenza nei prossimi <strong>45 giorni</strong>
            {scadenze.length > 0 && (
              <span style={{ color: '#6B7280' }}> · {scaduti} scadute · {entro15} entro 15 giorni</span>
            )}
          </div>
          {isAdminHO && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label">Negozio</label>
              <select className="form-control" value={filterNegozio} onChange={e => setFilterNegozio(e.target.value)}>
                <option value="">Tutti i negozi</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
            <label className="form-label">Corso</label>
            <select className="form-control" value={filterCorso} onChange={e => setFilterCorso(e.target.value)}>
              <option value="">Tutti i corsi</option>
              {corsi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 8 }}>
            <input type="checkbox" checked={nascondiScaduti} onChange={e => setNascondiScaduti(e.target.checked)} />
            Nascondi scaduti
          </label>
        </div>
      </div>

      {visibili.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
            Nessuna formazione in scadenza nei prossimi 45 giorni.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Countdown</th>
                  <th>Nominativo</th>
                  {isAdminHO && <th>Negozio</th>}
                  <th>Corso</th>
                  <th>Scadenza</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibili.map(s => {
                  const stile = countdownStile(s.giorni_mancanti)
                  return (
                    <tr key={s.partecipante_id}>
                      <td>
                        <span style={{
                          background: stile.bg, color: stile.text, borderRadius: 4,
                          padding: '2px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                        }}>
                          ⏳ {countdownTesto(s.giorni_mancanti)}
                        </span>
                      </td>
                      <td><strong>{s.utente_nome}</strong></td>
                      {isAdminHO && <td>{s.negozio_nome || '—'}</td>}
                      <td>{s.corso_nome}</td>
                      <td>{new Date(s.scadenza_formazione).toLocaleDateString('it-IT')}</td>
                      <td>
                        {s.rinnovo_pianificato && (
                          <span style={{ fontSize: 11, color: '#065F46', background: '#D1FAE5', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
                            ✓ Rinnovo pianificato
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
