import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { arrotondaMezzora } from '../../utils/ehsTime'
import EHSDataOraPicker from './EHSDataOraPicker'
import '../calendario/EventoModal.css'

const fornitoreLabel = (f) => `${f.fornitore_ragione_sociale}${f.nome_completo ? ` — ${f.nome_completo}` : ''}`

// `iniziale` precompila il modulo (es. 'Richiedi aula' dal Completamento formazione obbligatoria):
// { corso, negozio, partecipanti_previsti, note }.
export default function EHSRichiestaFormModal({ onClose, onCreated, iniziale = {} }) {
  const { user, can } = useAuth()
  const isAdminHO = can(['admin', 'admin_ehs', 'ho'])

  const [corsi, setCorsi] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    corso: iniziale.corso || '',
    negozio: iniziale.negozio || user?.store_id || '',
    modalita: 'PRESENZA',
    fornitore: '',
    eccezionale: false,
    motivazione_eccezione: '',
    contatto_negozio_nome: '',
    partecipanti_previsti: iniziale.partecipanti_previsti || '',
    data_suggerita_store: '',
    note: iniziale.note || '',
  })
  // Fornitori che erogano il corso per il negozio ('idonei') e quelli richiedibili
  // solo con una richiesta eccezionale da approvare dall'EHS Admin.
  const [fornitori, setFornitori] = useState(null)

  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    api.get('/ehs/corsi/', { params: { richiedibili: 1 } }).then(({ data }) => {
      const attivi = data.filter(c => c.attivo)
      setCorsi(attivi)
      if (attivi.length === 1) setForm(f => ({ ...f, corso: attivi[0].id }))
    })
    if (isAdminHO) {
      api.get('/stores/').then(({ data }) => setStores(data.results || data))
    }
  }, [isAdminHO])

  useEffect(() => {
    setFornitori(null)
    if (!form.corso || !form.negozio) return
    api.get(`/ehs/corsi/${form.corso}/fornitori/`, { params: { negozio: form.negozio } })
      .then(({ data }) => {
        setFornitori(data)
        setForm(f => ({
          ...f,
          // Proposto il fornitore principale (i secondari vanno validati dall'EHS Admin).
          fornitore: (data.idonei.filter(x => !x.secondario).length === 1 ? data.idonei.find(x => !x.secondario)
            : data.idonei.length === 1 ? data.idonei[0] : { id: '' }).id,
          // Nessun fornitore nel perimetro: l'unica strada è la richiesta eccezionale.
          eccezionale: data.idonei.length === 0 && data.eccezionali.length > 0,
        }))
      })
      .catch(() => setFornitori({ idonei: [], eccezionali: [] }))
  }, [form.corso, form.negozio])

  const corsoSelezionato = corsi.find(c => c.id === Number(form.corso))
  const idonei = fornitori?.idonei || []
  const eccezionali = fornitori?.eccezionali || []
  const nessunFornitore = fornitori && idonei.length === 0 && eccezionali.length === 0
  const principali = idonei.filter(f => !f.secondario)
  const elencoFornitori = form.eccezionale ? eccezionali : idonei

  const toggleEccezionale = (val) => {
    setForm(f => ({
      ...f,
      eccezionale: val,
      fornitore: !val && principali.length === 1 ? principali[0].id : !val && idonei.length === 1 ? idonei[0].id : '',
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fornitore) { toast.error('Seleziona il fornitore.'); return }
    if (form.eccezionale && !form.motivazione_eccezione.trim()) {
      toast.error('Indica la motivazione della richiesta eccezionale.'); return
    }
    setLoading(true)
    try {
      const payload = {
        corso: form.corso,
        modalita: form.modalita,
        fornitore: form.fornitore,
        eccezionale: form.eccezionale,
        contatto_negozio_nome: form.contatto_negozio_nome,
        note: form.note,
      }
      if (form.eccezionale) payload.motivazione_eccezione = form.motivazione_eccezione.trim()
      if (isAdminHO) payload.negozio = form.negozio
      if (form.partecipanti_previsti) payload.partecipanti_previsti = form.partecipanti_previsti
      if (form.data_suggerita_store) {
        payload.data_suggerita_store = arrotondaMezzora(form.data_suggerita_store).toISOString()
      }
      await api.post('/ehs/sessioni/', payload)
      toast.success(form.eccezionale
        ? 'Richiesta eccezionale inviata: in attesa di approvazione EHS Admin.'
        : 'Richiesta inviata al fornitore.')
      onCreated()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l\'invio della richiesta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Nuova Richiesta Formazione Area EHS
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Corso *</label>
            {corsi.length <= 1 ? (
              <input
                className="form-control"
                value={corsoSelezionato ? `${corsoSelezionato.nome} (${corsoSelezionato.durata_ore} ore)` : 'Caricamento...'}
                disabled
              />
            ) : (
              <select className="form-control" value={form.corso}
                onChange={e => setF('corso', e.target.value)} required>
                <option value="">Seleziona corso...</option>
                {corsi.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.durata_ore} ore)</option>)}
              </select>
            )}
          </div>

          {isAdminHO ? (
            <div className="form-group">
              <label className="form-label">Negozio *</label>
              <select className="form-control" value={form.negozio}
                onChange={e => setF('negozio', e.target.value)} required>
                <option value="">Seleziona negozio...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Negozio</label>
              <input className="form-control" value={user?.store_nome || '—'} disabled />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Modalità *</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {[['PRESENZA', 'In presenza'], ['ONLINE', 'Online']].map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <input type="radio" name="modalita" checked={form.modalita === val} onChange={() => setF('modalita', val)} />
                  {label}
                </label>
              ))}
            </div>
            {form.modalita === 'ONLINE' && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                Il fornitore inserirà il link alla call: lo riceverai via email e lo troverai nella sessione.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Fornitore *</label>
            {!form.corso || !form.negozio ? (
              <input className="form-control" value="—" disabled />
            ) : fornitori === null ? (
              <input className="form-control" value="Caricamento..." disabled />
            ) : nessunFornitore ? (
              <div style={{ fontSize: 13, color: '#991B1B', background: '#FEE2E2', borderRadius: 6, padding: '8px 12px' }}>
                Nessun fornitore eroga questo corso. Contatta l'EHS Admin.
              </div>
            ) : (
              <>
                {idonei.length === 0 && (
                  <div style={{ fontSize: 13, color: '#92400E', background: '#FEF3C7', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
                    Nessun fornitore della tua rete eroga questo corso: puoi inviare una richiesta eccezionale.
                  </div>
                )}
                {!form.eccezionale && idonei.length === 1 ? (
                  <input className="form-control" value={fornitoreLabel(idonei[0])} disabled />
                ) : (
                  <select className="form-control" value={form.fornitore}
                    onChange={e => setF('fornitore', e.target.value)} required>
                    <option value="">Seleziona fornitore...</option>
                    {elencoFornitori.map(f => (
                      <option key={f.id} value={f.id}>
                        {fornitoreLabel(f)}{f.secondario ? ' (secondario — da validare EHS Admin)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                {idonei.length > 0 && eccezionali.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginTop: 8 }}>
                    <input type="checkbox" checked={form.eccezionale} onChange={e => toggleEccezionale(e.target.checked)} />
                    Nessuna disponibilità: richiesta eccezionale a un fornitore esterno alla mia rete
                  </label>
                )}
              </>
            )}
          </div>

          {form.eccezionale && (
            <div className="form-group">
              <label className="form-label">Motivazione richiesta eccezionale *</label>
              <textarea className="form-control" rows="2" required
                placeholder="Es. il fornitore della rete non ha disponibilità entro la data necessaria"
                value={form.motivazione_eccezione}
                onChange={e => setF('motivazione_eccezione', e.target.value)} />
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                La richiesta sarà inoltrata al fornitore solo dopo l'approvazione dell'EHS Admin.
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">N. Partecipanti previsti (opz.)</label>
            <input
              type="number" min="0" className="form-control"
              value={form.partecipanti_previsti}
              onChange={e => setF('partecipanti_previsti', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data da proporre al fornitore (opz.)</label>
            <EHSDataOraPicker
              value={form.data_suggerita_store}
              onChange={v => setF('data_suggerita_store', v)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contatto negozio *</label>
            <input
              className="form-control"
              placeholder="Nome referente in negozio"
              value={form.contatto_negozio_nome}
              onChange={e => setF('contatto_negozio_nome', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note (opz.)</label>
            <textarea className="form-control" rows="2" value={form.note}
              onChange={e => setF('note', e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.corso || !form.fornitore}>
              {loading ? 'Invio...' : form.eccezionale ? 'Invia richiesta eccezionale' : 'Invia richiesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
