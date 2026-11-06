import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { arrotondaMezzora } from '../../utils/ehsTime'
import EHSDataOraPicker from './EHSDataOraPicker'
import '../calendario/EventoModal.css'

const PARTECIPANTI_MINIMI = 3

/** Il fornitore crea in autonomia un'aula sul calendario EHS: è confermata subito,
 *  senza attendere la conferma del negozio. Poi si gestisce come ogni altra aula. */
export default function EHSAulaFornitoreModal({ dataIniziale, onClose, onCreated }) {
  const [opzioni, setOpzioni] = useState(null)
  const [corso, setCorso] = useState('')
  const [negozio, setNegozio] = useState('')
  const [data, setData] = useState(dataIniziale ? `${dataIniziale}T09:00` : '')
  const [docenteNome, setDocenteNome] = useState('')
  const [docenteTelefono, setDocenteTelefono] = useState('')
  const [partMin, setPartMin] = useState(String(PARTECIPANTI_MINIMI))
  const [partMax, setPartMax] = useState('')
  const [modalita, setModalita] = useState('PRESENZA')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/ehs/aula-fornitore/')
      .then(({ data: d }) => {
        setOpzioni(d)
        if (d.length === 1) setCorso(String(d[0].corso_id))
      })
      .catch(() => setOpzioni([]))
  }, [])

  const corsoScelto = opzioni?.find(o => String(o.corso_id) === corso)
  const negozi = corsoScelto?.negozi || []

  useEffect(() => {
    if (negozi.length === 1) setNegozio(String(negozi[0].id))
    else if (!negozi.some(n => String(n.id) === negozio)) setNegozio('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corso])

  const handleCrea = async () => {
    if (!corso || !negozio) { toast.error('Seleziona corso e negozio.'); return }
    if (!data || !data.includes('T') || data.endsWith('T')) { toast.error('Seleziona data e ora.'); return }
    if (!docenteNome.trim() || !docenteTelefono.trim()) { toast.error('Nome e telefono del docente sono obbligatori.'); return }
    const minimo = Number(partMin), massimo = Number(partMax)
    if (!partMin || !partMax) { toast.error('Indica il numero minimo e massimo di partecipanti.'); return }
    if (minimo < PARTECIPANTI_MINIMI) { toast.error(`Il minimo non può essere inferiore a ${PARTECIPANTI_MINIMI}.`); return }
    if (massimo < minimo) { toast.error('Il massimo non può essere inferiore al minimo.'); return }
    if (modalita === 'ONLINE' && !link.trim()) { toast.error('Inserisci il link alla call.'); return }
    setBusy(true)
    try {
      const { data: sessione } = await api.post('/ehs/aula-fornitore/', {
        corso: Number(corso),
        negozio: Number(negozio),
        data: arrotondaMezzora(data).toISOString(),
        docente_nome: docenteNome.trim(),
        docente_telefono: docenteTelefono.trim(),
        partecipanti_min: minimo,
        partecipanti_max: massimo,
        modalita,
        link_online: modalita === 'ONLINE' ? link.trim() : '',
        note: note.trim(),
      })
      toast.success('Aula creata e confermata sul calendario EHS.')
      onCreated?.(sessione)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante la creazione dell\'aula.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title">Crea aula</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {opzioni === null ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : opzioni.length === 0 ? (
          <div style={{ padding: 24, color: '#6B7280', fontSize: 14 }}>
            Non risulti abbinato a nessun corso attivo: chiedi all'EHS Admin di abilitarti sui corsi che eroghi.
          </div>
        ) : (
          <div className="evento-detail">
            <div style={{ fontSize: 13, color: '#065F46', background: '#D1FAE5', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
              L'aula viene confermata subito sul calendario EHS, senza attendere la conferma del negozio.
            </div>

            <div className="form-group">
              <label className="form-label">Corso *</label>
              <select className="form-control" value={corso} onChange={e => setCorso(e.target.value)}>
                <option value="">Seleziona corso...</option>
                {opzioni.map(o => <option key={o.corso_id} value={o.corso_id}>{o.corso_nome} ({Number(o.durata_ore)} h)</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Negozio *</label>
              <select className="form-control" value={negozio} onChange={e => setNegozio(e.target.value)} disabled={!corso}>
                <option value="">{corso ? 'Seleziona negozio...' : 'Scegli prima il corso'}</option>
                {negozi.map(n => <option key={n.id} value={n.id}>{n.codice ? `${n.codice} — ` : ''}{n.nome}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data e ora di inizio *</label>
              <EHSDataOraPicker value={data} onChange={setData} />
            </div>

            <div className="form-group">
              <label className="form-label">Docente *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-control" placeholder="Nome docente *" value={docenteNome}
                  onChange={e => setDocenteNome(e.target.value)} />
                <input className="form-control" placeholder="Telefono docente *" value={docenteTelefono}
                  onChange={e => setDocenteTelefono(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Partecipanti *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" className="form-control" style={{ maxWidth: 130 }} min={PARTECIPANTI_MINIMI}
                  placeholder="Minimo *" title={`Minimo (almeno ${PARTECIPANTI_MINIMI})`} value={partMin}
                  onChange={e => setPartMin(e.target.value)} />
                <input type="number" className="form-control" style={{ maxWidth: 130 }} min={partMin || PARTECIPANTI_MINIMI}
                  placeholder="Massimo *" value={partMax} onChange={e => setPartMax(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Modalità *</label>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                {[['PRESENZA', 'In presenza'], ['ONLINE', 'Online']].map(([val, label]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="modalita-aula" checked={modalita === val} onChange={() => setModalita(val)} />
                    {label}
                  </label>
                ))}
              </div>
              {modalita === 'ONLINE' && (
                <input className="form-control" placeholder="Link alla call (Teams, Zoom...) *" value={link}
                  onChange={e => setLink(e.target.value)} style={{ marginTop: 8 }} />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Note</label>
              <textarea className="form-control" rows="2" value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleCrea}>
                {busy ? 'Creazione...' : 'Crea aula'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
