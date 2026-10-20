import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { arrotondaMezzora } from '../../utils/ehsTime'
import EHSDataOraPicker from './EHSDataOraPicker'
import '../calendario/EventoModal.css'

const STATO_LABELS = {
  IN_APPROVAZIONE: 'Richiesta eccezionale — in approvazione EHS',
  RICHIESTA_INVIATA: 'Richiesta inviata',
  NON_DISPONIBILE: 'Fornitore non disponibile',
  DATA_PROPOSTA: 'Data proposta',
  DATA_CONTROPROPOSTA: 'Contro-proposta dallo store',
  CONFERMATA: 'Confermata',
  COMPLETATA: 'Completata',
  ANNULLATA: 'Annullata',
  RIFIUTATA: 'Richiesta eccezionale rifiutata',
}

const GIORNI_LIMITE_CANCELLAZIONE = 7

const partecipanteLabel = (p) => `${p.utente_nome}${p.utente_store_nome ? ` (${p.utente_store_nome})` : ''}`
const fornitoreLabel = (f) => `${f.fornitore_ragione_sociale}${f.nome_completo ? ` — ${f.nome_completo}` : ''}`

const boxInfo = (bg, color) => ({ fontSize: 13, color, background: bg, padding: '8px 12px', borderRadius: 6, marginTop: 12 })

export default function EHSSessioneModal({ sessioneId, onClose, onChanged }) {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [sessione, setSessione] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [nuovaData, setNuovaData] = useState('')
  const [docenteNome, setDocenteNome] = useState('')
  const [docenteTelefono, setDocenteTelefono] = useState('')
  const [linkOnline, setLinkOnline] = useState('')
  const [modificaLink, setModificaLink] = useState(false)

  // Riassegnazione / richiesta eccezionale (store), non disponibilità (fornitore),
  // decisione sull'eccezione (EHS Admin)
  const [fornitori, setFornitori] = useState(null)
  const [fornitoreScelto, setFornitoreScelto] = useState('')
  const [modoEccezione, setModoEccezione] = useState(false)
  const [motivazione, setMotivazione] = useState('')
  const [mostraNonDisponibile, setMostraNonDisponibile] = useState(false)
  const [motivoNonDisponibile, setMotivoNonDisponibile] = useState('')
  const [notaDecisione, setNotaDecisione] = useState('')

  // Wizard "Aula completata": 0 = non avviato, 1 = marcatura presenze, 2 = upload documenti
  const [wizardStep, setWizardStep] = useState(0)
  const [presenze, setPresenze] = useState({})
  const [motivi, setMotivi] = useState({})
  const [documenti, setDocumenti] = useState([])
  const [chiudendo, setChiudendo] = useState(false)

  const [sharepointUrl, setSharepointUrl] = useState(null)

  const isFornitore = can(['fornitore'])
  const isFornitoreLato = can(['fornitore', 'admin', 'admin_ehs', 'ho'])
  const isAdmin = can(['admin', 'admin_ehs', 'ho'])
  const isApprovatore = can(['admin', 'admin_ehs'])

  const fetchSessione = useCallback(() => {
    setLoading(true)
    return api.get(`/ehs/sessioni/${sessioneId}/`)
      .then(({ data }) => setSessione(data))
      .finally(() => setLoading(false))
  }, [sessioneId])

  useEffect(() => { fetchSessione() }, [fetchSessione])

  const notify = () => { fetchSessione(); onChanged?.() }

  const isStoreProprietario = can(['store']) && sessione?.negozio === user.store_id
  const isStoreLato = isStoreProprietario || isAdmin
  const isMioFornitore = isFornitore && sessione?.fornitore === user.id
  const cancellazioneOk = sessione?.cancellazione_consentita !== false
  const puoAnnullare = sessione && !['COMPLETATA', 'ANNULLATA', 'RIFIUTATA'].includes(sessione.stato) && (
    isStoreProprietario || isAdmin || isMioFornitore
  )
  const puoRimuoverePartecipanti = sessione?.stato === 'CONFERMATA' && (isStoreProprietario || isAdmin || isMioFornitore)

  const senzaFornitore = sessione && (
    sessione.stato === 'NON_DISPONIBILE' || (sessione.stato === 'RICHIESTA_INVIATA' && !sessione.fornitore)
  )
  const isOnline = sessione?.modalita === 'ONLINE'

  const annullaLabel = ['RICHIESTA_INVIATA', 'IN_APPROVAZIONE', 'NON_DISPONIBILE'].includes(sessione?.stato) ? 'Annulla richiesta'
    : ['DATA_PROPOSTA', 'DATA_CONTROPROPOSTA'].includes(sessione?.stato) ? 'Annulla proposta'
    : 'Annulla sessione'

  const statusMessage = sessione?.stato === 'DATA_PROPOSTA' && isFornitore && !isStoreLato
    ? 'Proposta inviata, in attesa di conferma'
    : sessione?.stato === 'DATA_CONTROPROPOSTA' && can(['store'])
    ? 'Contro-proposta inviata, in attesa di risposta del fornitore'
    : sessione?.stato === 'IN_APPROVAZIONE' && can(['store'])
    ? 'In attesa di approvazione EHS Admin'
    : null

  const statoLabel = sessione
    ? (isFornitore && sessione.stato === 'RICHIESTA_INVIATA' ? 'Richiesta Ricevuta' : (STATO_LABELS[sessione.stato] || sessione.stato))
    : ''

  useEffect(() => {
    if (senzaFornitore && isStoreLato && fornitori === null) {
      api.get(`/ehs/corsi/${sessione.corso}/fornitori/`, { params: { negozio: sessione.negozio } })
        .then(({ data }) => setFornitori(data))
        .catch(() => setFornitori({ idonei: [], eccezionali: [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessione?.id, sessione?.stato, sessione?.fornitore])

  useEffect(() => {
    if (sessione?.stato === 'COMPLETATA' && isFornitoreLato && sharepointUrl === null) {
      api.get('/ehs/configurazione/')
        .then(({ data }) => setSharepointUrl(data.sharepoint_attestati_url || ''))
        .catch(() => setSharepointUrl(''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessione?.stato])

  const run = async (action) => {
    setBusy(true)
    try {
      await action()
      notify()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l\'operazione.')
    } finally {
      setBusy(false)
    }
  }

  const handleAssegnaFornitore = () => {
    if (!fornitoreScelto) { toast.error('Seleziona un fornitore.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/assegna-fornitore/`, { fornitore: fornitoreScelto })
      toast.success('Fornitore assegnato.')
      setFornitoreScelto(''); setFornitori(null)
    })
  }

  const handleRichiestaEccezionale = () => {
    if (!fornitoreScelto) { toast.error('Seleziona un fornitore.'); return }
    if (!motivazione.trim()) { toast.error('Indica la motivazione.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/richiesta-eccezionale/`, {
        fornitore: fornitoreScelto, motivazione: motivazione.trim(),
      })
      toast.success('Richiesta eccezionale inviata all\'EHS Admin.')
      setFornitoreScelto(''); setMotivazione(''); setModoEccezione(false); setFornitori(null)
    })
  }

  const handleDecidiEccezione = (approva) => {
    if (!approva && !notaDecisione.trim()) { toast.error('Indica il motivo del rifiuto.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/decidi-eccezione/`, { approva, nota: notaDecisione.trim() })
      toast.success(approva ? 'Richiesta approvata e inviata al fornitore.' : 'Richiesta rifiutata.')
      setNotaDecisione('')
    })
  }

  const handleNonDisponibile = () => {
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/non-disponibile/`, { motivo: motivoNonDisponibile.trim() })
      toast.success('Non disponibilità comunicata allo store.')
      setMostraNonDisponibile(false); setMotivoNonDisponibile('')
    })
  }

  const handleProponiData = () => {
    if (!nuovaData) { toast.error('Seleziona data e ora.'); return }
    if (!docenteNome.trim() || !docenteTelefono.trim()) { toast.error('Nome e telefono del docente sono obbligatori.'); return }
    const link = linkOnline.trim() || sessione.link_online
    if (isOnline && !link) { toast.error('Inserisci il link alla call.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/proponi-data/`, {
        data_proposta: arrotondaMezzora(nuovaData).toISOString(),
        docente_nome: docenteNome.trim(),
        docente_telefono: docenteTelefono.trim(),
        ...(isOnline ? { link_online: link } : {}),
      })
      toast.success('Proposta inviata.')
      setNuovaData(''); setDocenteNome(''); setDocenteTelefono(''); setLinkOnline('')
    })
  }

  const handleSalvaLink = () => {
    if (!linkOnline.trim()) { toast.error('Inserisci il link alla call.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/link-online/`, { link_online: linkOnline.trim() })
      toast.success(sessione.stato === 'CONFERMATA' ? 'Link aggiornato e inviato allo store.' : 'Link salvato.')
      setLinkOnline(''); setModificaLink(false)
    })
  }

  const handleAccetta = () => {
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/rispondi-data/`, { accetta: true })
      toast.success('Sessione confermata! Ora appare sul calendario EHS.')
    })
  }

  const handleContropropone = () => {
    if (!nuovaData) { toast.error('Seleziona la nuova data.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/rispondi-data/`, {
        accetta: false,
        nuova_data: arrotondaMezzora(nuovaData).toISOString(),
      })
      toast.success('Contro-proposta inviata.')
      setNuovaData('')
    })
  }

  const handleAccettaControproposta = () => {
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/accetta-controproposta/`)
      toast.success('Sessione confermata! Ora appare sul calendario EHS.')
    })
  }

  const handleAnnulla = () => {
    if (!window.confirm(`${annullaLabel}? ${sessione.stato === 'CONFERMATA' ? 'Tutti gli iscritti verranno rimossi automaticamente.' : ''}`)) return
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/annulla/`)
      toast.success(`${annullaLabel === 'Annulla sessione' ? 'Sessione' : annullaLabel === 'Annulla proposta' ? 'Proposta' : 'Richiesta'} annullata.`)
    })
  }

  const handleRimuoviPartecipante = (p) => {
    if (!window.confirm(`Cancellare l'iscrizione di ${p.utente_nome}?`)) return
    run(async () => {
      await api.delete(`/ehs/sessioni/${sessioneId}/partecipanti/${p.id}/`)
      toast.success('Iscrizione cancellata.')
    })
  }

  const handleAttestatiCaricati = () => {
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/attestati-caricati/`)
      toast.success('Caricamento attestati confermato.')
    })
  }

  const avviaWizard = () => {
    setPresenze({})
    setMotivi({})
    setDocumenti([])
    setWizardStep(1)
  }

  // L'aula si può chiudere solo il giorno stesso della data confermata, non prima.
  const isGiornoSessione = sessione?.data_confermata
    ? new Date(sessione.data_confermata).toDateString() === new Date().toDateString()
    : false

  const confermaPresenze = () => setWizardStep(2)

  const aggiungiDocumenti = (fileList) => {
    const nuovi = Array.from(fileList || [])
    setDocumenti(prev => [...prev, ...nuovi.filter(n => !prev.some(p => p.name === n.name && p.size === n.size))])
  }

  const handleInviaDocumenti = () => {
    if (documenti.length === 0) { toast.error('Carica almeno il registro compilato.'); return }
    const fd = new FormData()
    sessione.partecipanti.forEach(p => {
      fd.append(`presente_${p.id}`, presenze[p.id] ? 'true' : 'false')
      if (!presenze[p.id] && motivi[p.id]) fd.append(`motivo_${p.id}`, motivi[p.id])
    })
    documenti.forEach(f => fd.append('files', f))
    setChiudendo(true)
    api.post(`/ehs/sessioni/${sessioneId}/chiudi-aula/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => { toast.success('Aula completata: documenti inviati.'); setWizardStep(0); notify() })
      .catch(err => toast.error(err.response?.data?.detail || 'Errore durante l\'invio.'))
      .finally(() => setChiudendo(false))
  }

  const avvisoLimite = sessione?.stato === 'CONFERMATA' && !cancellazioneOk && (
    <div style={boxInfo('#FEF3C7', '#92400E')}>
      Mancano meno di {GIORNI_LIMITE_CANCELLAZIONE} giorni alla formazione: iscrizioni e formazione non sono più
      cancellabili. Per necessità contatta l'EHS Admin.
    </div>
  )

  const campoLinkOnline = (
    <input className="form-control" placeholder="Link alla call (Teams, Zoom...) *" value={linkOnline}
      onChange={e => setLinkOnline(e.target.value)} style={{ marginBottom: 8 }} />
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {sessione ? `${sessione.corso_nome} — ${sessione.negozio_nome}` : 'Sessione EHS'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : !sessione ? (
          <div style={{ padding: 24, color: '#9CA3AF' }}>Sessione non trovata.</div>
        ) : (
          <div className="evento-detail">
            <div className="detail-grid">
              <div className="detail-row"><span>Stato</span><strong>{statoLabel}</strong></div>
              <div className="detail-row"><span>Modalità</span><strong>{isOnline ? '💻 Online' : '🏬 In presenza'}</strong></div>
              {isOnline && sessione.link_online && (
                <div className="detail-row">
                  <span>Link call</span>
                  <strong><a href={sessione.link_online} target="_blank" rel="noopener noreferrer">Partecipa alla call ↗</a></strong>
                </div>
              )}
              <div className="detail-row"><span>Fornitore</span><strong>{sessione.fornitore_nome || '—'}</strong></div>
              {sessione.eccezionale && (
                <div className="detail-row">
                  <span>Richiesta eccezionale</span>
                  <strong>{sessione.fornitore_richiesto_nome || '—'}{sessione.motivazione_eccezione ? ` — ${sessione.motivazione_eccezione}` : ''}</strong>
                </div>
              )}
              {sessione.partecipanti_previsti != null && (
                <div className="detail-row"><span>Partecipanti previsti</span><strong>{sessione.partecipanti_previsti}</strong></div>
              )}
              {sessione.data_suggerita_store && ['RICHIESTA_INVIATA', 'IN_APPROVAZIONE', 'NON_DISPONIBILE'].includes(sessione.stato) && (
                <div className="detail-row"><span>Data suggerita dallo store</span><strong>{new Date(sessione.data_suggerita_store).toLocaleString('it-IT')}</strong></div>
              )}
              <div className="detail-row"><span>Data proposta</span><strong>{sessione.data_proposta ? new Date(sessione.data_proposta).toLocaleString('it-IT') : '—'}</strong></div>
              <div className="detail-row"><span>Data confermata</span><strong>{sessione.data_confermata ? new Date(sessione.data_confermata).toLocaleString('it-IT') : '—'}</strong></div>
              <div className="detail-row"><span>Docente</span><strong>{sessione.docente_nome || '—'} {sessione.docente_telefono ? `— ${sessione.docente_telefono}` : ''}</strong></div>
              <div className="detail-row"><span>Contatto negozio</span><strong>{sessione.contatto_negozio_nome}</strong></div>
              <div className="detail-row"><span>Partecipanti iscritti</span><strong>{sessione.partecipanti_count}</strong></div>
            </div>

            {/* --- Richiesta eccezionale: decisione EHS Admin --- */}
            {sessione.stato === 'IN_APPROVAZIONE' && isApprovatore && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Approva la richiesta eccezionale</label>
                <textarea className="form-control" rows="2" placeholder="Nota (obbligatoria in caso di rifiuto)"
                  value={notaDecisione} onChange={e => setNotaDecisione(e.target.value)} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" disabled={busy} onClick={() => handleDecidiEccezione(true)}>✓ Approva</button>
                  <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleDecidiEccezione(false)}>✕ Rifiuta</button>
                </div>
              </div>
            )}

            {sessione.stato === 'RIFIUTATA' && (
              <div style={boxInfo('#FEE2E2', '#991B1B')}>
                {sessione.log?.find(l => l.stato_nuovo === 'RIFIUTATA')?.nota || 'Richiesta eccezionale rifiutata.'}
              </div>
            )}

            {sessione.stato === 'NON_DISPONIBILE' && (
              <div style={boxInfo('#FEE2E2', '#991B1B')}>
                {sessione.log?.find(l => l.stato_nuovo === 'NON_DISPONIBILE')?.nota || 'Il fornitore non è disponibile.'}
              </div>
            )}

            {/* --- Store: assegna altro fornitore o richiesta eccezionale --- */}
            {senzaFornitore && isStoreLato && fornitori && (
              <div className="form-group" style={{ marginTop: 12 }}>
                {!modoEccezione ? (
                  <>
                    <label className="form-label">Assegna a un altro fornitore della rete</label>
                    {fornitori.idonei.filter(f => f.id !== sessione.fornitore).length === 0 ? (
                      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Nessun altro fornitore della rete eroga questo corso.</div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select className="form-control" value={fornitoreScelto} onChange={e => setFornitoreScelto(e.target.value)}>
                          <option value="">Seleziona fornitore...</option>
                          {fornitori.idonei.filter(f => f.id !== sessione.fornitore).map(f => (
                            <option key={f.id} value={f.id}>{fornitoreLabel(f)}</option>
                          ))}
                        </select>
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleAssegnaFornitore}>Assegna</button>
                      </div>
                    )}
                    {fornitori.eccezionali.length > 0 && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setModoEccezione(true); setFornitoreScelto('') }}>
                        Richiesta eccezionale a fornitore esterno →
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label className="form-label">Richiesta eccezionale (da approvare EHS Admin)</label>
                    <select className="form-control" value={fornitoreScelto} onChange={e => setFornitoreScelto(e.target.value)} style={{ marginBottom: 8 }}>
                      <option value="">Seleziona fornitore...</option>
                      {fornitori.eccezionali.map(f => <option key={f.id} value={f.id}>{fornitoreLabel(f)}</option>)}
                    </select>
                    <textarea className="form-control" rows="2" placeholder="Motivazione *" value={motivazione}
                      onChange={e => setMotivazione(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setModoEccezione(false)}>Indietro</button>
                      <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleRichiestaEccezionale}>Invia richiesta eccezionale</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* --- Azioni per stato/ruolo --- */}
            {sessione.stato === 'RICHIESTA_INVIATA' && isFornitoreLato && sessione.fornitore && (
              <div className="form-group">
                <label className="form-label">Proponi data, ora e docente</label>
                <div style={{ marginBottom: 8 }}>
                  <EHSDataOraPicker value={nuovaData} onChange={setNuovaData} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="form-control" placeholder="Nome docente *" value={docenteNome}
                    onChange={e => setDocenteNome(e.target.value)} />
                  <input className="form-control" placeholder="Telefono docente *" value={docenteTelefono}
                    onChange={e => setDocenteTelefono(e.target.value)} />
                </div>
                {isOnline && campoLinkOnline}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" disabled={busy} onClick={handleProponiData}>Invia proposta</button>
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setMostraNonDisponibile(v => !v)}>Non disponibile</button>
                </div>
              </div>
            )}

            {sessione.stato === 'DATA_PROPOSTA' && isStoreLato && (
              <div className="form-group">
                <label className="form-label">Rispondi alla data proposta</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button className="btn btn-success btn-sm" disabled={busy} onClick={handleAccetta}>✓ Accetta</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <EHSDataOraPicker value={nuovaData} onChange={setNuovaData} />
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={handleContropropone}>Contro-proponi</button>
                </div>
              </div>
            )}

            {sessione.stato === 'DATA_CONTROPROPOSTA' && isFornitoreLato && (
              <div className="form-group">
                <label className="form-label">Rispondi alla contro-proposta dello store</label>
                {isOnline && !sessione.link_online && (
                  <div style={{ fontSize: 12, color: '#92400E', marginBottom: 6 }}>Inserisci il link alla call per poter accettare.</div>
                )}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button className="btn btn-success btn-sm" disabled={busy || (isOnline && !sessione.link_online)} onClick={handleAccettaControproposta}>
                    ✓ Accetta questa data
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setMostraNonDisponibile(v => !v)}>Non disponibile</button>
                </div>
                <label className="form-label">...oppure proponi un'altra data, ora e docente</label>
                <div style={{ marginBottom: 8 }}>
                  <EHSDataOraPicker value={nuovaData} onChange={setNuovaData} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="form-control" placeholder="Nome docente *" value={docenteNome}
                    onChange={e => setDocenteNome(e.target.value)} />
                  <input className="form-control" placeholder="Telefono docente *" value={docenteTelefono}
                    onChange={e => setDocenteTelefono(e.target.value)} />
                </div>
                <button className="btn btn-secondary btn-sm" disabled={busy} onClick={handleProponiData}>Proponi nuova data</button>
              </div>
            )}

            {mostraNonDisponibile && ['RICHIESTA_INVIATA', 'DATA_CONTROPROPOSTA'].includes(sessione.stato) && isFornitoreLato && (
              <div className="form-group">
                <label className="form-label">Segnala non disponibilità allo store</label>
                <textarea className="form-control" rows="2" placeholder="Motivo (opz.)" value={motivoNonDisponibile}
                  onChange={e => setMotivoNonDisponibile(e.target.value)} style={{ marginBottom: 8 }} />
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={handleNonDisponibile}>Conferma non disponibilità</button>
              </div>
            )}

            {/* --- Link call per sessioni online ancora da svolgere --- */}
            {isOnline && isFornitoreLato && ['DATA_PROPOSTA', 'DATA_CONTROPROPOSTA', 'CONFERMATA'].includes(sessione.stato) && (
              modificaLink || !sessione.link_online ? (
                <div className="form-group">
                  <label className="form-label">Link alla call</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-control" placeholder="https://..." value={linkOnline}
                      onChange={e => setLinkOnline(e.target.value)} />
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleSalvaLink}>Salva</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setLinkOnline(sessione.link_online); setModificaLink(true) }}>
                    ✏️ Modifica link call
                  </button>
                </div>
              )
            )}

            {sessione.stato === 'CONFERMATA' && (
              <>
                {!can(['fornitore']) && (
                  <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/iscrizioni?evento=${sessione.calendario_evento}`)}
                    >
                      Gestione Partecipanti →
                    </button>
                  </div>
                )}

                {sessione.partecipanti?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                      Partecipanti ({sessione.partecipanti.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {sessione.partecipanti.map(p => (
                        <div key={p.id} style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>• {partecipanteLabel(p)}</span>
                          {puoRimuoverePartecipanti && cancellazioneOk && wizardStep === 0 && (
                            <button className="btn btn-ghost btn-sm btn-icon" title="Cancella iscrizione" disabled={busy}
                              onClick={() => handleRimuoviPartecipante(p)} style={{ color: '#EF4444' }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {avvisoLimite}

                {isFornitoreLato && wizardStep === 0 && (
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-primary btn-sm" disabled={!isGiornoSessione} onClick={avviaWizard}
                      title={!isGiornoSessione ? 'Disponibile solo il giorno della sessione' : undefined}>
                      Aula Completata
                    </button>
                    {!isGiornoSessione && sessione.data_confermata && (
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                        Disponibile il {new Date(sessione.data_confermata).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                )}

                {isFornitoreLato && wizardStep === 1 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Marca le presenze</div>
                    {(!sessione.partecipanti || sessione.partecipanti.length === 0) ? (
                      <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Nessun iscritto a questa sessione.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sessione.partecipanti.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #E5E7EB', borderRadius: 8, padding: 10 }}>
                            <span style={{ flex: 1, fontSize: 13 }}>{partecipanteLabel(p)}</span>
                            <button type="button"
                              className="btn btn-sm"
                              style={{ background: presenze[p.id] ? '#10B981' : '#F3F4F6', color: presenze[p.id] ? '#fff' : '#374151' }}
                              onClick={() => setPresenze(prev => ({ ...prev, [p.id]: true }))}
                            >✓</button>
                            <button type="button"
                              className="btn btn-sm"
                              style={{ background: presenze[p.id] === false ? '#EF4444' : '#F3F4F6', color: presenze[p.id] === false ? '#fff' : '#374151' }}
                              onClick={() => setPresenze(prev => ({ ...prev, [p.id]: false }))}
                            >✕</button>
                            {presenze[p.id] === false && (
                              <input className="form-control" placeholder="Motivo (opz.)" style={{ maxWidth: 160 }}
                                value={motivi[p.id] || ''}
                                onChange={e => setMotivi(prev => ({ ...prev, [p.id]: e.target.value }))} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="modal-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setWizardStep(0)}>Indietro</button>
                      <button className="btn btn-primary btn-sm" onClick={confermaPresenze}>Conferma</button>
                    </div>
                  </div>
                )}

                {isFornitoreLato && wizardStep === 2 && (
                  <div style={{ marginTop: 16 }}>
                    <label className="form-label">Carica il registro compilato e gli altri documenti</label>
                    <input type="file" multiple className="form-control"
                      onChange={e => { aggiungiDocumenti(e.target.files); e.target.value = '' }} />
                    {documenti.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                        {documenti.map((f, i) => (
                          <div key={`${f.name}-${i}`} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📎 {f.name}</span>
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ color: '#EF4444' }}
                              onClick={() => setDocumenti(prev => prev.filter((_, j) => j !== i))}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                      Gli attestati si caricano dopo, sulla cartella SharePoint, anche ad aula chiusa.
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setWizardStep(1)}>Indietro</button>
                      <button className="btn btn-primary btn-sm" disabled={chiudendo} onClick={handleInviaDocumenti}>
                        {chiudendo ? 'Invio...' : `Invia${documenti.length ? ` (${documenti.length})` : ''}`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {sessione.stato === 'COMPLETATA' && sessione.partecipanti?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  Esito ({sessione.partecipanti.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sessione.partecipanti.map(p => (
                    <div key={p.id} style={{ fontSize: 13, color: '#374151', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                        background: p.presente ? '#D1FAE5' : '#FEE2E2', color: p.presente ? '#065F46' : '#991B1B',
                      }}>
                        {p.presente ? 'PRESENTE' : 'ASSENTE'}
                      </span>
                      {partecipanteLabel(p)}
                      {p.scadenza_formazione && (
                        <span style={{ color: '#9CA3AF', fontSize: 12 }}>— scade il {new Date(p.scadenza_formazione).toLocaleDateString('it-IT')}</span>
                      )}
                      {!p.presente && p.assente_motivo && (
                        <span style={{ color: '#9CA3AF', fontSize: 12 }}>— {p.assente_motivo}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Attestati post-chiusura (cartella SharePoint aziendale) --- */}
            {sessione.stato === 'COMPLETATA' && (
              <div style={{ marginTop: 16, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Attestati</div>
                {sessione.attestati_caricati_il ? (
                  <div style={{ fontSize: 13, color: '#065F46' }}>
                    ✓ Caricati su SharePoint il {new Date(sessione.attestati_caricati_il).toLocaleDateString('it-IT')}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#92400E' }}>Da caricare</div>
                )}
                {isFornitoreLato && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {sharepointUrl ? (
                      <a className="btn btn-primary btn-sm" href={sharepointUrl} target="_blank" rel="noopener noreferrer">
                        📤 Carica attestati su SharePoint ↗
                      </a>
                    ) : sharepointUrl === '' && (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>Link alla cartella SharePoint non ancora configurato dall'EHS Admin.</span>
                    )}
                    {!sessione.attestati_caricati_il && (
                      <button className="btn btn-success btn-sm" disabled={busy} onClick={handleAttestatiCaricati}>
                        ✓ Ho caricato gli attestati
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {puoAnnullare && wizardStep === 0 && (
              <div className="modal-actions" style={{ justifyContent: statusMessage ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                {statusMessage && (
                  <span style={{ fontSize: 13, color: '#92400E', background: '#FEF3C7', padding: '6px 12px', borderRadius: 6 }}>
                    {statusMessage}
                  </span>
                )}
                <button className="btn btn-danger btn-sm" disabled={busy || !cancellazioneOk} onClick={handleAnnulla}
                  title={!cancellazioneOk ? `Non annullabile a meno di ${GIORNI_LIMITE_CANCELLAZIONE} giorni dalla data` : undefined}>
                  {annullaLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
