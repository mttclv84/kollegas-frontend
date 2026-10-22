import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const FILTRI_VUOTI = { corso: '', negozio: '', citta: '', dal: '', al: '', modalita: '', solo_posti: false }

const fmtDataOra = (d) => new Date(d).toLocaleString('it-IT', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

// Ricerca rapida delle aule confermate ancora da svolgere, in tutti i negozi: lo store
// trova dove iscrivere i propri collaboratori senza scorrere il calendario mese per mese.
export default function EHSCercaFormazioni({ onApri }) {
  const { can } = useAuth()
  const navigate = useNavigate()
  const puoIscrivere = can(['store', 'admin', 'admin_ehs', 'ho'])
  const vedeTutteLeSessioni = can(['admin', 'admin_ehs', 'ho'])
  const [aperta, setAperta] = useState(false)
  const [filtri, setFiltri] = useState(FILTRI_VUOTI)
  const [corsi, setCorsi] = useState([])
  const [negozi, setNegozi] = useState([])
  const [risultati, setRisultati] = useState(null)
  const [loading, setLoading] = useState(false)
  const setF = (k, v) => setFiltri(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!aperta || corsi.length) return
    api.get('/ehs/corsi/').then(({ data }) => setCorsi(data.filter(c => c.attivo))).catch(() => {})
    api.get('/stores/')
      .then(({ data }) => setNegozi((data.results || data).filter(s => s.is_active)))
      .catch(() => {})
  }, [aperta, corsi.length])

  const cerca = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filtri).filter(([, v]) => v !== '' && v !== false))
      if (params.solo_posti) params.solo_posti = '1'
      const { data } = await api.get('/ehs/cerca-formazioni/', { params })
      setRisultati(data)
    } finally {
      setLoading(false)
    }
  }, [filtri])

  useEffect(() => { if (aperta) cerca() }, [aperta, cerca])

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <button type="button" onClick={() => setAperta(a => !a)} style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
        padding: '12px 16px', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'space-between',
      }}>
        <span>🔎 Cerca una formazione</span>
        <span style={{ color: '#6B7280' }}>{aperta ? '▲' : '▼'}</span>
      </button>

      {aperta && (
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
            <select className="form-control" value={filtri.corso} onChange={e => setF('corso', e.target.value)}>
              <option value="">Tutti i corsi</option>
              {corsi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select className="form-control" value={filtri.negozio} onChange={e => setF('negozio', e.target.value)}>
              <option value="">Tutti i negozi</option>
              {negozi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <input className="form-control" placeholder="Città" value={filtri.citta}
              onChange={e => setF('citta', e.target.value)} />
            <input type="date" className="form-control" title="Dal" value={filtri.dal}
              onChange={e => setF('dal', e.target.value)} />
            <input type="date" className="form-control" title="Al" value={filtri.al}
              onChange={e => setF('al', e.target.value)} />
            <select className="form-control" value={filtri.modalita} onChange={e => setF('modalita', e.target.value)}>
              <option value="">In presenza e online</option>
              <option value="PRESENZA">In presenza</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={filtri.solo_posti} onChange={e => setF('solo_posti', e.target.checked)} />
              Solo con posti liberi
            </label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFiltri(FILTRI_VUOTI)}>
              Azzera filtri
            </button>
          </div>

          {loading && <div className="loading-center"><div className="spinner" /></div>}
          {!loading && risultati?.length === 0 && (
            <p style={{ color: '#9CA3AF', margin: 0 }}>Nessuna formazione in programma con questi filtri.</p>
          )}
          {!loading && risultati?.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Data</th><th>Corso</th><th>Negozio</th><th>Iscritti</th><th>Posti</th><th></th></tr>
                </thead>
                <tbody>
                  {risultati.map(r => {
                    const sottoMinimo = r.iscritti < r.minimo
                    return (
                      <tr key={r.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {fmtDataOra(r.data)}
                          {r.modalita === 'ONLINE' && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>online</span>}
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.corso_nome}</td>
                        <td>{r.negozio_nome}<div style={{ fontSize: 11, color: '#9CA3AF' }}>{r.negozio_comune}</div></td>
                        <td style={{ color: sottoMinimo ? '#DC2626' : '#065F46', fontWeight: 600 }}
                          title={sottoMinimo ? `Sotto il minimo di ${r.minimo}: senza iscritti la formazione viene cancellata` : undefined}>
                          {r.iscritti} <span style={{ fontWeight: 400, color: '#6B7280' }}>
                            (min {r.minimo}{r.massimo ? ` · max ${r.massimo}` : ''})
                          </span>
                          {sottoMinimo && ' ⚠️'}
                        </td>
                        <td>{r.posti_liberi == null ? '—' : r.posti_liberi}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {puoIscrivere && r.evento_id && r.posti_liberi !== 0 && (
                            <button type="button" className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/iscrizioni?evento=${r.evento_id}`)}>
                              Iscrivi
                            </button>
                          )}
                          {(r.mio_negozio || vedeTutteLeSessioni || can(['fornitore'])) && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onApri(r.id)}>
                              Dettagli
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
