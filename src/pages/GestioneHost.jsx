import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'

const POSIZIONI = ['interno', 'esterno', 'consulente']
const EMPTY = { descrizione: '', posizione: 'interno', nota: '' }

export default function GestioneHost() {
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await api.get('/host/')
    setHosts(data.results || data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => { setForm(EMPTY); setModal({ mode: 'create' }) }
  const openEdit = (h) => { setForm({ descrizione: h.descrizione, posizione: h.posizione, nota: h.nota || '' }); setModal({ mode: 'edit', data: h }) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (modal.mode === 'create') { await api.post('/host/', form); toast.success('Host creato.') }
      else { await api.patch(`/host/${modal.data.id}/`, form); toast.success('Host aggiornato.') }
      setModal(null); fetch()
    } catch { toast.error('Errore.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (h) => {
    if (!window.confirm(`Eliminare "${h.descrizione}"?`)) return
    try { await api.delete(`/host/${h.id}/`); toast.success('Eliminato.'); fetch() }
    catch { toast.error('Errore.') }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'descrizione', label: 'Nome / Descrizione', sortable: true },
    {
      key: 'posizione', label: 'Posizione',
      render: h => <span className={`badge badge-${h.posizione === 'interno' ? 'success' : h.posizione === 'esterno' ? 'primary' : 'neutral'}`}>{h.posizione}</span>
    },
    { key: 'nota', label: 'Nota', accessor: h => h.nota || '—' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Host</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuovo Host</button>
      </div>
      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <DataTable columns={columns} data={hosts} actions={h => (
            <>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(h)} title="Modifica">✏️</button>
              <button className="btn btn-dark btn-sm btn-icon" onClick={() => handleDelete(h)} title="Elimina">🗑️</button>
            </>
          )} />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Nuovo Host' : `Modifica — ${modal.data?.descrizione}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Cognome e Nome *</label>
              <input className="form-control" value={form.descrizione} onChange={e => setF('descrizione', e.target.value)} required placeholder="Es. Rossi Mario" />
            </div>
            <div className="form-group">
              <label className="form-label">Posizione</label>
              <select className="form-control" value={form.posizione} onChange={e => setF('posizione', e.target.value)}>
                {POSIZIONI.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nota</label>
              <textarea className="form-control" rows={3} value={form.nota} onChange={e => setF('nota', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
