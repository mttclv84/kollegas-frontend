import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

// Gli screenshot della guida stanno in /media/ del backend (stesso host dell'API).
const MEDIA_BASE = `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '')}/media/`
const PROFILI = [
  { valore: 'area', etichetta: 'Area Manager' },
  { valore: 'ho', etichetta: 'Head Office' },
  { valore: 'store', etichetta: 'Store' },
  { valore: 'admin_ehs', etichetta: 'Admin EHS' },
  { valore: 'fornitore', etichetta: 'Fornitore EHS' },
]
const VUOTO = { titolo: '', contenuto: '', attivo: true, immagine: null, rimuovi_immagine: false }

// **grassetto** dentro una riga.
function Inline({ testo }) {
  return testo.split(/(\*\*[^*]+\*\*)/g).map((pezzo, i) => (
    pezzo.startsWith('**') && pezzo.endsWith('**') && pezzo.length > 4
      ? <strong key={i}>{pezzo.slice(2, -2)}</strong> : <span key={i}>{pezzo}</span>
  ))
}

// Testo semplice: paragrafi separati da una riga vuota, "- " elenco puntato, "1. " elenco numerato.
function TestoGuida({ testo }) {
  const blocchi = []
  for (const riga of (testo || '').split('\n')) {
    const tipo = /^\s*- /.test(riga) ? 'ul' : /^\s*\d+\. /.test(riga) ? 'ol' : riga.trim() ? 'p' : 'vuota'
    const ultimo = blocchi[blocchi.length - 1]
    if (tipo === 'vuota') { blocchi.push({ tipo }); continue }
    const contenuto = riga.replace(/^\s*(- |\d+\. )/, '')
    if (ultimo && ultimo.tipo === tipo) ultimo.righe.push(contenuto)
    else blocchi.push({ tipo, righe: [contenuto] })
  }
  return blocchi.filter(b => b.tipo !== 'vuota').map((b, i) => {
    if (b.tipo === 'p') return <p key={i} style={{ margin: '0 0 12px', lineHeight: 1.6 }}>{b.righe.map((r, j) => <span key={j}>{j > 0 && <br />}<Inline testo={r} /></span>)}</p>
    const Lista = b.tipo
    return <Lista key={i} style={{ margin: '0 0 12px', paddingLeft: 22, lineHeight: 1.6 }}>{b.righe.map((r, j) => <li key={j}><Inline testo={r} /></li>)}</Lista>
  })
}

function ModificaArgomento({ argomento, profilo, onClose, onSalvato }) {
  const [form, setForm] = useState(argomento ? { ...VUOTO, titolo: argomento.titolo, contenuto: argomento.contenuto, attivo: argomento.attivo } : VUOTO)
  const [salvo, setSalvo] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salva = async (e) => {
    e.preventDefault()
    const dati = new FormData()
    dati.append('profilo', argomento?.profilo || profilo)
    dati.append('titolo', form.titolo)
    dati.append('contenuto', form.contenuto)
    dati.append('attivo', form.attivo ? 'true' : 'false')
    if (form.immagine) dati.append('immagine', form.immagine)
    if (form.rimuovi_immagine) dati.append('rimuovi_immagine', 'true')
    setSalvo(true)
    try {
      const opzioni = { headers: { 'Content-Type': 'multipart/form-data' } }
      const { data } = argomento
        ? await api.patch(`/guida/${argomento.id}/`, dati, opzioni)
        : await api.post('/guida/', dati, opzioni)
      toast.success('Argomento salvato.')
      onSalvato(data)
    } catch (err) {
      const errori = err.response?.data
      toast.error(errori?.detail || (errori && Object.values(errori).flat().join(' ')) || 'Errore nel salvataggio.')
    } finally {
      setSalvo(false)
    }
  }

  return (
    <Modal title={argomento ? `Modifica — ${argomento.titolo}` : 'Nuovo argomento'} onClose={onClose}>
      <form onSubmit={salva}>
        <div className="form-group">
          <label className="form-label" htmlFor="g-titolo">Titolo *</label>
          <input id="g-titolo" className="form-control" value={form.titolo} onChange={e => setF('titolo', e.target.value)} required maxLength={150} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="g-testo">Testo</label>
          <textarea id="g-testo" className="form-control" rows={12} value={form.contenuto} onChange={e => setF('contenuto', e.target.value)} />
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Riga vuota tra i paragrafi · <code>- </code> elenco puntato · <code>1. </code> elenco numerato · <code>**testo**</code> grassetto
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="g-img">Screenshot</label>
          {argomento?.immagine_percorso && !form.immagine && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <img src={`${MEDIA_BASE}${argomento.immagine_percorso}`} alt="" style={{ height: 60, borderRadius: 4, border: '1px solid #E5E7EB', opacity: form.rimuovi_immagine ? 0.3 : 1 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.rimuovi_immagine} onChange={e => setF('rimuovi_immagine', e.target.checked)} />
                Rimuovi screenshot
              </label>
            </div>
          )}
          <input id="g-img" type="file" accept="image/*" className="form-control" onChange={e => setF('immagine', e.target.files?.[0] || null)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 16 }}>
          <input type="checkbox" checked={form.attivo} onChange={e => setF('attivo', e.target.checked)} />
          Visibile agli utenti
        </label>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={salvo}>{salvo ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Guida() {
  const { can } = useAuth()
  const isAdmin = can(['admin'])
  const [profilo, setProfilo] = useState('area')
  const [argomenti, setArgomenti] = useState(null)
  const [selezionato, setSelezionato] = useState(null)
  const [cerca, setCerca] = useState('')
  const [modifica, setModifica] = useState(null) // { argomento } oppure { nuovo: true }

  const carica = useCallback(async (dopo) => {
    const { data } = await api.get('/guida/', { params: isAdmin ? { profilo } : {} })
    setArgomenti(data)
    setSelezionato(s => dopo ?? (data.some(a => a.id === s) ? s : data[0]?.id ?? null))
  }, [isAdmin, profilo])

  useEffect(() => { setArgomenti(null); carica().catch(() => setArgomenti([])) }, [carica])

  const filtrati = useMemo(() => {
    const t = cerca.trim().toLowerCase()
    return (argomenti || []).filter(a => !t || `${a.titolo} ${a.contenuto}`.toLowerCase().includes(t))
  }, [argomenti, cerca])
  const corrente = (argomenti || []).find(a => a.id === selezionato)

  const sposta = async (verso) => {
    const lista = argomenti
    const i = lista.findIndex(a => a.id === corrente.id)
    const altro = lista[i + verso]
    if (!altro) return
    await api.patch(`/guida/${corrente.id}/`, { ordine: altro.ordine })
    await api.patch(`/guida/${altro.id}/`, { ordine: corrente.ordine === altro.ordine ? corrente.ordine + verso : corrente.ordine })
    carica(corrente.id)
  }

  const cambiaVisibilita = async () => {
    await api.patch(`/guida/${corrente.id}/`, { attivo: !corrente.attivo })
    toast.success(corrente.attivo ? 'Argomento nascosto agli utenti.' : 'Argomento di nuovo visibile.')
    carica(corrente.id)
  }

  const elimina = async () => {
    if (!window.confirm(`Eliminare l'argomento "${corrente.titolo}"? Non si può annullare: per toglierlo solo per un po' usa "Nascondi".`)) return
    await api.delete(`/guida/${corrente.id}/`)
    toast.success('Argomento eliminato.')
    setSelezionato(null)
    carica()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>📘 Guida</h1>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label className="form-label" htmlFor="g-profilo" style={{ marginBottom: 0 }}>Guida per</label>
            <select id="g-profilo" className="form-control" value={profilo} onChange={e => { setProfilo(e.target.value); setSelezionato(null) }}>
              {PROFILI.map(p => <option key={p.valore} value={p.valore}>{p.etichetta}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setModifica({ nuovo: true })}>+ Nuovo argomento</button>
          </div>
        )}
      </div>

      {argomenti === null ? <div className="loading-center"><div className="spinner" /></div> : argomenti.length === 0 ? (
        <div className="card"><div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>
          {isAdmin ? 'Nessun argomento per questo profilo: crea il primo con "+ Nuovo argomento".' : 'La guida per il tuo profilo non è ancora disponibile.'}
        </div></div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <nav aria-label="Argomenti della guida" className="card" style={{ flex: '0 1 280px', minWidth: 240, padding: 12 }}>
            <input className="form-control" placeholder="Cerca un argomento..." aria-label="Cerca un argomento"
              value={cerca} onChange={e => setCerca(e.target.value)} style={{ marginBottom: 10 }} />
            {filtrati.length === 0 && <div style={{ fontSize: 13, color: '#9CA3AF', padding: 8 }}>Nessun argomento trovato.</div>}
            {filtrati.map(a => (
              <button key={a.id} type="button" onClick={() => setSelezionato(a.id)} aria-current={a.id === selezionato ? 'page' : undefined}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 8,
                  padding: '9px 12px', marginBottom: 2, fontSize: 14, fontWeight: a.id === selezionato ? 700 : 500,
                  background: a.id === selezionato ? 'var(--color-primary)' : 'transparent',
                  color: a.id === selezionato ? '#fff' : a.attivo ? '#1F2937' : '#9CA3AF',
                }}>
                {a.titolo}{!a.attivo && ' (nascosto)'}
              </button>
            ))}
          </nav>

          {corrente && (
            <article className="card" style={{ flex: '1 1 480px', minWidth: 0, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{corrente.titolo}</h2>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => sposta(-1)} title="Sposta su" aria-label="Sposta su">↑</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => sposta(1)} title="Sposta giù" aria-label="Sposta giù">↓</button>
                    <button className="btn btn-secondary btn-sm" onClick={cambiaVisibilita}>{corrente.attivo ? 'Nascondi' : 'Mostra'}</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setModifica({ argomento: corrente })}>✏️ Modifica</button>
                    <button className="btn btn-danger btn-sm" onClick={elimina}>Elimina</button>
                  </div>
                )}
              </div>
              <TestoGuida testo={corrente.contenuto} />
              {corrente.immagine_percorso && (
                <a href={`${MEDIA_BASE}${corrente.immagine_percorso}`} target="_blank" rel="noreferrer" title="Apri l'immagine a schermo intero">
                  <img src={`${MEDIA_BASE}${corrente.immagine_percorso}`} alt={`Schermata: ${corrente.titolo}`}
                    style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #E5E7EB', marginTop: 4 }} />
                </a>
              )}
              {isAdmin && (
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
                  Aggiornato il {new Date(corrente.aggiornato_il).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                  {corrente.aggiornato_da_nome && ` da ${corrente.aggiornato_da_nome}`}
                </div>
              )}
            </article>
          )}
        </div>
      )}

      {modifica && (
        <ModificaArgomento argomento={modifica.argomento} profilo={profilo} onClose={() => setModifica(null)}
          onSalvato={(salvato) => { setModifica(null); carica(salvato.id) }} />
      )}
    </div>
  )
}
