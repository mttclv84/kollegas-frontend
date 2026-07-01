import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'

const TIPOLOGIE = [
  { value: 'ld',         label: 'L&D' },
  { value: 'recruiting', label: 'RECRUITING' },
  { value: 'ehs',        label: 'EHS' },
  { value: 'payroll',    label: 'PAYROLL' },
  { value: 'altro',      label: 'ALTRO' },
]
const TIPOLOGIA_LABEL = Object.fromEntries(TIPOLOGIE.map(t => [t.value, t.label]))
const TIPOLOGIA_BADGE = { ld: 'primary', recruiting: 'violet', ehs: 'success', payroll: 'warning', altro: 'neutral' }

const EMPTY = { nome: '', tipologia: 'ld', dettaglio: '', ruoli_destinatari: [] }

export default function CatalogoAttivita() {
  const [attivita, setAttivita] = useState([])
  const [ruoli, setRuoli] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const [aRes, rRes] = await Promise.all([api.get('/attivita/'), api.get('/ruoli/')])
    setAttivita(aRes.data.results || aRes.data)
    setRuoli(rRes.data.results || rRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const openCreate = () => { setForm(EMPTY); setModal({ mode: 'create' }) }
  const openEdit = (a) => {
    setForm({ nome: a.nome, tipologia: a.tipologia, dettaglio: a.dettaglio || '', ruoli_destinatari: a.ruoli_destinatari || [] })
    setModal({ mode: 'edit', data: a })
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (modal.mode === 'create') { await api.post('/attivita/', form); toast.success('Attività creata.') }
      else { await api.patch(`/attivita/${modal.data.id}/`, form); toast.success('Attività aggiornata.') }
      setModal(null); fetch()
    } catch { toast.error('Errore.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (a) => {
    if (!window.confirm(`Eliminare "${a.nome}"?`)) return
    try { await api.delete(`/attivita/${a.id}/`); toast.success('Eliminata.'); fetch() }
    catch { toast.error('Errore.') }
  }

  const toggleRuolo = (id) => {
    setForm(f => ({
      ...f,
      ruoli_destinatari: f.ruoli_destinatari.includes(id)
        ? f.ruoli_destinatari.filter(r => r !== id)
        : [...f.ruoli_destinatari, id]
    }))
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const columns = [
    { key: 'nome', label: 'Nome Attività', sortable: true },
    {
      key: 'tipologia', label: 'Tipologia',
      render: a => <span className={`badge badge-${TIPOLOGIA_BADGE[a.tipologia] || 'neutral'}`}>{TIPOLOGIA_LABEL[a.tipologia] || a.tipologia}</span>
    },
    { key: 'dettaglio', label: 'Dettaglio', accessor: a => a.dettaglio || '—' },
    { key: 'ruoli', label: 'Ruoli destinatari', accessor: a => a.ruoli_destinatari_nomi?.join(', ') || '—' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Catalogo Attività</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuova Attività</button>
      </div>
      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <DataTable columns={columns} data={attivita} actions={a => (
            <>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(a)} title="Modifica">✏️</button>
              <button className="btn btn-dark btn-sm btn-icon" onClick={() => handleDelete(a)} title="Elimina">🗑️</button>
            </>
          )} />
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Nuova Attività' : `Modifica — ${modal.data?.nome}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-control" value={form.nome} onChange={e => setF('nome', e.target.value)} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label className="form-label">Tipologia</label>
                <select className="form-control" value={form.tipologia} onChange={e => setF('tipologia', e.target.value)}>
                  {TIPOLOGIE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dettaglio</label>
                <input className="form-control" value={form.dettaglio} onChange={e => setF('dettaglio', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ruoli destinatari</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {ruoli.map(r => (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 'var(--font-size-sm)', background: form.ruoli_destinatari.includes(r.id) ? '#E0F7FC' : '#F3F4F6', border: `1px solid ${form.ruoli_destinatari.includes(r.id) ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 6, padding: '4px 10px', transition: 'all 0.1s' }}>
                    <input type="checkbox" checked={form.ruoli_destinatari.includes(r.id)} onChange={() => toggleRuolo(r.id)} style={{ margin: 0 }} />
                    {r.nome}
                  </label>
                ))}
              </div>
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
