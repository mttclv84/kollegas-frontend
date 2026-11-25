import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

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

// Icona "note" nella colonna Ruoli destinatari: i nomi compaiono solo passando sopra
// con il mouse, così la tabella non si allarga. Il riquadro è position: fixed perché
// le tabelle scorrono dentro il loro contenitore e lo taglierebbero.
function RuoliIcona({ nomi }) {
  const [pos, setPos] = useState(null)
  if (!nomi?.length) return <span style={{ color: '#9CA3AF' }}>—</span>
  const mostra = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 280) })
  }
  return (
    <span onMouseEnter={mostra} onMouseLeave={() => setPos(null)}
      style={{ cursor: 'default', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      🗒️<span style={{ fontSize: 11, color: '#6B7280' }}>{nomi.length}</span>
      {pos && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 3000, maxWidth: 270,
          background: '#1F2937', color: '#fff', borderRadius: 8, padding: '8px 12px',
          fontSize: 12, lineHeight: 1.5, whiteSpace: 'normal', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Ruoli destinatari</div>
          {nomi.map(n => <div key={n}>• {n}</div>)}
        </div>
      )}
    </span>
  )
}

export default function CatalogoAttivita() {
  // Le attività non si eliminano: si disattivano (l'HO su approvazione dell'Admin) e finiscono
  // in Disattivati > Corsi disattivati. Eventi, iscrizioni e statistiche già registrati restano.
  const { can } = useAuth()
  const isAdmin = can(['admin'])
  const puoDisattivare = can(['admin', 'ho'])
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

  // L'Admin disattiva subito; l'HO invia la richiesta, che l'Admin approva da Richieste di Modifica.
  const handleDisattiva = async (a) => {
    const effetto = 'Non sarà più selezionabile per nuovi eventi e passerà in Disattivati > Corsi disattivati. '
      + 'Eventi, iscrizioni e statistiche già registrati restano.'
    const domanda = isAdmin
      ? `Disattivare "${a.nome}"? ${effetto}`
      : `Chiedere all'Admin di disattivare "${a.nome}"? Fino alla sua approvazione l'attività resta attiva. ${effetto}`
    if (!window.confirm(domanda)) return
    try {
      if (isAdmin) {
        await api.delete(`/attivita/${a.id}/`)
        toast.success('Attività disattivata.')
      } else {
        await api.post(`/attivita/${a.id}/richiedi-disattivazione/`)
        toast.success('Richiesta inviata all\'Admin.')
      }
      fetch()
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore.') }
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
    {
      key: 'ruoli', label: 'Ruoli destinatari', sortable: false,
      // accessor per la ricerca, render per la sola icona
      accessor: a => a.ruoli_destinatari_nomi?.join(', ') || '',
      render: a => <RuoliIcona nomi={a.ruoli_destinatari_nomi} />,
    },
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
              {a.disattivazione_in_attesa ? (
                <span title="Disattivazione richiesta, in attesa di approvazione dell'Admin"
                  style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                  ⏳ In approvazione
                </span>
              ) : puoDisattivare && (
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDisattiva(a)}
                  title={isAdmin ? 'Disattiva' : 'Richiedi disattivazione'}>🚫</button>
              )}
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
