import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const TIPI = [
  { valore: 'suggerimento', etichetta: 'Suggerimenti', singolare: 'Suggerimento', icona: '💡', aiuto: 'Un miglioramento a qualcosa che esiste già' },
  { valore: 'idea', etichetta: 'Idee', singolare: 'Idea', icona: '✨', aiuto: 'Una novità che ti piacerebbe trovare in Kollegas' },
  { valore: 'aiuto', etichetta: 'Aiuto', singolare: 'Aiuto', icona: '🛟', aiuto: 'Un problema o un dubbio su una sezione' },
]
const TIPO = Object.fromEntries(TIPI.map(t => [t.valore, t]))
const SEZIONI = [
  'Accesso e password', 'Calendario', 'Elenco Attività', 'Iscrizioni e partecipanti', '% Completamento', 'Dettaglio',
  'Mapping', 'Development', 'Stats', 'Gestione Account', 'EHS Calendar & Richieste', 'Panel Formazione EHS', 'Guida', 'Altro',
]
const STATI = {
  nuova: { etichetta: 'Nuova', bg: '#DBEAFE', fg: '#1E40AF' },
  in_lavorazione: { etichetta: 'In lavorazione', bg: '#FEF3C7', fg: '#92400E' },
  completata: { etichetta: 'Completata', bg: '#D1FAE5', fg: '#065F46' },
}
const quando = (d) => new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

function BadgeStato({ stato }) {
  const s = STATI[stato] || STATI.nuova
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.fg, background: s.bg, borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>{s.etichetta}</span>
}

function Intestazione({ r }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
      <strong style={{ fontSize: 14 }}>{TIPO[r.tipo]?.icona} {TIPO[r.tipo]?.singolare}</strong>
      {r.sezione && <span className="badge badge-neutral">{r.sezione}</span>}
      <BadgeStato stato={r.stato} />
      <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>{quando(r.creata_il)}</span>
    </div>
  )
}

// ── Utente: invia e segue le proprie richieste ──
function NuovaRichiesta({ onInviata }) {
  const [tipo, setTipo] = useState('suggerimento')
  const [sezione, setSezione] = useState('')
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)

  const invia = async (e) => {
    e.preventDefault()
    setInvio(true)
    try {
      await api.post('/assistenza/', { tipo, sezione: tipo === 'aiuto' ? sezione : '', testo })
      toast.success('Richiesta inviata: ti risponderemo qui.')
      setTesto(''); setSezione('')
      onInviata()
    } catch (err) {
      const errori = err.response?.data
      toast.error(errori?.detail || (errori && Object.values(errori).flat().join(' ')) || 'Invio non riuscito.')
    } finally {
      setInvio(false)
    }
  }

  return (
    <form className="card" onSubmit={invia} style={{ padding: 20, marginBottom: 24 }}>
      <div role="radiogroup" aria-label="Tipo di richiesta" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {TIPI.map(t => {
          const scelto = tipo === t.valore
          return (
            <button key={t.valore} type="button" role="radio" aria-checked={scelto} onClick={() => setTipo(t.valore)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${scelto ? 'var(--color-primary)' : '#E5E7EB'}`, background: scelto ? '#E0F7FC' : '#fff',
              }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{t.icona} {t.etichetta}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{t.aiuto}</div>
            </button>
          )
        })}
      </div>
      {tipo === 'aiuto' && (
        <div className="form-group">
          <label className="form-label" htmlFor="a-sezione">Sezione *</label>
          <select id="a-sezione" className="form-control" value={sezione} onChange={e => setSezione(e.target.value)} required style={{ maxWidth: 320 }}>
            <option value="">— Scegli la sezione —</option>
            {SEZIONI.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label className="form-label" htmlFor="a-testo">{tipo === 'aiuto' ? 'Descrivi il problema *' : 'Scrivi qui *'}</label>
        <textarea id="a-testo" className="form-control" rows={5} value={testo} onChange={e => setTesto(e.target.value)} required maxLength={4000} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={invio}>{invio ? 'Invio...' : 'Invia'}</button>
      </div>
    </form>
  )
}

function MieRichieste({ richieste }) {
  if (!richieste.length) return <p style={{ color: '#9CA3AF' }}>Non hai ancora inviato richieste.</p>
  return richieste.map(r => (
    <div key={r.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
      <Intestazione r={r} />
      <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: '#374151' }}>{r.testo}</div>
      {r.risposta && (
        <div style={{ marginTop: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 4 }}>
            Risposta{r.risposto_da_nome ? ` di ${r.risposto_da_nome}` : ''} · {quando(r.risposta_il)}
          </div>
          <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: '#1F2937' }}>{r.risposta}</div>
        </div>
      )}
    </div>
  ))
}

// ── Admin: tutte le richieste, risposta e stato ──
function GestioneRichiesta({ r, onSalvata }) {
  const [risposta, setRisposta] = useState(r.risposta)
  const [stato, setStato] = useState(r.stato)
  const [salvo, setSalvo] = useState(false)
  const modificata = risposta !== r.risposta || stato !== r.stato

  const salva = async () => {
    setSalvo(true)
    try {
      const { data } = await api.patch(`/assistenza/${r.id}/`, { risposta, stato })
      toast.success('Richiesta aggiornata.')
      onSalvata(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Salvataggio non riuscito.')
    } finally {
      setSalvo(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12, borderLeft: `4px solid ${STATI[r.stato]?.fg || '#1E40AF'}` }}>
      <Intestazione r={r} />
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
        <strong style={{ color: '#1F2937' }}>{r.utente_nome}</strong> · {r.utente_profilo}{r.utente_negozio ? ` · ${r.utente_negozio}` : ''} · {r.utente_email}
      </div>
      <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', color: '#374151', marginBottom: 12 }}>{r.testo}</div>
      <label className="form-label" htmlFor={`r-${r.id}`}>Risposta</label>
      <textarea id={`r-${r.id}`} className="form-control" rows={3} value={risposta} onChange={e => setRisposta(e.target.value)}
        placeholder="Scrivi la risposta: la vedrà nella sua pagina Assistenza." />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
        <label className="form-label" htmlFor={`s-${r.id}`} style={{ marginBottom: 0 }}>Stato</label>
        <select id={`s-${r.id}`} className="form-control" value={stato} onChange={e => setStato(e.target.value)} style={{ maxWidth: 180 }}>
          {Object.entries(STATI).map(([v, s]) => <option key={v} value={v}>{s.etichetta}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" disabled={!modificata || salvo} onClick={salva}>{salvo ? 'Salvataggio...' : 'Salva'}</button>
      </div>
    </div>
  )
}

export default function Assistenza() {
  const { can } = useAuth()
  const isAdmin = can(['admin'])
  const [richieste, setRichieste] = useState(null)
  const [filtroStato, setFiltroStato] = useState(isAdmin ? 'nuova' : '')
  const [filtroTipo, setFiltroTipo] = useState('')

  const carica = useCallback(async () => {
    const params = {}
    if (filtroStato) params.stato = filtroStato
    if (filtroTipo) params.tipo = filtroTipo
    const { data } = await api.get('/assistenza/', { params })
    setRichieste(data)
  }, [filtroStato, filtroTipo])

  useEffect(() => { carica().catch(() => setRichieste([])) }, [carica])
  // Aperta la pagina, le risposte ricevute risultano lette (spegne il pallino nel menu).
  useEffect(() => { if (!isAdmin) api.post('/assistenza/contatori/').catch(() => {}) }, [isAdmin, richieste])

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="page-title">🛟 Assistenza</h1>
      {isAdmin ? (
        <>
          <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label" htmlFor="f-stato">Stato</label>
              <select id="f-stato" className="form-control" value={filtroStato} onChange={e => setFiltroStato(e.target.value)}>
                <option value="">Tutte</option>
                {Object.entries(STATI).map(([v, s]) => <option key={v} value={v}>{s.etichetta}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label" htmlFor="f-tipo">Tipo</label>
              <select id="f-tipo" className="form-control" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="">Tutti</option>
                {TIPI.map(t => <option key={t.valore} value={t.valore}>{t.etichetta}</option>)}
              </select>
            </div>
          </div>
          {richieste === null ? <div className="loading-center"><div className="spinner" /></div>
            : richieste.length === 0 ? <p style={{ color: '#9CA3AF' }}>Nessuna richiesta con questi filtri.</p>
            : richieste.map(r => (
              <GestioneRichiesta key={`${r.id}-${r.stato}-${r.risposta_il}`} r={r} onSalvata={() => carica()} />
            ))}
        </>
      ) : (
        <>
          <p style={{ color: '#6B7280', marginTop: -8, marginBottom: 16 }}>
            Scrivi un suggerimento, un'idea o chiedi aiuto: la richiesta arriva all'Admin, che ti risponde qui sotto.
          </p>
          <NuovaRichiesta onInviata={carica} />
          <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Le mie richieste</h2>
          {richieste === null ? <div className="loading-center"><div className="spinner" /></div> : <MieRichieste richieste={richieste} />}
        </>
      )}
    </div>
  )
}
