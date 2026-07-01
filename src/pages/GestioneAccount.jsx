import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'

const LIVELLI_PER_RUOLO = {
  admin: [
    { value: 'admin', label: 'Admin' },
    { value: 'ho', label: 'HO' },
    { value: 'store', label: 'Store' },
    { value: 'area', label: 'Area Manager' },
    { value: 'base', label: 'Base' },
  ],
  ho: [
    { value: 'area', label: 'Area Manager' },
    { value: 'base', label: 'Base' },
  ],
  store: [
    { value: 'base', label: 'Base' },
  ],
}
const SESSI = [
  { value: 'M', label: 'Maschio' },
  { value: 'F', label: 'Femmina' },
  { value: 'NS', label: 'Non specificato' },
]
const LIVELLO_BADGE = { admin: 'danger', ho: 'primary', area: 'violet', store: 'success', base: 'neutral' }

const EMPTY_FORM = {
  cognome: '', nome: '', email: '', sesso: 'NS', livello_accesso: 'base',
  store: '', codice_matricola: '', ruolo: '',
  long_absence: false, password: '',
}

const STATO_BADGE = { pending: 'warning', approvata: 'success', rifiutata: 'danger' }
const STATO_LABEL = { pending: 'In attesa', approvata: 'Approvata', rifiutata: 'Rifiutata' }

function DocsModal({ targetUser, onClose, canUpload }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewUrl, setViewUrl] = useState(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/users/${targetUser.id}/docs/`)
      setDocs(data)
    } finally { setLoading(false) }
  }, [targetUser.id])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Solo file PDF.'); return }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('nome_file', file.name)
    try {
      await api.post(`/users/${targetUser.id}/docs/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Documento caricato.')
      e.target.value = ''
      fetchDocs()
    } catch { toast.error('Errore nel caricamento.') }
    finally { setUploading(false) }
  }

  const handleDelete = async (docId) => {
    if (!window.confirm('Eliminare questo documento?')) return
    try {
      await api.delete(`/docs/${docId}/`)
      toast.success('Eliminato.')
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch { toast.error('Errore.') }
  }

  const handleView = async (docId) => {
    try {
      const res = await api.get(`/docs/${docId}/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      setViewUrl(url)
    } catch { toast.error('Impossibile aprire il documento.') }
  }

  const closeView = () => {
    if (viewUrl) URL.revokeObjectURL(viewUrl)
    setViewUrl(null)
  }

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      <Modal title={`Docs — ${targetUser.cognome} ${targetUser.nome}`} onClose={onClose} size="lg">
        {canUpload && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: '#FAFAFA', borderRadius: 8, border: '1px dashed #CBD5E1' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Carica documento PDF</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="file" accept="application/pdf" className="form-control" style={{ flex: 1 }}
                onChange={handleUpload} disabled={uploading} />
              {uploading && <span style={{ color: '#6B7280', fontSize: 13, whiteSpace: 'nowrap' }}>Caricamento...</span>}
            </div>
          </div>
        )}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : docs.length === 0 ? (
          <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>Nessun documento caricato.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Documento</th><th>Data caricamento</th><th></th></tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <td>📄 {d.nome_file}</td>
                  <td>{fmtDate(d.created_at)}</td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleView(d.id)} title="Visualizza">👁️</button>
                    {canUpload && (
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(d.id)} title="Elimina">🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
      {viewUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={closeView} style={{ position: 'absolute', top: 16, right: 20, background: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            ✕ Chiudi
          </button>
          <iframe src={viewUrl} style={{ width: '90vw', height: '90vh', border: 'none', borderRadius: 8 }} title="Documento PDF" />
        </div>
      )}
    </>
  )
}

export default function GestioneAccount({ mostraDisattivati = false }) {
  const { user, can } = useAuth()
  const canAdmin = can(['admin', 'ho'])
  const isStore = can(['store'])
  const livelliDisponibili = LIVELLI_PER_RUOLO[user?.livello_accesso] || LIVELLI_PER_RUOLO.store

  const [utenti, setUtenti] = useState([])
  const [stores, setStores] = useState([])
  const [ruoli, setRuoli] = useState([])
  const [richiesteCreazione, setRichiesteCreazione] = useState([])
  const [richiesteEliminazione, setRichiesteEliminazione] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [shownPassword, setShownPassword] = useState(null)
  const [filterStore, setFilterStore] = useState('')
  const [filterRuolo, setFilterRuolo] = useState('')
  const [docsUser, setDocsUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteText, setDeleteText] = useState('')
  const [storeDeleteTarget, setStoreDeleteTarget] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const endpoint = mostraDisattivati ? '/users/disattivati/' : '/users/'
      const reqs = [
        api.get(endpoint),
        api.get('/stores/').catch(() => ({ data: [] })),
        api.get('/ruoli/').catch(() => ({ data: [] })),
        api.get('/richieste-creazione/').catch(() => ({ data: [] })),
        api.get('/richieste-eliminazione/').catch(() => ({ data: [] })),
      ]
      const [uRes, sRes, rRes, rcRes, reRes] = await Promise.all(reqs)
      setUtenti(uRes.data.results || uRes.data)
      setStores(sRes.data.results || sRes.data)
      setRuoli(rRes.data.results || rRes.data)
      setRichiesteCreazione(rcRes.data.results || rcRes.data)
      setRichiesteEliminazione(reRes.data.results || reRes.data)
    } finally {
      setLoading(false)
    }
  }, [mostraDisattivati])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openCreate = async () => {
    const livelli = LIVELLI_PER_RUOLO[user?.livello_accesso] || LIVELLI_PER_RUOLO.store
    const defaults = { ...EMPTY_FORM, livello_accesso: livelli[livelli.length - 1].value }
    if (isStore && user?.store_id) defaults.store = user.store_id
    try {
      const { data } = await api.get('/users/next-matricola/')
      defaults.codice_matricola = data.codice_matricola
      defaults.email = data.email
    } catch { }
    setForm(defaults)
    setModal({ mode: 'create' })
  }

  const openEdit = (u) => {
    setForm({
      cognome: u.cognome, nome: u.nome, email: u.email, sesso: u.sesso,
      livello_accesso: u.livello_accesso, store: u.store || '',
      codice_matricola: u.codice_matricola || '', ruolo: u.ruolo || '',
      long_absence: u.long_absence, password: '',
    })
    setModal({ mode: 'edit', data: u })
  }

  const STORE_EDITABLE = ['store', 'ruolo', 'commento_mapping', 'long_absence']

  const canEditField = (field) => {
    if (canAdmin) return true
    if (isStore) return STORE_EDITABLE.includes(field)
    return false
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.ruolo) { toast.error('Il ruolo è obbligatorio.'); return }

    if (modal.mode === 'edit' && String(form.store) !== String(modal.data.store || '')) {
      const nuovoStore = stores.find(s => String(s.id) === String(form.store))
      const nomeCollega = `${modal.data.cognome} ${modal.data.nome}`
      const nomeStore = nuovoStore ? nuovoStore.nome : '—'
      const ok = window.confirm(`Stai trasferendo il collega ${nomeCollega} presso lo store di ${nomeStore}. CONFERMI?`)
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (!payload.store) payload.store = null
      if (!payload.ruolo) payload.ruolo = null

      if (modal.mode === 'create') {
        if (isStore) {
          await api.post('/richieste-creazione/', {
            cognome: payload.cognome,
            nome: payload.nome,
            email: payload.email,
            sesso: payload.sesso,
            livello_accesso: 'base',
            store: payload.store,
            codice_matricola: payload.codice_matricola,
            ruolo: payload.ruolo,
            commento_mapping: payload.commento_mapping,
          })
          toast.success('Richiesta inviata. In attesa di approvazione da Admin/HO.', { duration: 5000 })
        } else {
          await api.post('/users/', payload)
          toast.success('Utente creato. Password di accesso: Primark01!', { duration: 6000 })
        }
      } else {
        await api.patch(`/users/${modal.data.id}/`, payload)
        toast.success('Utente aggiornato.')
      }
      setModal(null)
      fetchAll()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Errore.')
    } finally {
      setSaving(false)
    }
  }

  const handleDisattiva = (u) => { setDeleteTarget(u); setDeleteText('') }

  const confirmDisattiva = async () => {
    try {
      await api.delete(`/users/${deleteTarget.id}/`)
      toast.success('Utente disattivato.')
      setDeleteTarget(null)
      fetchAll()
    } catch { toast.error('Errore.') }
  }

  const handleStoreDelete = (u) => setStoreDeleteTarget(u)

  const confirmStoreDelete = async () => {
    if (!storeDeleteTarget) return
    try {
      await api.post('/richieste-eliminazione/', { target_user: storeDeleteTarget.id })
      toast.success('Richiesta di eliminazione inviata ad Admin/HO.')
      setStoreDeleteTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  const handleShowPassword = async (u) => {
    try {
      const { data } = await api.get(`/users/${u.id}/`)
      setShownPassword({ nome: `${u.cognome} ${u.nome}`, password: data.raw_password || '—' })
    } catch { toast.error('Impossibile recuperare la password.') }
  }

  const handleChangePassword = (u) => {
    setForm({ ...EMPTY_FORM, password: '' })
    setModal({ mode: 'password', data: u })
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (!form.password) { toast.error('Inserisci la nuova password.'); return }
    setSaving(true)
    try {
      await api.patch(`/users/${modal.data.id}/`, { password: form.password })
      toast.success('Password aggiornata.')
      setModal(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally { setSaving(false) }
  }

  const vistoCreazione = async (id) => {
    await api.patch(`/richieste-creazione/${id}/`, { visto: true })
    setRichiesteCreazione(prev => prev.filter(x => x.id !== id))
  }

  const vistoEliminazione = async (id) => {
    await api.patch(`/richieste-eliminazione/${id}/`, { visto: true })
    setRichiesteEliminazione(prev => prev.filter(x => x.id !== id))
  }

  const handleApprovaCreazione = async (id) => {
    try {
      await api.patch(`/richieste-creazione/${id}/`, { stato: 'approvata' })
      toast.success('Profilo creato e approvato.')
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore.') }
  }

  const handleRifiutaCreazione = async (id) => {
    if (!window.confirm('Rifiutare questa richiesta?')) return
    try {
      await api.patch(`/richieste-creazione/${id}/`, { stato: 'rifiutata' })
      toast.success('Richiesta rifiutata.')
      fetchAll()
    } catch { toast.error('Errore.') }
  }

  const handleApprovaEliminazione = async (id) => {
    try {
      await api.patch(`/richieste-eliminazione/${id}/`, { stato: 'approvata' })
      toast.success('Utente disattivato.')
      fetchAll()
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore.') }
  }

  const handleRifiutaEliminazione = async (id) => {
    if (!window.confirm('Rifiutare questa richiesta di eliminazione?')) return
    try {
      await api.patch(`/richieste-eliminazione/${id}/`, { stato: 'rifiutata' })
      toast.success('Richiesta rifiutata.')
      fetchAll()
    } catch { toast.error('Errore.') }
  }

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const utentiFiltrati = utenti.filter(u => {
    if (filterStore && String(u.store) !== filterStore) return false
    if (filterRuolo && String(u.ruolo) !== filterRuolo) return false
    return true
  })

  const pendingCreazione = richiesteCreazione.filter(r => r.stato === 'pending')
  const pendingEliminazione = richiesteEliminazione.filter(r => r.stato === 'pending')

  const columns = [
    { key: 'id', label: 'IK', sortable: true },
    { key: 'cognome', label: 'Cognome', sortable: true },
    { key: 'nome', label: 'Nome', sortable: true },
    {
      key: 'livello_accesso', label: 'Livello',
      render: u => <span className={`badge badge-${LIVELLO_BADGE[u.livello_accesso] || 'neutral'}`}>{u.livello_accesso.toUpperCase()}</span>
    },
    { key: 'store_nome', label: 'Workplace', accessor: u => u.store_nome || '—' },
    { key: 'ruolo_nome', label: 'Ruolo', accessor: u => u.ruolo_nome || '—' },
    {
      key: 'long_absence', label: 'Long Abs.',
      render: u => u.long_absence ? <span className="badge badge-warning">Long Absence</span> : null
    },
  ]

  const disabledStyle = { background: '#F1F5F9', color: '#9CA3AF' }

  const RichiesteTable = ({ title, items, pendingCount, onApprova, onRifiuta, onVisto, cols, renderCells }) => (
    items.length > 0 ? (
      <div className="card" style={{ marginBottom: 20, border: pendingCount > 0 ? '1px solid #F59E0B' : undefined }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
          {pendingCount > 0 && <span className="badge badge-warning">{pendingCount} in attesa</span>}
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id}>
                  {renderCells(r)}
                  <td>
                    {r.stato === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => onApprova(r.id)}>✓ Approva</button>
                        <button className="btn btn-danger btn-sm" onClick={() => onRifiuta(r.id)}>✕ Rifiuta</button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => onVisto(r.id)}>Visto</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ) : null
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          {mostraDisattivati ? 'Account Disattivati' : 'Gestione Account'}
        </h1>
        {(canAdmin || isStore) && !mostraDisattivati && (
          <button className="btn btn-primary" onClick={openCreate}>
            {isStore ? '+ Richiedi Nuovo Profilo' : '+ Nuovo Utente'}
          </button>
        )}
      </div>

      {/* Richieste creazione profilo — admin/HO */}
      {canAdmin && !mostraDisattivati && (
        <RichiesteTable
          title="Richieste di Creazione Profilo"
          items={richiesteCreazione}
          pendingCount={pendingCreazione.length}
          onApprova={handleApprovaCreazione}
          onRifiuta={handleRifiutaCreazione}
          onVisto={vistoCreazione}
          cols={['Store richiedente', 'Cognome', 'Nome', 'Email', 'Ruolo', 'Stato', 'Data', '']}
          renderCells={r => (<>
            <td><span className="badge badge-neutral">{r.richiedente_store || '—'}</span></td>
            <td>{r.cognome}</td>
            <td>{r.nome}</td>
            <td style={{ fontSize: 12 }}>{r.email}</td>
            <td>{r.ruolo_nome || '—'}</td>
            <td><span className={`badge badge-${STATO_BADGE[r.stato]}`}>{STATO_LABEL[r.stato]}</span></td>
            <td style={{ fontSize: 12, color: '#6B7280' }}>{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
          </>)}
        />
      )}

      {/* Richieste eliminazione profilo — admin/HO */}
      {canAdmin && !mostraDisattivati && (
        <RichiesteTable
          title="Richieste di Eliminazione Profilo"
          items={richiesteEliminazione}
          pendingCount={pendingEliminazione.length}
          onApprova={handleApprovaEliminazione}
          onRifiuta={handleRifiutaEliminazione}
          onVisto={vistoEliminazione}
          cols={['Store richiedente', 'Profilo da eliminare', 'Stato', 'Data', '']}
          renderCells={r => (<>
            <td><span className="badge badge-neutral">{r.richiedente_store || '—'}</span></td>
            <td>{r.snap_nome}</td>
            <td><span className={`badge badge-${STATO_BADGE[r.stato]}`}>{STATO_LABEL[r.stato]}</span></td>
            <td style={{ fontSize: 12, color: '#6B7280' }}>{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
          </>)}
        />
      )}

      {/* Le mie richieste — store */}
      {isStore && !mostraDisattivati && (richiesteCreazione.length > 0 || richiesteEliminazione.length > 0) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">Le mie richieste</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Tipo</th><th>Profilo</th><th>Stato</th><th>Data</th><th></th></tr>
              </thead>
              <tbody>
                {richiesteCreazione.map(r => (
                  <tr key={`c-${r.id}`}>
                    <td><span className="badge badge-primary">Creazione</span></td>
                    <td>{r.cognome} {r.nome}</td>
                    <td><span className={`badge badge-${STATO_BADGE[r.stato]}`}>{STATO_LABEL[r.stato]}</span></td>
                    <td style={{ fontSize: 12, color: '#6B7280' }}>{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
                    <td>{r.stato !== 'pending' && <button className="btn btn-secondary btn-sm" onClick={() => vistoCreazione(r.id)}>Visto</button>}</td>
                  </tr>
                ))}
                {richiesteEliminazione.map(r => (
                  <tr key={`e-${r.id}`}>
                    <td><span className="badge badge-danger">Eliminazione</span></td>
                    <td>{r.snap_nome}</td>
                    <td><span className={`badge badge-${STATO_BADGE[r.stato]}`}>{STATO_LABEL[r.stato]}</span></td>
                    <td style={{ fontSize: 12, color: '#6B7280' }}>{new Date(r.created_at).toLocaleDateString('it-IT')}</td>
                    <td>{r.stato !== 'pending' && <button className="btn btn-secondary btn-sm" onClick={() => vistoEliminazione(r.id)}>Visto</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!mostraDisattivati && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 16px' }}>
            {can(['admin', 'ho', 'area']) && (
              <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
                <label className="form-label">Workplace</label>
                <select className="form-control" value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                  <option value="">Tutti i workplace</option>
                  {stores.map(s => <option key={s.id} value={String(s.id)}>{s.nome}</option>)}
                </select>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label">Ruolo</label>
              <select className="form-control" value={filterRuolo} onChange={e => setFilterRuolo(e.target.value)}>
                <option value="">Tutti i ruoli</option>
                {ruoli.map(r => <option key={r.id} value={String(r.id)}>{r.nome}</option>)}
              </select>
            </div>
            {(filterStore || filterRuolo) && (
              <button className="btn btn-secondary" onClick={() => { setFilterStore(''); setFilterRuolo('') }}>Reset</button>
            )}
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={utentiFiltrati}
            actions={u => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {!(isStore && u.livello_accesso === 'store') && (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(u)} title="Modifica">✏️</button>
                )}
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDocsUser(u)} title="Docs" style={{ color: '#D97706' }}>📁</button>

                {(can(['admin', 'ho']) || (isStore && !mostraDisattivati)) && (
                  <>
                    <div style={{ width: 10 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#F1F5F9', borderRadius: 6, padding: '2px 4px' }}>
                      {can(['admin', 'ho']) && (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleShowPassword(u)} title="Visualizza password">👁️</button>
                      )}
                      {can(['admin']) && (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleChangePassword(u)} title="Cambia password">🔑</button>
                      )}
                      {canAdmin && !mostraDisattivati && (
                        <button className="btn btn-dark btn-sm btn-icon" onClick={() => handleDisattiva(u)} title="Disattiva">🗑️</button>
                      )}
                      {isStore && !mostraDisattivati && u.livello_accesso !== 'store' && (
                        <button className="btn btn-dark btn-sm btn-icon" onClick={() => handleStoreDelete(u)} title="Richiedi eliminazione">🗑️</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Modal creazione / modifica */}
      {modal && modal.mode !== 'password' && (
        <Modal
          title={modal.mode === 'create' ? (isStore ? 'Richiedi Creazione Profilo' : 'Nuovo Utente') : `Modifica — ${modal.data?.cognome} ${modal.data?.nome}`}
          onClose={() => setModal(null)}
          size="lg"
        >
          {isStore && modal.mode === 'create' && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1D4ED8' }}>
              La richiesta sarà visibile ad Admin/HO per approvazione. Il profilo verrà creato solo dopo l'approvazione.
            </div>
          )}
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label className="form-label">Cognome *</label>
                <input className="form-control" value={form.cognome} onChange={e => setF('cognome', e.target.value)} required
                  disabled={modal.mode === 'edit' && !canEditField('cognome')}
                  style={modal.mode === 'edit' && !canEditField('cognome') ? disabledStyle : {}} />
              </div>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="form-control" value={form.nome} onChange={e => setF('nome', e.target.value)} required
                  disabled={modal.mode === 'edit' && !canEditField('nome')}
                  style={modal.mode === 'edit' && !canEditField('nome') ? disabledStyle : {}} />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control" value={form.email} onChange={e => setF('email', e.target.value)} required
                  disabled={!can(['admin'])} style={!can(['admin']) ? disabledStyle : {}} />
              </div>
              <div className="form-group">
                <label className="form-label">Sesso</label>
                <select className="form-control" value={form.sesso} onChange={e => setF('sesso', e.target.value)}
                  disabled={modal.mode === 'edit' && !canEditField('sesso')}
                  style={modal.mode === 'edit' && !canEditField('sesso') ? disabledStyle : {}}>
                  {SESSI.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {!(isStore && modal.mode === 'create') && (
                <div className="form-group">
                  <label className="form-label">Livello accesso</label>
                  <select className="form-control" value={form.livello_accesso} onChange={e => setF('livello_accesso', e.target.value)}
                    disabled={modal.mode === 'edit' && !canAdmin}
                    style={modal.mode === 'edit' && !canAdmin ? disabledStyle : {}}>
                    {livelliDisponibili.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Workplace *</label>
                <select className="form-control" value={form.store} onChange={e => setF('store', e.target.value)}
                  required
                  disabled={isStore && modal.mode === 'create'}
                  style={isStore && modal.mode === 'create' ? disabledStyle : {}}>
                  <option value="">— Seleziona workplace —</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Codice matricola Kollegas</label>
                <input className="form-control" value={form.codice_matricola}
                  onChange={e => setF('codice_matricola', e.target.value)}
                  disabled style={disabledStyle} />
              </div>

              <div className="form-group">
                <label className="form-label">Ruolo *</label>
                <select className="form-control" value={form.ruolo} onChange={e => setF('ruolo', e.target.value)} required>
                  <option value="">— Seleziona ruolo —</option>
                  {ruoli.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.long_absence} onChange={e => setF('long_absence', e.target.checked)} />
                  <span className="form-label" style={{ margin: 0 }}>Long Absence</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvataggio...' : isStore && modal.mode === 'create' ? 'Invia Richiesta' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {shownPassword && (
        <Modal title="Password attuale" onClose={() => setShownPassword(null)} size="sm">
          <p style={{ marginBottom: 8 }}><strong>{shownPassword.nome}</strong></p>
          <p style={{ fontFamily: 'monospace', background: '#F1F5F9', padding: 12, borderRadius: 6, fontSize: 16, letterSpacing: 1 }}>
            {shownPassword.password}
          </p>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setShownPassword(null)}>Chiudi</button>
        </Modal>
      )}

      {modal?.mode === 'password' && (
        <Modal title={`Cambia password — ${modal.data?.cognome} ${modal.data?.nome}`} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSavePassword}>
            <div className="form-group">
              <label className="form-label">Nuova password *</label>
              <input type="password" className="form-control" value={form.password}
                onChange={e => setF('password', e.target.value)} autoFocus required />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Conferma disattivazione (admin/HO) */}
      {deleteTarget && (
        <Modal title="Conferma disattivazione" onClose={() => setDeleteTarget(null)} size="sm">
          <p style={{ marginBottom: 6 }}>Stai per disattivare <strong>{deleteTarget.cognome} {deleteTarget.nome}</strong>.</p>
          <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
            Scrivi <strong style={{ color: '#DC2626' }}>ELIMINA</strong> per confermare.
          </p>
          <input className="form-control" placeholder="ELIMINA" value={deleteText}
            onChange={e => setDeleteText(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && deleteText === 'ELIMINA' && confirmDisattiva()} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Annulla</button>
            <button className="btn btn-danger" onClick={confirmDisattiva} disabled={deleteText !== 'ELIMINA'}>Elimina</button>
          </div>
        </Modal>
      )}

      {/* Conferma richiesta eliminazione (store) */}
      {storeDeleteTarget && (
        <Modal title="Richiedi eliminazione profilo" onClose={() => setStoreDeleteTarget(null)} size="sm">
          <p style={{ marginBottom: 16 }}>
            Vuoi richiedere l'eliminazione del profilo di{' '}
            <strong>{storeDeleteTarget.cognome} {storeDeleteTarget.nome}</strong>?
          </p>
          <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
            La richiesta sarà inviata ad Admin/HO per approvazione. L'account verrà disattivato solo dopo la conferma.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setStoreDeleteTarget(null)}>Annulla</button>
            <button className="btn btn-danger" onClick={confirmStoreDelete}>Invia Richiesta</button>
          </div>
        </Modal>
      )}

      {docsUser && (
        <DocsModal targetUser={docsUser} onClose={() => setDocsUser(null)} canUpload={user?.livello_accesso === 'store'} />
      )}
    </div>
  )
}
