import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { EHS_TIME_STEP, arrotondaMezzora } from '../../utils/ehsTime'
import '../calendario/EventoModal.css'

const STATO_LABELS = {
  RICHIESTA_INVIATA: 'Richiesta inviata',
  DATA_PROPOSTA: 'Data proposta',
  DATA_CONTROPROPOSTA: 'Contro-proposta dallo store',
  CONFERMATA: 'Confermata',
  COMPLETATA: 'Completata',
  ANNULLATA: 'Annullata',
}

export default function EHSSessioneModal({ sessioneId, onClose, onChanged }) {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [sessione, setSessione] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [nuovaData, setNuovaData] = useState('')
  const [docenteNome, setDocenteNome] = useState('')
  const [docenteTelefono, setDocenteTelefono] = useState('')

  // Wizard "Aula completata": 0 = non avviato, 1 = marcatura presenze, 2 = upload registro
  const [wizardStep, setWizardStep] = useState(0)
  const [presenze, setPresenze] = useState({})
  const [motivi, setMotivi] = useState({})
  const [registroFile, setRegistroFile] = useState(null)
  const [chiudendo, setChiudendo] = useState(false)

  const isFornitore = can(['fornitore'])
  const isFornitoreLato = can(['fornitore', 'admin', 'ho'])

  const fetchSessione = useCallback(() => {
    setLoading(true)
    return api.get(`/ehs/sessioni/${sessioneId}/`)
      .then(({ data }) => setSessione(data))
      .finally(() => setLoading(false))
  }, [sessioneId])

  useEffect(() => { fetchSessione() }, [fetchSessione])

  const notify = () => { fetchSessione(); onChanged?.() }

  const isStoreProprietario = can(['store']) && sessione?.negozio === user.store_id
  const isStoreLato = isStoreProprietario || can(['admin', 'ho'])
  const puoAnnullare = sessione && !['COMPLETATA', 'ANNULLATA'].includes(sessione.stato) && (
    isStoreProprietario || can(['admin', 'ho']) || (can(['fornitore']) && sessione.fornitore === user.id)
  )
  const inFaseRichiesta = sessione && ['RICHIESTA_INVIATA', 'DATA_PROPOSTA', 'DATA_CONTROPROPOSTA'].includes(sessione.stato)

  const statoLabel = sessione
    ? (isFornitore && sessione.stato === 'RICHIESTA_INVIATA' ? 'Richiesta Ricevuta' : (STATO_LABELS[sessione.stato] || sessione.stato))
    : ''

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

  const handleProponiData = () => {
    if (!nuovaData) { toast.error('Seleziona data e ora.'); return }
    if (!docenteNome.trim() || !docenteTelefono.trim()) { toast.error('Nome e telefono del docente sono obbligatori.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/proponi-data/`, {
        data_proposta: arrotondaMezzora(nuovaData).toISOString(),
        docente_nome: docenteNome.trim(),
        docente_telefono: docenteTelefono.trim(),
      })
      toast.success('Data proposta.')
      setNuovaData(''); setDocenteNome(''); setDocenteTelefono('')
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
    const msg = inFaseRichiesta
      ? 'Annullare questa richiesta EHS?'
      : 'Annullare questa sessione EHS? Tutti gli iscritti verranno rimossi automaticamente.'
    if (!window.confirm(msg)) return
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/annulla/`)
      toast.success(inFaseRichiesta ? 'Richiesta annullata.' : 'Sessione annullata.')
    })
  }

  const avviaWizard = () => {
    const iniziali = {}
    sessione.partecipanti?.forEach(p => { iniziali[p.id] = false })
    setPresenze(iniziali)
    setMotivi({})
    setRegistroFile(null)
    setWizardStep(1)
  }

  const confermaPresenze = () => setWizardStep(2)

  const handleInviaRegistro = () => {
    if (!registroFile) { toast.error('Carica il registro compilato.'); return }
    const fd = new FormData()
    sessione.partecipanti.forEach(p => {
      fd.append(`presente_${p.id}`, presenze[p.id] ? 'true' : 'false')
      if (!presenze[p.id] && motivi[p.id]) fd.append(`motivo_${p.id}`, motivi[p.id])
    })
    fd.append('file', registroFile)
    setChiudendo(true)
    api.post(`/ehs/sessioni/${sessioneId}/chiudi-aula/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => { toast.success('Aula completata: registro inviato.'); setWizardStep(0); notify() })
      .catch(err => toast.error(err.response?.data?.detail || 'Errore durante l\'invio.'))
      .finally(() => setChiudendo(false))
  }

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
              {sessione.partecipanti_previsti != null && (
                <div className="detail-row"><span>Partecipanti previsti</span><strong>{sessione.partecipanti_previsti}</strong></div>
              )}
              {sessione.data_suggerita_store && sessione.stato === 'RICHIESTA_INVIATA' && (
                <div className="detail-row"><span>Data suggerita dallo store</span><strong>{new Date(sessione.data_suggerita_store).toLocaleString('it-IT')}</strong></div>
              )}
              <div className="detail-row"><span>Data proposta</span><strong>{sessione.data_proposta ? new Date(sessione.data_proposta).toLocaleString('it-IT') : '—'}</strong></div>
              <div className="detail-row"><span>Data confermata</span><strong>{sessione.data_confermata ? new Date(sessione.data_confermata).toLocaleString('it-IT') : '—'}</strong></div>
              <div className="detail-row"><span>Docente</span><strong>{sessione.docente_nome || '—'} {sessione.docente_telefono ? `— ${sessione.docente_telefono}` : ''}</strong></div>
              <div className="detail-row"><span>Contatto negozio</span><strong>{sessione.contatto_negozio_nome} — {sessione.contatto_negozio_telefono}</strong></div>
              <div className="detail-row"><span>Partecipanti iscritti</span><strong>{sessione.partecipanti_count}</strong></div>
            </div>

            {/* --- Azioni per stato/ruolo --- */}
            {sessione.stato === 'RICHIESTA_INVIATA' && isFornitoreLato && (
              <div className="form-group">
                <label className="form-label">Proponi data, ora e docente</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="datetime-local" step={EHS_TIME_STEP} className="form-control" value={nuovaData}
                    onChange={e => setNuovaData(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="form-control" placeholder="Nome docente *" value={docenteNome}
                    onChange={e => setDocenteNome(e.target.value)} />
                  <input className="form-control" placeholder="Telefono docente *" value={docenteTelefono}
                    onChange={e => setDocenteTelefono(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleProponiData}>Invia proposta</button>
              </div>
            )}

            {sessione.stato === 'DATA_PROPOSTA' && isStoreLato && (
              <div className="form-group">
                <label className="form-label">Rispondi alla data proposta</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleAccetta}>✓ Accetta</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="datetime-local" step={EHS_TIME_STEP} className="form-control" value={nuovaData}
                    onChange={e => setNuovaData(e.target.value)} placeholder="Nuova data" />
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={handleContropropone}>Contro-proponi</button>
                </div>
              </div>
            )}

            {sessione.stato === 'DATA_CONTROPROPOSTA' && isFornitoreLato && (
              <div className="form-group">
                <label className="form-label">Rispondi alla contro-proposta dello store</label>
                <div style={{ marginBottom: 12 }}>
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleAccettaControproposta}>
                    ✓ Accetta questa data
                  </button>
                </div>
                <label className="form-label">...oppure proponi un'altra data, ora e docente</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="datetime-local" step={EHS_TIME_STEP} className="form-control" value={nuovaData}
                    onChange={e => setNuovaData(e.target.value)} />
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
                        <div key={p.id} style={{ fontSize: 13, color: '#374151' }}>• {p.utente_nome}</div>
                      ))}
                    </div>
                  </div>
                )}

                {isFornitoreLato && wizardStep === 0 && (
                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-primary btn-sm" onClick={avviaWizard}>Aula Completata</button>
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
                            <span style={{ flex: 1, fontSize: 13 }}>{p.utente_nome}</span>
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
                    <label className="form-label">Carica il registro compilato</label>
                    <input type="file" accept="application/pdf" className="form-control"
                      onChange={e => setRegistroFile(e.target.files[0] || null)} />
                    <div className="modal-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setWizardStep(1)}>Indietro</button>
                      <button className="btn btn-primary btn-sm" disabled={chiudendo} onClick={handleInviaRegistro}>
                        {chiudendo ? 'Invio...' : 'Invia'}
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
                      {p.utente_nome}
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

            {sessione.log?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="dev-timeline-title" style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Storico</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sessione.log.map(l => (
                    <div key={l.id} style={{ fontSize: 12, color: '#6B7280' }}>
                      • {new Date(l.timestamp).toLocaleString('it-IT')} — {l.nota || `${l.stato_precedente || '—'} → ${l.stato_nuovo}`}
                      {l.utente_nome && <span style={{ color: '#9CA3AF' }}> ({l.utente_nome})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {puoAnnullare && wizardStep === 0 && (
              <div className="modal-actions">
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={handleAnnulla}>
                  {inFaseRichiesta ? 'Annulla richiesta' : 'Annulla sessione'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
