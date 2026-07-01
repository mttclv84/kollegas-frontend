import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

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

export default function RichiesteModifica() {
  const { can } = useAuth()
  const isAdminHO = can(['admin', 'ho'])

  const [richieste, setRichieste] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStato, setFiltroStato] = useState(isAdminHO ? 'pending' : '')
  const [processing, setProcessing] = useState(null)

  const fetchRichieste = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroStato) params.stato = filtroStato
      const { data } = await api.get('/richieste-cancellazione/', { params })
      setRichieste(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRichieste() }, [filtroStato])

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
      <h1 className="page-title">🔔 Richieste di Modifica</h1>

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
