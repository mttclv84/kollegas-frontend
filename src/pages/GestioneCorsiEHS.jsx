import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import './EHS.css'

const EMPTY_FORM = {
  codice: '', nome: '', durata_ore: '', scadenza_giorni: '', descrizione: '',
}

export default function GestioneCorsiEHS() {
  const [corsi, setCorsi] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchCorsi = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ehs/corsi/')
      setCorsi(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCorsi() }, [fetchCorsi])

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: 'create' }) }
  const openEdit = (c) => {
    setForm({
      codice: c.codice, nome: c.nome, durata_ore: c.durata_ore,
      scadenza_giorni: c.scadenza_giorni ?? '', descrizione: c.descrizione || '',
    })
    setModal({ mode: 'edit', data: c })
  }

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        codice: form.codice, nome: form.nome, durata_ore: form.durata_ore,
        scadenza_giorni: form.scadenza_giorni || null, descrizione: form.descrizione,
      }
      if (modal.mode === 'create') {
        await api.post('/ehs/corsi/', payload)
        toast.success('Corso creato.')
      } else {
        await api.patch(`/ehs/corsi/${modal.data.id}/`, payload)
        toast.success('Corso aggiornato.')
      }
      setModal(null)
      fetchCorsi()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/ehs/corsi/${deleteTarget.id}/`)
      toast.success('Corso disattivato.')
      setDeleteTarget(null)
      fetchCorsi()
    } catch {
      toast.error('Errore.')
    }
  }

  const riattiva = async (c) => {
    try {
      await api.patch(`/ehs/corsi/${c.id}/`, { attivo: true })
      toast.success('Corso riattivato.')
      fetchCorsi()
    } catch {
      toast.error('Errore.')
    }
  }

  const columns = [
    { key: 'codice', label: 'Codice', sortable: true },
    { key: 'nome', label: 'Nome corso', sortable: true },
    { key: 'durata_ore', label: 'Durata (ore)', accessor: c => c.durata_ore },
    { key: 'scadenza_giorni', label: 'Scadenza (giorni)', accessor: c => c.scadenza_giorni ?? '— nessuna —' },
    {
      key: 'attivo', label: 'Stato',
      render: c => <span className={`badge badge-${c.attivo ? 'success' : 'neutral'}`}>{c.attivo ? 'Attivo' : 'Disattivato'}</span>,
    },
  ]

  return (
    <div className="ehs-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Corsi EHS</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuovo Corso</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <DataTable
            columns={columns}
            data={corsi}
            actions={c => (
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)} title="Modifica">✏️</button>
                {c.attivo ? (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteTarget(c)} title="Disattiva">🗑️</button>
                ) : (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => riattiva(c)} title="Riattiva">♻️</button>
                )}
              </div>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Nuovo Corso EHS' : `Modifica — ${modal.data?.nome}`}
          onClose={() => setModal(null)}
          size="md"
        >
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Codice *</label>
              <input className="form-control" placeholder="Es. SCALE" value={form.codice}
                onChange={e => setF('codice', e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nome corso *</label>
              <input className="form-control" value={form.nome}
                onChange={e => setF('nome', e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label className="form-label">Durata (ore) *</label>
                <input type="number" min="0" step="0.5" className="form-control" value={form.durata_ore}
                  onChange={e => setF('durata_ore', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Scadenza (giorni)</label>
                <input type="number" min="0" className="form-control" placeholder="Vuoto = nessuna scadenza"
                  value={form.scadenza_giorni} onChange={e => setF('scadenza_giorni', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrizione</label>
              <textarea className="form-control" rows="2" value={form.descrizione}
                onChange={e => setF('descrizione', e.target.value)} />
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
            Disattivare il corso <strong>{deleteTarget.nome}</strong>?
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
