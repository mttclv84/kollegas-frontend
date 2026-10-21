import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/ui/Modal'
import EHSCompletamentoObblighi from '../components/ehs/EHSCompletamentoObblighi'
import './EHS.css'
import '../components/calendario/EventoModal.css'

// Stati di una cella della matrice, nell'ordine in cui si alternano al clic.
const STATI = [null, 'obbligatorio', 'facoltativo']
const STILE_CELLA = {
  obbligatorio: { background: '#DC2626', color: '#fff', label: '✔' },
  facoltativo: { background: '#FEF3C7', color: '#92400E', label: 'facolt.' },
}

const fmtData = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—'
const fmtOre = (o) => {
  if (o == null) return ''
  const n = Number(o)
  return n < 1 ? `${Math.round(n * 60)} min` : `${n} h`
}

function Matrice({ matrice, modificabile, onCambia }) {
  const { corsi, ruoli, mansioni, obblighi } = matrice
  const statoCella = (corsoId, tipo, id) => {
    const o = obblighi.find(x => x.corso === corsoId && x[tipo] === id)
    return o ? (o.facoltativo ? 'facoltativo' : 'obbligatorio') : null
  }
  // In sola lettura si mostrano solo le righe con almeno un obbligo.
  const haObblighi = (tipo, id) => obblighi.some(o => o[tipo] === id)
  const righe = [
    ...ruoli.filter(r => modificabile || haObblighi('ruolo', r.id)).map(r => ({ tipo: 'ruolo', ...r })),
    ...mansioni.filter(m => modificabile || haObblighi('mansione', m.id)).map(m => ({ tipo: 'mansione', ...m })),
  ]

  const clic = (corso, riga) => {
    if (!modificabile) return
    const attuale = statoCella(corso.id, riga.tipo, riga.id)
    onCambia(corso, riga, STATI[(STATI.indexOf(attuale) + 1) % STATI.length])
  }

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #FCA5A5', minWidth: 200 }}>
              Ruolo / mansione
            </th>
            {corsi.map(c => (
              <th key={c.id} style={{ padding: '10px 6px', borderBottom: '2px solid #FCA5A5', minWidth: 90, textAlign: 'center' }}>
                <div>{c.nome}</div>
                <div style={{ fontWeight: 400, fontSize: 11, color: '#6B7280' }}>
                  {fmtOre(c.durata_ore)}{c.scadenza_giorni ? ` · ogni ${Math.round(c.scadenza_giorni / 365)} anni` : ''}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map(riga => (
            <tr key={`${riga.tipo}-${riga.id}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                {riga.nome}
                {riga.tipo === 'mansione' && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#6B7280', fontWeight: 400 }}>mansione</span>
                )}
              </td>
              {corsi.map(c => {
                const stato = statoCella(c.id, riga.tipo, riga.id)
                const stile = STILE_CELLA[stato]
                return (
                  <td key={c.id} onClick={() => clic(c, riga)}
                    title={modificabile ? 'Clic: obbligatorio → facoltativo → nessuno' : undefined}
                    style={{ textAlign: 'center', padding: 4, cursor: modificabile ? 'pointer' : 'default' }}>
                    {stile ? (
                      <span style={{
                        display: 'inline-block', minWidth: 56, padding: '3px 8px', borderRadius: 6,
                        background: stile.background, color: stile.color, fontWeight: 700, fontSize: 12,
                      }}>{stile.label}</span>
                    ) : <span style={{ color: '#E5E7EB' }}>·</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280', borderTop: '1px solid var(--color-border)' }}>
        <strong style={{ color: '#DC2626' }}>✔</strong> obbligatorio per il ruolo/mansione ·{' '}
        <strong style={{ color: '#92400E' }}>facolt.</strong> si può fare in anticipo (es. in vista di una promozione)
        {modificabile && ' · clicca su una cella per cambiarla'}
      </div>
    </div>
  )
}

function NuovaFormazioneModal({ persona, corsi, onClose, onSalvata }) {
  const [form, setForm] = useState({ corso: '', data: '', ore: '', aggiornamento: false, note: '' })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salva = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/ehs/formazioni/', {
        utente: persona.id, corso: form.corso, data: form.data,
        ore: form.ore || null, aggiornamento: form.aggiornamento, note: form.note,
      })
      toast.success('Formazione registrata.')
      onSalvata()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Registra formazione — ${persona.nome_completo}`} onClose={onClose}>
      <form onSubmit={salva}>
        <div className="form-group">
          <label className="form-label">Corso *</label>
          <select className="form-control" value={form.corso} onChange={e => setF('corso', e.target.value)} required>
            <option value="">Seleziona corso...</option>
            {corsi.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input type="date" className="form-control" value={form.data} onChange={e => setF('data', e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Ore</label>
            <input type="number" min="0" step="0.25" className="form-control" value={form.ore}
              onChange={e => setF('ore', e.target.value)} />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={form.aggiornamento} onChange={e => setF('aggiornamento', e.target.checked)} />
          Corso di aggiornamento
        </label>
        <div className="form-group">
          <label className="form-label">Note</label>
          <input className="form-control" value={form.note} onChange={e => setF('note', e.target.value)} maxLength={300} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </form>
    </Modal>
  )
}

// Conferma forzata: il pulsante si abilita solo scrivendo esattamente ELIMINA.
function ConfermaEliminaModal({ formazione, persona, onClose, onConferma }) {
  const [testo, setTesto] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confermato = testo === 'ELIMINA'

  const conferma = async (e) => {
    e.preventDefault()
    if (!confermato) return
    setDeleting(true)
    try {
      await onConferma()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal title="Elimina formazione" onClose={onClose} size="sm">
      <form onSubmit={conferma}>
        <p style={{ marginBottom: 12 }}>
          Stai eliminando dal registro <strong>{formazione.corso_nome}{formazione.aggiornamento ? ' (aggiornamento)' : ''}</strong>{' '}
          del {fmtData(formazione.data)} di <strong>{persona.nome_completo}</strong>. L'operazione non si può annullare.
        </p>
        <div className="form-group">
          <label className="form-label">Per confermare scrivi <strong>ELIMINA</strong></label>
          <input className="form-control" value={testo} onChange={e => setTesto(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-danger" disabled={!confermato || deleting}>
            {deleting ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function PersoneRegistro({ matrice }) {
  const { user, can } = useAuth()
  const isStore = user?.livello_accesso === 'store'
  const gestisceRegistro = can(['admin', 'admin_ehs'])
  const gestisceMansioni = can(['admin', 'admin_ehs', 'store'])
  const [stores, setStores] = useState([])
  const [negozio, setNegozio] = useState(isStore ? String(user.store_id) : '')
  const [persone, setPersone] = useState([])
  const [loading, setLoading] = useState(false)
  const [nuova, setNuova] = useState(null)
  const [daEliminare, setDaEliminare] = useState(null) // { formazione, persona }

  useEffect(() => {
    if (isStore) return
    api.get('/stores/').then(({ data }) => {
      const list = data.results || data
      setStores(list)
      if (list.length) setNegozio(String(list[0].id))
    })
  }, [isStore])

  const carica = useCallback(async () => {
    if (!negozio) return
    setLoading(true)
    try {
      const { data } = await api.get('/ehs/persone/', { params: { negozio } })
      setPersone(data)
    } finally {
      setLoading(false)
    }
  }, [negozio])

  useEffect(() => { carica() }, [carica])

  const toggleMansione = async (persona, mansioneId) => {
    const mansioni = persona.mansioni.includes(mansioneId)
      ? persona.mansioni.filter(m => m !== mansioneId)
      : [...persona.mansioni, mansioneId]
    try {
      await api.put(`/ehs/persone/${persona.id}/mansioni/`, { mansioni })
      setPersone(ps => ps.map(p => p.id === persona.id ? { ...p, mansioni } : p))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  const elimina = async () => {
    try {
      await api.delete(`/ehs/formazioni/${daEliminare.formazione.id}/`)
      toast.success('Formazione eliminata.')
      setDaEliminare(null)
      carica()
    } catch {
      toast.error('Errore.')
    }
  }

  const oggi = new Date().toISOString().slice(0, 10)
  const coloreScadenza = (s) => !s ? '#6B7280' : s < oggi ? '#DC2626' : '#065F46'

  return (
    <div>
      {!isStore && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Negozio:</label>
          <select className="form-control" style={{ maxWidth: 260 }} value={negozio} onChange={e => setNegozio(e.target.value)}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      )}

      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {!loading && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #FCA5A5' }}>
                <th style={{ padding: '10px 12px' }}>Persona</th>
                <th style={{ padding: '10px 12px' }}>Ruolo</th>
                <th style={{ padding: '10px 12px' }}>Mansioni</th>
                <th style={{ padding: '10px 12px' }}>Formazioni svolte</th>
              </tr>
            </thead>
            <tbody>
              {persone.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    {p.nome_completo}
                    {gestisceRegistro && (
                      <div>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 0', fontSize: 12 }}
                          onClick={() => setNuova(p)}>+ registra formazione</button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{p.ruolo_nome || '—'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {matrice.mansioni.map(m => {
                        const attiva = p.mansioni.includes(m.id)
                        if (!attiva && !gestisceMansioni) return null
                        return (
                          <button key={m.id} type="button" disabled={!gestisceMansioni}
                            onClick={() => toggleMansione(p, m.id)}
                            style={{
                              border: `1px solid ${attiva ? '#DC2626' : '#E5E7EB'}`, borderRadius: 12,
                              padding: '1px 8px', fontSize: 11, cursor: gestisceMansioni ? 'pointer' : 'default',
                              background: attiva ? '#FEE2E2' : '#fff', color: attiva ? '#991B1B' : '#9CA3AF',
                            }}>
                            {m.nome}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {p.formazioni.length === 0 && <span style={{ color: '#9CA3AF' }}>Nessuna formazione registrata</span>}
                    {p.formazioni.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 2 }}>
                        <strong>{f.corso_nome}{f.aggiornamento ? ' (agg.)' : ''}</strong>
                        <span>{fmtData(f.data)}</span>
                        {f.scadenza && (
                          <span style={{ color: coloreScadenza(f.scadenza) }}>→ scade {fmtData(f.scadenza)}</span>
                        )}
                        <span style={{ color: '#9CA3AF' }}>· {f.fonte_display}</span>
                        {gestisceRegistro && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Elimina" style={{ padding: 0 }}
                            onClick={() => setDaEliminare({ formazione: f, persona: p })}>🗑️</button>
                        )}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
              {persone.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#9CA3AF' }}>Nessuna persona da monitorare.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {nuova && (
        <NuovaFormazioneModal persona={nuova} corsi={matrice.corsi} onClose={() => setNuova(null)}
          onSalvata={() => { setNuova(null); carica() }} />
      )}
      {daEliminare && (
        <ConfermaEliminaModal formazione={daEliminare.formazione} persona={daEliminare.persona}
          onClose={() => setDaEliminare(null)} onConferma={elimina} />
      )}
    </div>
  )
}

export default function FormazioneObbligatoriaEHS() {
  const { can } = useAuth()
  const modificabile = can(['admin', 'admin_ehs'])
  const [tab, setTab] = useState('completamento')
  const [matrice, setMatrice] = useState(null)

  useEffect(() => {
    api.get('/ehs/matrice/').then(({ data }) => setMatrice(data))
  }, [])

  const cambiaCella = async (corso, riga, stato) => {
    try {
      await api.put('/ehs/matrice/', { corso: corso.id, [riga.tipo]: riga.id, stato })
      const { data } = await api.get('/ehs/matrice/')
      setMatrice(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  return (
    <div className="ehs-section">
      <h1 className="page-title">Formazione obbligatoria EHS</h1>
      <div className="ehs-tabs" style={{ marginBottom: 16 }}>
        <button className={`ehs-tab ${tab === 'completamento' ? 'active' : ''}`} onClick={() => setTab('completamento')}>
          📈 Completamento
        </button>
        <button className={`ehs-tab ${tab === 'matrice' ? 'active' : ''}`} onClick={() => setTab('matrice')}>
          📋 Cosa deve fare chi
        </button>
        <button className={`ehs-tab ${tab === 'persone' ? 'active' : ''}`} onClick={() => setTab('persone')}>
          👥 Persone e registro
        </button>
      </div>

      {tab === 'completamento' && <EHSCompletamentoObblighi />}
      {!matrice && tab !== 'completamento' && <div className="loading-center"><div className="spinner" /></div>}
      {matrice && tab === 'matrice' && <Matrice matrice={matrice} modificabile={modificabile} onCambia={cambiaCella} />}
      {matrice && tab === 'persone' && <PersoneRegistro matrice={matrice} />}
    </div>
  )
}
