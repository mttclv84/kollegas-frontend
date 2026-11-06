import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { RegistroViewerModal } from './EHSRegistriList'
import '../calendario/EventoModal.css'

export const SEZIONI = [
  { tipo: 'presenze', label: 'Presenze', campo: 'presenze_caricate_il' },
  { tipo: 'attestati', label: 'Attestati', campo: 'attestati_caricati_il' },
]

const oggiISO = () => new Date().toISOString().slice(0, 10)
const fmtData = (d) => (d ? new Date(d).toLocaleDateString('it-IT') : '—')

// Chi può caricare: il fornitore dell'aula oppure Admin/Admin EHS/HO.
function usePuoCaricare(sessione) {
  const { user, can } = useAuth()
  if (!sessione) return false
  if (can(['admin', 'admin_ehs', 'ho'])) return true
  return can(['fornitore']) && sessione.fornitore === user?.id
}

function terminePassato(sessione, isFornitore) {
  return isFornitore && sessione.scadenza_caricamento && oggiISO() > sessione.scadenza_caricamento
}

/** "V" della sezione: grigia finché il fornitore non segna il caricamento come
 *  terminato, poi verde. Cliccabile solo da chi può caricare. */
function SpuntaSezione({ completa, cliccabile, onClick, titolo }) {
  return (
    <button
      type="button"
      title={titolo}
      onClick={e => { e.stopPropagation(); if (cliccabile) onClick() }}
      style={{
        width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 800, lineHeight: 1,
        background: completa ? '#10B981' : '#E5E7EB',
        color: completa ? '#fff' : '#9CA3AF',
        cursor: cliccabile ? 'pointer' : 'default',
      }}
    >
      ✓
    </button>
  )
}

/** Due tasti (Presenze e Attestati) con la relativa V, per un'aula COMPLETATA. */
export default function EHSDocumentiSezioni({ sessione, onChanged, compatto = false }) {
  const { can } = useAuth()
  const puoCaricare = usePuoCaricare(sessione)
  const isFornitore = can(['fornitore'])
  const [aperta, setAperta] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!sessione || sessione.stato !== 'COMPLETATA') return null
  const scaduto = terminePassato(sessione, isFornitore)

  const segnaCompleta = async (sezione) => {
    const n = sessione.documenti_conteggio?.[sezione.tipo] || 0
    const msg = n === 0
      ? `Nessun documento caricato in ${sezione.label}. Confermi di aver terminato?`
      : `Confermi di aver caricato tutti i documenti di ${sezione.label} (${n})? Dopo non potrai più aggiungerne.`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      await api.patch(`/ehs/sessioni/${sessione.id}/sezione-completa/`, { tipo: sezione.tipo })
      toast.success(`${sezione.label}: caricamento completato.`)
      onChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l\'operazione.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: compatto ? 6 : 14, alignItems: compatto ? 'flex-start' : 'center',
      flexDirection: compatto ? 'column' : 'row', flexWrap: 'wrap' }}
      onClick={e => e.stopPropagation()}>
      {SEZIONI.map(sezione => {
        const completa = !!sessione[sezione.campo]
        const n = sessione.documenti_conteggio?.[sezione.tipo] || 0
        const cliccabile = puoCaricare && !completa && !scaduto && !busy
        return (
          <div key={sezione.tipo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAperta(sezione)}>
              {sezione.label}{n > 0 ? ` (${n})` : ''}
            </button>
            <SpuntaSezione
              completa={completa}
              cliccabile={cliccabile}
              onClick={() => segnaCompleta(sezione)}
              titolo={completa
                ? `${sezione.label}: caricamento completato il ${fmtData(sessione[sezione.campo])}`
                : cliccabile ? `Clicca quando hai finito di caricare ${sezione.label}` : `${sezione.label}: da completare`}
            />
          </div>
        )
      })}
      {sessione.scadenza_caricamento && !(sessione.presenze_caricate_il && sessione.attestati_caricati_il) && (
        <span style={{ fontSize: compatto ? 11 : 12, color: scaduto ? '#991B1B' : '#6B7280', whiteSpace: 'nowrap' }}>
          {scaduto ? 'Termine scaduto il ' : compatto ? 'Entro il ' : 'Caricamento entro il '}{fmtData(sessione.scadenza_caricamento)}
        </span>
      )}
      {aperta && (
        <EHSDocumentiModal
          sessioneId={sessione.id}
          sezione={aperta}
          onClose={() => setAperta(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  )
}

function EHSDocumentiModal({ sessioneId, sezione, onClose, onChanged }) {
  const { can } = useAuth()
  const isFornitore = can(['fornitore'])
  const [sessione, setSessione] = useState(null)
  const [file, setFile] = useState([])
  const [busy, setBusy] = useState(false)
  const [viewing, setViewing] = useState(null)

  const fetchSessione = useCallback(() => {
    api.get(`/ehs/sessioni/${sessioneId}/`).then(({ data }) => setSessione(data)).catch(() => {})
  }, [sessioneId])
  useEffect(() => { fetchSessione() }, [fetchSessione])

  const puoCaricare = usePuoCaricare(sessione)
  if (!sessione) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="loading-center"><div className="spinner" /></div>
        </div>
      </div>
    )
  }

  const documenti = (sessione.documenti || []).filter(d => d.tipo === sezione.tipo)
  const completa = !!sessione[sezione.campo]
  const scaduto = terminePassato(sessione, isFornitore)
  const modificabile = puoCaricare && !completa && !scaduto

  const aggiorna = (data) => { setSessione(data); onChanged?.() }

  const carica = async () => {
    if (file.length === 0) { toast.error('Seleziona almeno un file.'); return }
    const fd = new FormData()
    fd.append('tipo', sezione.tipo)
    file.forEach(f => fd.append('files', f))
    setBusy(true)
    try {
      const { data } = await api.post(`/ehs/sessioni/${sessioneId}/documenti/`, fd,
        { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Documenti caricati.')
      setFile([])
      aggiorna(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante il caricamento.')
    } finally {
      setBusy(false)
    }
  }

  const elimina = async (doc) => {
    if (!window.confirm(`Rimuovere ${doc.nome_originale || 'il documento'}?`)) return
    setBusy(true)
    try {
      const { data } = await api.delete(`/ehs/sessioni/${sessioneId}/documenti/${doc.id}/`)
      aggiorna(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante la rimozione.')
    } finally {
      setBusy(false)
    }
  }

  const terminato = async () => {
    const msg = documenti.length === 0
      ? `Nessun documento caricato in ${sezione.label}. Confermi di aver terminato?`
      : `Confermi di aver caricato tutti i documenti di ${sezione.label}? Dopo non potrai più aggiungerne.`
    if (!window.confirm(msg)) return
    setBusy(true)
    try {
      const { data } = await api.patch(`/ehs/sessioni/${sessioneId}/sezione-completa/`, { tipo: sezione.tipo })
      toast.success(`${sezione.label}: caricamento completato.`)
      aggiorna(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l\'operazione.')
    } finally {
      setBusy(false)
    }
  }

  const apriDocumento = (doc) => setViewing({
    id: sessione.id,
    corso_nome: sessione.corso_nome,
    negozio_nome: sessione.negozio_nome,
    data_confermata: sessione.data_confermata,
    docente_nome: sessione.docente_nome,
    fornitore_nome: sessione.fornitore_nome,
    partecipanti_count: sessione.partecipanti_count,
    documenti: [doc, ...documenti.filter(d => d.id !== doc.id)],
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">{sezione.label} — {sessione.corso_nome}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="evento-detail">
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
            {sessione.negozio_nome} · {fmtData(sessione.data_confermata)}
            {completa ? (
              <div style={{ color: '#065F46', marginTop: 4 }}>
                ✓ Caricamento completato il {fmtData(sessione[sezione.campo])}
              </div>
            ) : sessione.scadenza_caricamento && (
              <div style={{ color: scaduto ? '#991B1B' : '#92400E', marginTop: 4 }}>
                {scaduto ? 'Termine scaduto il ' : 'Puoi caricare i documenti fino al '}
                {fmtData(sessione.scadenza_caricamento)}
                {scaduto && ': contatta l\'EHS Admin.'}
              </div>
            )}
          </div>

          {documenti.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Nessun documento caricato.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {documenti.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => apriDocumento(d)}>
                    📎 {d.nome_originale || `Documento ${d.id}`}
                  </button>
                  <span style={{ color: '#9CA3AF', fontSize: 12 }}>{fmtData(d.caricato_il)}</span>
                  {modificabile && (
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" title="Rimuovi"
                      disabled={busy} style={{ color: '#EF4444' }} onClick={() => elimina(d)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {modificabile && (
            <div style={{ marginTop: 16 }}>
              <label className="form-label" style={{ display: 'block' }}>Aggiungi documenti</label>
              <input type="file" multiple className="form-control" style={{ width: '100%', boxSizing: 'border-box' }}
                onChange={e => {
                  const nuovi = Array.from(e.target.files || [])
                  setFile(prev => [...prev, ...nuovi.filter(n => !prev.some(p => p.name === n.name && p.size === n.size))])
                  e.target.value = ''
                }} />
              {file.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {file.map((f, i) => (
                    <div key={`${f.name}-${i}`} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📄 {f.name}</span>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ color: '#EF4444' }}
                        onClick={() => setFile(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-success btn-sm" disabled={busy} onClick={terminato}
                  title="Clicca quando hai caricato tutto: la V diventa verde">
                  ✓ Ho caricato tutto
                </button>
                <button className="btn btn-primary btn-sm" disabled={busy || file.length === 0} onClick={carica}>
                  {busy ? 'Caricamento...' : `Carica${file.length ? ` (${file.length})` : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {viewing && (
        <div onClick={e => e.stopPropagation()}>
          <RegistroViewerModal registro={viewing} onClose={() => setViewing(null)} />
        </div>
      )}
    </div>
  )
}
