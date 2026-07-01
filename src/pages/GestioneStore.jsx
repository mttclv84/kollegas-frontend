import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'

const EMPTY_STORE = { codice_store: '', nome: '', comune: '', provincia: '', indirizzo: '', email_store: '' }

function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function PswCell({ password }) {
  const [visible, setVisible] = useState(false)
  if (!password) return <span style={{ color: '#9CA3AF' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace' }}>
      {visible ? password : '••••••••'}
      <button
        onClick={() => setVisible(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#6B7280', fontSize: 15, lineHeight: 1 }}
        title={visible ? 'Nascondi' : 'Mostra password'}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </span>
  )
}

export default function GestioneStore() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_STORE)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/stores/')
      setStores(data.results || data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => { setForm(EMPTY_STORE); setModal({ mode: 'create' }) }
  const openEdit = (s) => {
    setForm({ codice_store: s.codice_store || '', nome: s.nome, comune: s.comune, provincia: s.provincia, indirizzo: s.indirizzo || '', email_store: s.email_store })
    setModal({ mode: 'edit', data: s })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal.mode === 'create') {
        const payload = { ...form, portale_password: generatePassword() }
        await api.post('/stores/', payload)
        toast.success('Store creato.')
      } else {
        await api.patch(`/stores/${modal.data.id}/`, form)
        toast.success('Store aggiornato.')
      }
      setModal(null); fetch()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally { setSaving(false) }
  }

  const handleDisattiva = async (s) => {
    if (!window.confirm(`Disattivare lo store "${s.nome}"?`)) return
    try { await api.delete(`/stores/${s.id}/`); toast.success('Store disattivato.'); fetch() }
    catch { toast.error('Errore.') }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'codice_store', label: 'Codice Store', sortable: true, accessor: s => s.codice_store || '—' },
    { key: 'nome', label: 'Nome Store', sortable: true },
    { key: 'comune', label: 'Comune', sortable: true },
    { key: 'provincia', label: 'Prov.' },
    { key: 'email_store', label: 'Email Store' },
    {
      key: 'portale_password', label: 'PSW', sortable: false,
      render: s => <PswCell password={s.portale_password} />
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Store</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuovo Store</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <DataTable
            columns={columns}
            data={stores}
            actions={s => (
              <>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(s)} title="Modifica">✏️</button>
                <button className="btn btn-dark btn-sm btn-icon" onClick={() => handleDisattiva(s)} title="Disattiva">🗑️</button>
              </>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Nuovo Store' : `Modifica — ${modal.data?.nome}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label className="form-label">Codice Store</label>
                <input className="form-control" value={form.codice_store} onChange={e => setF('codice_store', e.target.value)} placeholder="Es. 271" />
              </div>
              <div className="form-group">
                <label className="form-label">Nome Store *</label>
                <input className="form-control" value={form.nome} onChange={e => setF('nome', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Comune *</label>
                <input className="form-control" value={form.comune} onChange={e => setF('comune', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Provincia *</label>
                <input className="form-control" maxLength={5} value={form.provincia} onChange={e => setF('provincia', e.target.value)} required placeholder="Es. MI" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Indirizzo</label>
                <input className="form-control" value={form.indirizzo} onChange={e => setF('indirizzo', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Email Store *</label>
                <input type="email" className="form-control" value={form.email_store} onChange={e => setF('email_store', e.target.value)} required placeholder="store000@primark.it" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              {modal.mode === 'edit' && (
                <button type="button" className="btn btn-secondary" onClick={async () => {
                  const pwd = generatePassword()
                  try {
                    await api.patch(`/stores/${modal.data.id}/`, { portale_password: pwd })
                    toast.success('Password rigenerata.')
                    fetch()
                  } catch { toast.error('Errore.') }
                }}>🔑 Rigenera Password</button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
