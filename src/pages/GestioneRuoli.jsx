import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'

export default function GestioneRuoli() {
  const [ruoli, setRuoli] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await api.get('/ruoli/')
    setRuoli(data.results || data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => { setNome(''); setModal({ mode: 'create' }) }
  const openEdit = (r) => { setNome(r.nome); setModal({ mode: 'edit', data: r }) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (modal.mode === 'create') { await api.post('/ruoli/', { nome }); toast.success('Ruolo creato.') }
      else { await api.patch(`/ruoli/${modal.data.id}/`, { nome }); toast.success('Ruolo aggiornato.') }
      setModal(null); fetch()
    } catch { toast.error('Errore.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (r) => {
    if (!window.confirm(`Eliminare il ruolo "${r.nome}"?`)) return
    try { await api.delete(`/ruoli/${r.id}/`); toast.success('Eliminato.'); fetch() }
    catch { toast.error('Impossibile eliminare — potrebbe essere in uso.') }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Ruoli</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuovo Ruolo</button>
      </div>
      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <DataTable
            columns={[{ key: 'nome', label: 'Nome Ruolo', sortable: true }]}
            data={ruoli}
            actions={r => (
              <>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(r)} title="Modifica">✏️</button>
                <button className="btn btn-dark btn-sm btn-icon" onClick={() => handleDelete(r)} title="Elimina">🗑️</button>
              </>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Nuovo Ruolo' : `Modifica — ${modal.data?.nome}`} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nome Ruolo *</label>
              <input className="form-control" value={nome} onChange={e => setNome(e.target.value)} required autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '...' : 'Salva'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
