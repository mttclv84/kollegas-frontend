import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import EHSSessioneModal from '../components/ehs/EHSSessioneModal'

const STATO_CFG = {
  pending:   { label: 'In attesa',  bg: '#DBEAFE', color: '#1E40AF' },
  approvata: { label: 'Approvata',  bg: '#D1FAE5', color: '#065F46' },
  rifiutata: { label: 'Rifiutata',  bg: '#FEE2E2', color: '#991B1B' },
}

function StatoBadge({ stato }) {
  const cfg = STATO_CFG[stato] || STATO_CFG.pending
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
    }}>{cfg.label}</span>
  )
}

// Fornitori secondari ed eccezionali in attesa di validazione: si decidono dal dettaglio della richiesta.
function FornitoriDaValidare() {
  const [sessioni, setSessioni] = useState([])
  const [aperta, setAperta] = useState(null)
  const carica = () => {
    api.get('/ehs/sessioni/', { params: { stato: 'IN_APPROVAZIONE' } }).then(({ data }) => setSessioni(data)).catch(() => {})
  }
  useEffect(carica, [])

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        Fornitori da validare <span className="badge badge-neutral">{sessioni.length}</span>
      </div>
      {sessioni.length === 0 ? (
        <div className="card-body" style={{ color: '#9CA3AF' }}>Nessun fornitore da validare.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Negozio</th><th>Corso</th><th>Fornitore richiesto</th><th>Tipo</th><th>Data richiesta</th><th></th></tr>
            </thead>
            <tbody>
              {sessioni.map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-neutral">{s.negozio_nome}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.corso_nome}</td>
                  <td>{s.fornitore_richiesto_nome}</td>
                  <td>{s.fornitore_secondario ? 'Fornitore secondario' : 'Fuori perimetro'}</td>
                  <td style={{ whiteSpace: 'nowrap', color: '#6B7280', fontSize: 12 }}>
                    {new Date(s.creata_il).toLocaleDateString('it-IT')}
                  </td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => setAperta(s.id)}>Valuta</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {aperta && (
        <EHSSessioneModal sessioneId={aperta} onClose={() => setAperta(null)} onChanged={carica} />
      )}
    </div>
  )
}

export default function RichiesteModifica({ ambito = 'altro' }) {
  const { can } = useAuth()
  const isEHS = ambito === 'ehs'
  // Le richieste EHS le valida l'EHS Admin, le altre Admin/HO; l'Admin vede e decide entrambe.
  const isAdminHO = can(isEHS ? ['admin', 'admin_ehs'] : ['admin', 'ho'])

  const [richieste, setRichieste] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState(isAdminHO ? 'pending' : '')
  const [processing, setProcessing] = useState(null)

  const fetchRichieste = async () => {
    setLoading(true)
    try {
      const params = { ambito }
      if (filtroStato) params.stato = filtroStato
      const { data } = await api.get('/richieste-cancellazione/', { params })
      setRichieste(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRichieste() }, [filtroStato, ambito])

  const handleProcess = async (id, stato) => {
    if (!window.confirm(`Vuoi ${stato === 'approvata' ? 'approvare' : 'rifiutare'} questa richiesta?`)) return
    setProcessing(id)
    try {
      await api.patch(`/richieste-cancellazione/${id}/`, { stato })
      toast.success(stato === 'approvata' ? 'Richiesta approvata. Iscritto rimosso.' : 'Richiesta rifiutata.')
      fetchRichieste()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div>
      <h1 className="page-title">🔔 Richieste di Modifica{isEHS ? ' EHS' : ''}</h1>

      {isEHS && <FornitoriDaValidare />}
      {isEHS && <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Cancellazioni di iscritti a formazioni EHS</h3>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Filtra per stato:</label>
            <select
              className="form-control"
              style={{ maxWidth: 180 }}
              value={filtroStato}
              onChange={e => setFiltroStato(e.target.value)}
            >
              {isAdminHO && <option value="pending">In attesa</option>}
              <option value="">Tutte</option>
              <option value="approvata">Approvate</option>
              <option value="rifiutata">Rifiutate</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : richieste.length === 0 ? (
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>
            {filtroStato === 'pending' ? 'Nessuna richiesta in attesa.' : 'Nessuna richiesta trovata.'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {isAdminHO && <th>Store</th>}
                  <th>Partecipante</th>
                  <th>Attività</th>
                  <th>Data evento</th>
                  <th>Motivazione</th>
                  <th>Stato</th>
                  <th>Data richiesta</th>
                  {isAdminHO && <th>Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {richieste.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#9CA3AF', fontSize: 12 }}>#{r.id}</td>
                    {isAdminHO && (
                      <td>
                        <span className="badge badge-neutral">{r.richiedente_store || '—'}</span>
                      </td>
                    )}
                    <td style={{ fontWeight: 600 }}>{r.partecipante_nome || '—'}</td>
                    <td>{r.attivita_nome || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.evento_data || '—'}</td>
                    <td style={{ maxWidth: 260, fontSize: 13, color: '#374151' }}>
                      {r.motivazione}
                    </td>
                    <td>
                      <StatoBadge stato={r.stato} />
                      {r.processed_by_nome && (
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                          da {r.processed_by_nome}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: '#6B7280', fontSize: 12 }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('it-IT') : '—'}
                    </td>
                    {isAdminHO && (
                      <td>
                        {r.stato === 'pending' && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            <button
                              className="btn btn-sm"
                              style={{ background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', whiteSpace: 'nowrap' }}
                              disabled={processing === r.id}
                              onClick={() => handleProcess(r.id, 'approvata')}
                            >✓ Approva cancellazione</button>
                            <button
                              className="btn btn-sm"
                              style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', whiteSpace: 'nowrap' }}
                              disabled={processing === r.id}
                              onClick={() => handleProcess(r.id, 'rifiutata')}
                            >✕ Rifiuta cancellazione</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
