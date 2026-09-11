import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'

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

export default function EHSRegistriList() {
  const [registri, setRegistri] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)

  const fetchRegistri = useCallback(async () => {
    try {
      const { data } = await api.get('/ehs/registri/')
      setRegistri(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRegistri()
    const timer = setInterval(fetchRegistri, 30000)
    return () => clearInterval(timer)
  }, [fetchRegistri])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  if (registri.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
          Nessun registro disponibile.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <div className="table-wrapper">
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
                  <td>{r.partecipanti_count}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => setViewing(r)}>👁️ Consulta</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <RegistroViewerModal registro={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
