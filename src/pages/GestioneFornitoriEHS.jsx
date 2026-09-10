import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import './EHS.css'

const EMPTY_FORM = {
  fornitore_ragione_sociale: '', nome: '', email: '', telefono: '', indirizzo: '',
}

export default function GestioneFornitoriEHS() {
  const [fornitori, setFornitori] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchFornitori = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ehs/fornitori/')
      setFornitori(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFornitori() }, [fetchFornitori])

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: 'create' }) }

  const openEdit = (f) => {
    setForm({
      fornitore_ragione_sociale: f.fornitore_ragione_sociale, nome: f.nome,
      email: f.email, telefono: f.telefono || '', indirizzo: f.indirizzo || '',
    })
    setModal({ mode: 'edit', data: f })
  }

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal.mode === 'create') {
        const { data } = await api.post('/ehs/fornitori/', form)
        toast.success(`Fornitore creato. Password iniziale: ${data.password_iniziale}`, { duration: 8000 })
      } else {
        await api.patch(`/ehs/fornitori/${modal.data.id}/`, form)
        toast.success('Fornitore aggiornato.')
      }
      setModal(null)
      fetchFornitori()
    } catch (err) {
      const msg = err.response?.data?.detail
      toast.error(msg || 'Errore.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ehs/fornitori/${deleteTarget.id}/`)
      toast.success('Fornitore disattivato.')
      setDeleteTarget(null)
      fetchFornitori()
    } catch {
      toast.error('Errore.')
    }
  }

  const columns = [
    { key: 'fornitore_ragione_sociale', label: 'Nome Azienda', sortable: true },
    { key: 'nome_completo', label: 'Nome di riferimento', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'telefono', label: 'Telefono', accessor: f => f.telefono || '—' },
    { key: 'indirizzo', label: 'Indirizzo', accessor: f => f.indirizzo || '—' },
    {
      key: 'is_active', label: 'Stato',
      render: f => <span className={`badge badge-${f.is_active ? 'success' : 'neutral'}`}>{f.is_active ? 'Attivo' : 'Disattivato'}</span>,
    },
  ]

  return (
    <div className="ehs-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Fornitori EHS</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuovo Fornitore</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={fornitori}
            actions={f => (
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(f)} title="Modifica">✏️</button>
                {f.is_active && (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteTarget(f)} title="Disattiva">🗑️</button>
                )}
              </div>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Nuovo Fornitore EHS' : `Modifica — ${modal.data?.fornitore_ragione_sociale}`}
          onClose={() => setModal(null)}
          size="md"
        >
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nome Azienda *</label>
              <input className="form-control" value={form.fornitore_ragione_sociale}
                onChange={e => setF('fornitore_ragione_sociale', e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nome di riferimento *</label>
              <input className="form-control" placeholder="Es. Mario Rossi" value={form.nome}
                onChange={e => setF('nome', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-control" value={form.email}
                onChange={e => setF('email', e.target.value)} required disabled={modal.mode === 'edit'}
                style={modal.mode === 'edit' ? { background: '#F1F5F9', color: '#9CA3AF' } : {}} />
            </div>
            <div className="form-group">
              <label className="form-label">Livello di accesso</label>
              <input className="form-control" value="Fornitore EHS" disabled style={{ background: '#F1F5F9', color: '#9CA3AF' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Indirizzo</label>
              <input className="form-control" placeholder="Es. Via della Palla 2, Milano, MI" value={form.indirizzo}
                onChange={e => setF('indirizzo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Numero di telefono</label>
              <input className="form-control" value={form.telefono}
                onChange={e => setF('telefono', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Conferma disattivazione" onClose={() => setDeleteTarget(null)} size="sm">
          <p style={{ marginBottom: 16 }}>
            Disattivare il fornitore <strong>{deleteTarget.fornitore_ragione_sociale}</strong>?
            Non sarà più selezionabile per nuove richieste.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Annulla</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Disattiva</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
