import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import BadgeLA from '../ui/BadgeLA'

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

// `onDocumentoEliminato`: se passato, l'Admin generale vede "Cancella documento"
// (il documento sparisce anche dall'aula e la sezione si riapre per il fornitore).
export function RegistroViewerModal({ registro, onClose, onDocumentoEliminato }) {
  const { can } = useAuth()
  const puoCancellare = !!onDocumentoEliminato && can(['admin'])
  const [cancellando, setCancellando] = useState(false)
  const [url, setUrl] = useState(null)
  const [errore, setErrore] = useState(null)
  const [loading, setLoading] = useState(true)
  const documenti = registro.documenti || []
  const [documentoId, setDocumentoId] = useState(documenti[0]?.id ?? null)

  useEffect(() => {
    let objectUrl
    setLoading(true)
    setUrl(null)
    setErrore(null)
    const path = documentoId ? `/ehs/registri/${registro.id}/file/${documentoId}/` : `/ehs/registri/${registro.id}/file/`
    api.get(path, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data)
        setUrl(objectUrl)
      })
      .catch(async (err) => {
        // La risposta è un blob anche in errore: ne legge il messaggio.
        let msg = 'Impossibile aprire il documento.'
        try { msg = JSON.parse(await err.response.data.text()).detail || msg } catch { /* niente */ }
        setErrore(msg)
      })
      .finally(() => setLoading(false))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [registro.id, documentoId])

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
        <div style={{ display: 'flex', gap: 8 }}>
          {puoCancellare && documentoId && (
            <button disabled={cancellando} onClick={async () => {
              const doc = documenti.find(d => d.id === documentoId)
              if (!window.confirm(`Cancellare definitivamente "${doc?.nome_originale || 'questo documento'}"? `
                + "Sparisce anche dall'aula e la sezione si riapre, così il fornitore può caricarne un altro.")) return
              setCancellando(true)
              try {
                await api.delete(`/ehs/registri/${registro.id}/file/${documentoId}/`)
                toast.success('Documento cancellato: il fornitore può caricarne un altro.')
                onDocumentoEliminato()
              } catch (err) {
                toast.error(err.response?.data?.detail || 'Errore durante la cancellazione.')
              } finally {
                setCancellando(false)
              }
            }} style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              🗑 Cancella documento
            </button>
          )}
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            ✕ Chiudi
          </button>
        </div>
      </div>
      {(documenti.length > 1 || puoCancellare) && documenti.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, width: '90vw', maxWidth: 900 }}>
          {documenti.map(d => (
            <button key={d.id} onClick={() => setDocumentoId(d.id)} style={{
              border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
              background: d.id === documentoId ? '#10B981' : '#fff', color: d.id === documentoId ? '#fff' : '#374151',
            }}>
              {d.archiviato_il ? '📦' : d.disponibile === false ? '⚠️' : '📎'} {d.tipo === 'attestati' ? 'Attestati' : 'Presenze'} · {d.nome_originale || `Documento ${d.id}`}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="spinner" />
      ) : url ? (
        <iframe src={url} style={{ width: '90vw', height: '75vh', border: 'none', borderRadius: 8, background: '#fff' }} title="Registro compilato" />
      ) : (
        <div style={{ color: '#fff', background: 'rgba(239,68,68,0.25)', padding: '12px 18px', borderRadius: 8, fontSize: 14 }}>
          ⚠️ {errore || 'Impossibile aprire il documento.'}
        </div>
      )}
    </div>
  )
}

function PartecipantiOverlay({ partecipanti }) {
  const [pos, setPos] = useState(null)
  const presenti = partecipanti.filter(p => p.presente).length
  return (
    <span
      style={{ cursor: 'default', textDecoration: 'underline dotted', whiteSpace: 'nowrap' }}
      onMouseEnter={e => {
        const r = e.currentTarget.getBoundingClientRect()
        setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 260) })
      }}
      onMouseLeave={() => setPos(null)}
      onClick={e => e.stopPropagation()}
    >
      👥 {presenti}/{partecipanti.length}
      {pos && partecipanti.length > 0 && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 3000,
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
              {p.utente_nome}<BadgeLA attivo={p.utente_long_absence} />
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
        <div className="card">
          <div className="table-wrapper">
            <table className="registri-table">
              <thead>
                <tr>
                  <th>Corso</th>
                  <th>Fornitore</th>
                  <th style={{ textAlign: 'center' }}>Presenti</th>
                  <th>Documenti</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {registri.map(r => {
                  const persi = (r.documenti || []).filter(d => d.disponibile === false && !d.archiviato_il).length
                  const archiviati = (r.documenti || []).filter(d => d.archiviato_il).length
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setViewing(r)}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.corso_nome}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {r.negozio_nome} · {r.data_confermata ? new Date(r.data_confermata).toLocaleDateString('it-IT') : '—'}
                        </div>
                      </td>
                      <td>
                        <div>{r.fornitore_nome || '—'}</div>
                        {r.docente_nome && <div style={{ fontSize: 12, color: '#6B7280' }}>Docente: {r.docente_nome}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}><PartecipantiOverlay partecipanti={r.partecipanti || []} /></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                          {[['presenze', 'Presenze', r.presenze_caricate_il], ['attestati', 'Attestati', r.attestati_caricati_il]].map(([tipo, label, completata]) => (
                            <span key={tipo} style={{
                              fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap',
                              background: completata ? '#D1FAE5' : '#FEF3C7', color: completata ? '#065F46' : '#92400E',
                            }}>
                              {completata ? '✓' : '⏳'} {label} ({(r.documenti || []).filter(d => d.tipo === tipo).length})
                            </span>
                          ))}
                          {archiviati > 0 && (
                            <span style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}
                              title="Documenti archiviati: si consultano nell'archivio aziendale">
                              📦 {archiviati} archiviati
                            </span>
                          )}
                          {persi > 0 && (
                            <span style={{ fontSize: 11, color: '#991B1B', whiteSpace: 'nowrap' }}
                              title="File andati persi sul server prima dell'archivio nel database: vanno ricaricati">
                              ⚠️ {persi} da ricaricare
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Consulta i documenti"
                          onClick={e => { e.stopPropagation(); setViewing(r) }}>👁️</button>
                        {canElimina && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Elimina definitivamente"
                            onClick={e => { e.stopPropagation(); setEliminando(r) }}>🗑️</button>
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

      {viewing && (
        <RegistroViewerModal registro={viewing} onClose={() => setViewing(null)}
          onDocumentoEliminato={() => { setViewing(null); fetchRegistri() }} />
      )}

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
