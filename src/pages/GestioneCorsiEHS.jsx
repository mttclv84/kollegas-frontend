import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import './EHS.css'

const EMPTY_FORM = {
  nome: '', durata_ore: '', scadenza_giorni: '', ore_aggiornamento: '', descrizione: '', offerte: [],
}
const NUOVA_OFFERTA = { fornitore: '', tutti_negozi: true, negozi: [] }

// Elenco negozi con ricerca, per limitare un abbinamento corso-fornitore a una parte dei negozi.
function NegoziPicker({ stores, selezionati, onChange }) {
  const [cerca, setCerca] = useState('')
  const visibili = stores.filter(s => !cerca || s.nome.toLowerCase().includes(cerca.toLowerCase()))
  const toggle = (id) => onChange(selezionati.includes(id) ? selezionati.filter(x => x !== id) : [...selezionati, id])
  return (
    <div style={{ marginTop: 6 }}>
      <input className="form-control" placeholder="Cerca negozio..." value={cerca}
        onChange={e => setCerca(e.target.value)} style={{ marginBottom: 6 }} />
      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 8px' }}>
        {visibili.map(s => (
          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '2px 0' }}>
            <input type="checkbox" checked={selezionati.includes(s.id)} onChange={() => toggle(s.id)} />
            {s.nome}{s.codice_store ? ` (${s.codice_store})` : ''}
          </label>
        ))}
        {visibili.length === 0 && <div style={{ fontSize: 12, color: '#9CA3AF', padding: 4 }}>Nessun negozio.</div>}
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{selezionati.length} negozi selezionati</div>
    </div>
  )
}

function SharepointConfig() {
  const { can } = useAuth()
  const puoModificare = can(['admin', 'admin_ehs'])
  const [url, setUrl] = useState('')
  const [salvato, setSalvato] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/ehs/configurazione/').then(({ data }) => {
      setUrl(data.sharepoint_attestati_url || '')
      setSalvato(data.sharepoint_attestati_url || '')
    }).catch(() => {})
  }, [])

  const salva = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch('/ehs/configurazione/', { sharepoint_attestati_url: url.trim() })
      setSalvato(data.sharepoint_attestati_url)
      toast.success('Link SharePoint salvato.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-body" style={{ padding: '12px 16px' }}>
        <label className="form-label">Cartella SharePoint per gli attestati</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-control" placeholder="https://azienda.sharepoint.com/..." value={url}
            onChange={e => setUrl(e.target.value)} disabled={!puoModificare} />
          {puoModificare && (
            <button className="btn btn-primary" disabled={saving || url.trim() === salvato} onClick={salva}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
          I fornitori aprono questo link dalla sessione completata per caricare gli attestati.
        </div>
      </div>
    </div>
  )
}

export default function GestioneCorsiEHS() {
  const [corsi, setCorsi] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [stores, setStores] = useState([])
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
  useEffect(() => {
    api.get('/ehs/fornitori/').then(({ data }) => setFornitori(data.filter(f => f.is_active))).catch(() => {})
    api.get('/stores/').then(({ data }) => setStores(data.results || data)).catch(() => {})
  }, [])

  const openCreate = () => { setForm({ ...EMPTY_FORM, offerte: [{ ...NUOVA_OFFERTA }] }); setModal({ mode: 'create' }) }
  const openEdit = (c) => {
    setForm({
      nome: c.nome, durata_ore: c.durata_ore,
      scadenza_giorni: c.scadenza_giorni ?? '', ore_aggiornamento: c.ore_aggiornamento ?? '',
      descrizione: c.descrizione || '',
      offerte: c.offerte.length
        ? c.offerte.map(o => ({ fornitore: o.fornitore, tutti_negozi: o.tutti_negozi, negozi: o.negozi }))
        : [{ ...NUOVA_OFFERTA }],
    })
    setModal({ mode: 'edit', data: c })
  }

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setOfferta = (i, key, val) => setForm(f => ({
    ...f, offerte: f.offerte.map((o, j) => j === i ? { ...o, [key]: val } : o),
  }))
  const aggiungiOfferta = () => setForm(f => ({ ...f, offerte: [...f.offerte, { ...NUOVA_OFFERTA }] }))
  const rimuoviOfferta = (i) => setForm(f => ({ ...f, offerte: f.offerte.filter((_, j) => j !== i) }))

  const handleSave = async (e) => {
    e.preventDefault()
    const offerte = form.offerte.filter(o => o.fornitore)
    const senzaNegozi = offerte.find(o => !o.tutti_negozi && o.negozi.length === 0)
    if (senzaNegozi) { toast.error('Seleziona almeno un negozio per ogni fornitore non abilitato a tutti i negozi.'); return }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome, durata_ore: form.durata_ore,
        scadenza_giorni: form.scadenza_giorni || null, ore_aggiornamento: form.ore_aggiornamento || null,
        descrizione: form.descrizione,
        offerte: offerte.map(o => ({
          fornitore: Number(o.fornitore), tutti_negozi: o.tutti_negozi, negozi: o.tutti_negozi ? [] : o.negozi,
        })),
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
      const data = err.response?.data
      toast.error(data?.detail || (data?.offerte && [].concat(data.offerte).join(' ')) || 'Errore.')
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

  const descriviOfferte = (c) => c.offerte.length === 0 ? '— nessuno —' : c.offerte.map(o =>
    `${o.fornitore_nome}${o.secondario ? ' [secondario]' : ''} (${o.tutti_negozi ? 'tutti i negozi' : `${o.negozi.length} negozi`})`
  ).join(', ')

  const columns = [
    { key: 'codice', label: 'Codice', sortable: true },
    { key: 'nome', label: 'Nome corso', sortable: true },
    { key: 'fornitori', label: 'Fornitori', accessor: descriviOfferte },
    { key: 'durata_ore', label: 'Durata (ore)', accessor: c => c.durata_ore },
    { key: 'scadenza_giorni', label: 'Scadenza (giorni)', accessor: c => c.scadenza_giorni ?? '— nessuna —' },
    {
      key: 'attivo', label: 'Stato',
      render: c => <span className={`badge badge-${c.attivo ? 'success' : 'neutral'}`}>{c.attivo ? 'Attivo' : 'Disattivato'}</span>,
    },
  ]

  const fornitoriUsati = form.offerte.map(o => String(o.fornitore)).filter(Boolean)

  return (
    <div className="ehs-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Gestione Corsi EHS</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuovo Corso</button>
      </div>

      <SharepointConfig />

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
          size="lg"
        >
          <form onSubmit={handleSave}>
            {modal.mode === 'edit' && (
              <div className="form-group">
                <label className="form-label">Codice</label>
                <input className="form-control" value={modal.data?.codice} disabled
                  style={{ background: '#F1F5F9', color: '#9CA3AF' }} />
              </div>
            )}
            {modal.mode === 'create' && (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: -8, marginBottom: 12 }}>
                Il codice (EHS + 4 cifre) viene generato automaticamente al salvataggio.
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Nome corso *</label>
              <input className="form-control" value={form.nome}
                onChange={e => setF('nome', e.target.value)} required autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label">Fornitori che erogano il corso</label>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                Ogni fornitore può servire tutti i negozi o solo alcuni. Gli store vedranno solo i fornitori
                abilitati per il proprio negozio; gli altri sono richiedibili con una richiesta eccezionale.
                Senza fornitori il corso non compare in "Nuova richiesta" (es. moduli e-learning da registrare a mano).
              </div>
              {form.offerte.map((o, i) => (
                <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: i === 0 ? '#065F46' : '#92400E' }}>
                    {i === 0 ? 'Fornitore principale' : 'Fornitore secondario — se scelto dallo store va validato dall\'EHS Admin'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="form-control" value={o.fornitore}
                      onChange={e => setOfferta(i, 'fornitore', e.target.value)}>
                      <option value="">Seleziona fornitore...</option>
                      {fornitori
                        .filter(f => String(f.id) === String(o.fornitore) || !fornitoriUsati.includes(String(f.id)))
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.fornitore_ragione_sociale} — {f.nome_completo}</option>
                        ))}
                    </select>
                    {form.offerte.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" title="Rimuovi fornitore"
                        onClick={() => rimuoviOfferta(i)}>🗑️</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="radio" checked={o.tutti_negozi} onChange={() => setOfferta(i, 'tutti_negozi', true)} />
                      Tutti i negozi
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="radio" checked={!o.tutti_negozi} onChange={() => setOfferta(i, 'tutti_negozi', false)} />
                      Solo alcuni negozi
                    </label>
                  </div>
                  {!o.tutti_negozi && (
                    <NegoziPicker stores={stores} selezionati={o.negozi} onChange={v => setOfferta(i, 'negozi', v)} />
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={aggiungiOfferta}
                disabled={fornitoriUsati.length >= fornitori.length}>
                + Aggiungi fornitore
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div className="form-group">
                <label className="form-label">Durata (ore) *</label>
                <input type="number" min="0" step="0.25" className="form-control" value={form.durata_ore}
                  onChange={e => setF('durata_ore', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Scadenza (giorni)</label>
                <input type="number" min="0" className="form-control" placeholder="Vuoto = nessuna scadenza"
                  value={form.scadenza_giorni} onChange={e => setF('scadenza_giorni', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ore corso di aggiornamento</label>
                <input type="number" min="0" step="0.25" className="form-control" placeholder="Vuoto = nessun aggiornamento"
                  value={form.ore_aggiornamento} onChange={e => setF('ore_aggiornamento', e.target.value)} />
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
