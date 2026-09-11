import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const CONFERMA_ELIMINA = 'ELIMINARE DEFINITIVAMENTE'

function EliminaRegistroModal({ registro, onClose, onDeleted }) {
  const [testo, setTesto] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/ehs/registri/${registro.id}/`, { data: { conferma: testo } })
      toast.success('Registro eliminato definitivamente.')
      onDeleted()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l\'eliminazione.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 2900, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 32, maxWidth: 460, width: '92%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 10, textAlign: 'center' }}>🗑️</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 17, color: '#991B1B', textAlign: 'center' }}>
          Eliminare definitivamente questo registro?
        </h2>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 16, textAlign: 'center' }}>
          <strong>{registro.corso_nome}</strong> — {registro.negozio_nome}
          <br />Azione irreversibile: registro, presenze e evento in calendario verranno rimossi.
        </p>
        <p style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
          Digita <strong>{CONFERMA_ELIMINA}</strong> per confermare:
        </p>
        <input
          className="form-control"
          value={testo}
          onChange={e => setTesto(e.target.value)}
          placeholder={CONFERMA_ELIMINA}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Annulla</button>
          <button
            className="btn"
            style={{ background: '#EF4444', color: '#fff' }}
            disabled={testo !== CONFERMA_ELIMINA || deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Eliminazione...' : 'Elimina definitivamente'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RegistroViewerModal({ registro, onClose }) {
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let objectUrl
    api.get(`/ehs/registri/${registro.id}/file/`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data)
        setUrl(objectUrl)
      })
      .finally(() => setLoading(false))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [registro.id])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.88)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '14px 20px', marginBottom: 12,
        width: '90vw', maxWidth: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 13 }}>
          <strong>{registro.corso_nome}</strong> — {registro.negozio_nome} — {registro.data_confermata ? new Date(registro.data_confermata).toLocaleString('it-IT') : ''}
          <div style={{ color: '#6B7280', fontSize: 12 }}>
            Docente: {registro.docente_nome || '—'} · Fornitore: {registro.fornitore_nome || '—'} · Partecipanti: {registro.partecipanti_count}
          </div>
        </div>
        <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          ✕ Chiudi
        </button>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : url ? (
        <iframe src={url} style={{ width: '90vw', height: '75vh', border: 'none', borderRadius: 8, background: '#fff' }} title="Registro compilato" />
      ) : (
        <div style={{ color: '#fff' }}>Impossibile aprire il documento.</div>
      )}
    </div>
  )
}

function PartecipantiOverlay({ partecipanti }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      style={{ position: 'relative', cursor: 'default', textDecoration: 'underline dotted' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={e => e.stopPropagation()}
    >
      {partecipanti.length}
      {hover && partecipanti.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, top: '120%', zIndex: 50,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '10px 14px',
          minWidth: 200, fontSize: 12, color: '#374151',
        }}>
          {partecipanti.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 3,
                background: p.presente ? '#D1FAE5' : '#FEE2E2', color: p.presente ? '#065F46' : '#991B1B',
              }}>
                {p.presente ? 'P' : 'A'}
              </span>
              {p.utente_nome}
            </div>
          ))}
        </div>
      )}
    </span>
  )
}

export default function EHSRegistriList() {
  const { can } = useAuth()
  const isAdminHO = can(['admin', 'admin_ehs', 'ho'])
  const canElimina = can(['admin', 'admin_ehs'])
  const [registri, setRegistri] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [stores, setStores] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [corsi, setCorsi] = useState([])
  const [filterNegozio, setFilterNegozio] = useState('')
  const [filterFornitore, setFilterFornitore] = useState('')
  const [filterCorso, setFilterCorso] = useState('')

  const fetchRegistri = useCallback(async () => {
    try {
      const params = {}
      if (filterNegozio) params.negozio = filterNegozio
      if (filterFornitore) params.fornitore = filterFornitore
      if (filterCorso) params.corso = filterCorso
      const { data } = await api.get('/ehs/registri/', { params })
      setRegistri(data)
    } finally {
      setLoading(false)
    }
  }, [filterNegozio, filterFornitore, filterCorso])

  useEffect(() => {
    fetchRegistri()
    const timer = setInterval(fetchRegistri, 3600000)
    return () => clearInterval(timer)
  }, [fetchRegistri])

  useEffect(() => {
    if (!isAdminHO) return
    api.get('/stores/').then(({ data }) => setStores(data.results || data)).catch(() => {})
    api.get('/ehs/fornitori/').then(({ data }) => setFornitori(data)).catch(() => {})
    api.get('/ehs/corsi/').then(({ data }) => setCorsi(data)).catch(() => {})
  }, [isAdminHO])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <>
      {isAdminHO && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 16px' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label">Negozio</label>
              <select className="form-control" value={filterNegozio} onChange={e => setFilterNegozio(e.target.value)}>
                <option value="">Tutti i negozi</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label">Fornitore</label>
              <select className="form-control" value={filterFornitore} onChange={e => setFilterFornitore(e.target.value)}>
                <option value="">Tutti i fornitori</option>
                {fornitori.map(f => <option key={f.id} value={f.id}>{f.fornitore_ragione_sociale}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label">Corso</label>
              <select className="form-control" value={filterCorso} onChange={e => setFilterCorso(e.target.value)}>
                <option value="">Tutti i corsi</option>
                {corsi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            {(filterNegozio || filterFornitore || filterCorso) && (
              <button className="btn btn-secondary" onClick={() => { setFilterNegozio(''); setFilterFornitore(''); setFilterCorso('') }}>Reset</button>
            )}
          </div>
        </div>
      )}

      {registri.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
            Nessun registro disponibile.
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="table-wrapper" style={{ overflow: 'visible' }}>
            <table>
              <thead>
                <tr>
                  <th>Corso</th>
                  <th>Negozio</th>
                  <th>Data</th>
                  <th>Docente</th>
                  <th>Fornitore</th>
                  <th>Partecipanti</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registri.map(r => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setViewing(r)}>
                    <td><strong>{r.corso_nome}</strong></td>
                    <td>{r.negozio_nome}</td>
                    <td>{r.data_confermata ? new Date(r.data_confermata).toLocaleDateString('it-IT') : '—'}</td>
                    <td>{r.docente_nome || '—'}</td>
                    <td>{r.fornitore_nome || '—'}</td>
                    <td><PartecipantiOverlay partecipanti={r.partecipanti || []} /></td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewing(r)}>👁️ Consulta</button>
                      {canElimina && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Elimina definitivamente"
                          onClick={e => { e.stopPropagation(); setEliminando(r) }}>
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewing && <RegistroViewerModal registro={viewing} onClose={() => setViewing(null)} />}

      {eliminando && (
        <EliminaRegistroModal
          registro={eliminando}
          onClose={() => setEliminando(null)}
          onDeleted={() => { setEliminando(null); fetchRegistri() }}
        />
      )}
    </>
  )
}
