import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import '../calendario/EventoModal.css'

const STATO_LABELS = {
  RICHIESTA_INVIATA: 'Richiesta inviata',
  DATA_PROPOSTA: 'Data proposta',
  DATA_CONTROPROPOSTA: 'Contro-proposta dallo store',
  CONFERMATA: 'Confermata',
  REGISTRO_INVIATO: 'Registro inviato',
  SVOLTA: 'Svolta',
  COMPLETATA: 'Completata',
  ANNULLATA: 'Annullata',
}

export default function EHSSessioneModal({ sessioneId, onClose, onChanged }) {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [sessione, setSessione] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploadingRegistro, setUploadingRegistro] = useState(false)
  const [uploadingCompilato, setUploadingCompilato] = useState(false)

  const [nuovaData, setNuovaData] = useState('')
  const [docenteNome, setDocenteNome] = useState('')
  const [docenteTelefono, setDocenteTelefono] = useState('')
  const [chiusura, setChiusura] = useState({})
  const [chiudendo, setChiudendo] = useState(false)

  const fetchSessione = useCallback(() => {
    setLoading(true)
    return api.get(`/ehs/sessioni/${sessioneId}/`)
      .then(({ data }) => setSessione(data))
      .finally(() => setLoading(false))
  }, [sessioneId])

  useEffect(() => { fetchSessione() }, [fetchSessione])

  useEffect(() => {
    if (sessione?.stato === 'SVOLTA' && sessione.partecipanti) {
      setChiusura(prev => {
        const next = { ...prev }
        sessione.partecipanti.forEach(p => {
          if (!next[p.id]) next[p.id] = { presente: false, attestato: null, motivo: '' }
        })
        return next
      })
    }
  }, [sessione?.id, sessione?.stato])

  const notify = () => { fetchSessione(); onChanged?.() }

  const isFornitoreLato = can(['fornitore', 'admin', 'ho'])
  const isStoreProprietario = can(['store']) && sessione?.negozio === user.store_id
  const isStoreLato = isStoreProprietario || can(['admin', 'ho'])
  const puoAnnullare = sessione && !['SVOLTA', 'COMPLETATA', 'ANNULLATA'].includes(sessione.stato) && (
    isStoreProprietario || can(['admin', 'ho']) || (can(['fornitore']) && sessione.fornitore === user.id)
  )

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
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/proponi-data/`, {
        data_proposta: new Date(nuovaData).toISOString(),
      })
      toast.success('Data proposta.')
      setNuovaData('')
    })
  }

  const handleAccetta = () => {
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/rispondi-data/`, { accetta: true })
      toast.success('Data accettata, in attesa di conferma dal fornitore.')
    })
  }

  const handleContropropone = () => {
    if (!nuovaData) { toast.error('Seleziona la nuova data.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/rispondi-data/`, {
        accetta: false,
        nuova_data: new Date(nuovaData).toISOString(),
      })
      toast.success('Contro-proposta inviata.')
      setNuovaData('')
    })
  }

  const handleConferma = () => {
    if (!docenteNome.trim()) { toast.error('Nome docente obbligatorio.'); return }
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/conferma/`, {
        docente_nome: docenteNome.trim(),
        docente_telefono: docenteTelefono.trim(),
      })
      toast.success('Sessione confermata.')
    })
  }

  const handleAnnulla = () => {
    if (!window.confirm('Annullare questa sessione EHS? Tutti gli iscritti verranno rimossi automaticamente.')) return
    run(async () => {
      await api.patch(`/ehs/sessioni/${sessioneId}/annulla/`)
      toast.success('Sessione annullata.')
    })
  }

  const handleUploadRegistro = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingRegistro(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post(`/ehs/sessioni/${sessioneId}/registro/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Registro caricato e inviato al negozio.')
      e.target.value = ''
      notify()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante il caricamento.')
    } finally {
      setUploadingRegistro(false)
    }
  }

  const handleUploadCompilato = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingCompilato(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post(`/ehs/sessioni/${sessioneId}/registro-compilato/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Registro compilato ricevuto: sessione svolta.')
      e.target.value = ''
      notify()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante il caricamento.')
    } finally {
      setUploadingCompilato(false)
    }
  }

  const updateChiusura = (pid, patch) => {
    setChiusura(prev => ({ ...prev, [pid]: { ...prev[pid], ...patch } }))
  }

  const handleChiudiAula = () => {
    if (!window.confirm('Confermare la chiusura aula? Presenze e attestati verranno registrati definitivamente.')) return
    const fd = new FormData()
    Object.entries(chiusura).forEach(([pid, v]) => {
      fd.append(`presente_${pid}`, v.presente ? 'true' : 'false')
      if (v.presente && v.attestato) fd.append(`attestato_${pid}`, v.attestato)
      if (!v.presente && v.motivo) fd.append(`motivo_${pid}`, v.motivo)
    })
    setChiudendo(true)
    api.post(`/ehs/sessioni/${sessioneId}/chiudi-aula/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(() => { toast.success('Aula chiusa: presenze confermate, attestati inviati.'); notify() })
      .catch(err => toast.error(err.response?.data?.detail || 'Errore durante la chiusura aula.'))
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
              <div className="detail-row"><span>Stato</span><strong>{STATO_LABELS[sessione.stato] || sessione.stato}</strong></div>
              <div className="detail-row"><span>Data proposta</span><strong>{sessione.data_proposta ? new Date(sessione.data_proposta).toLocaleString('it-IT') : '—'}</strong></div>
              <div className="detail-row"><span>Data confermata</span><strong>{sessione.data_confermata ? new Date(sessione.data_confermata).toLocaleString('it-IT') : '—'}</strong></div>
              <div className="detail-row"><span>Docente</span><strong>{sessione.docente_nome || '—'} {sessione.docente_telefono ? `— ${sessione.docente_telefono}` : ''}</strong></div>
              <div className="detail-row"><span>Contatto negozio</span><strong>{sessione.contatto_negozio_nome} — {sessione.contatto_negozio_telefono}</strong></div>
              <div className="detail-row"><span>Partecipanti</span><strong>{sessione.partecipanti_count}</strong></div>
            </div>

            {/* --- Azioni per stato/ruolo --- */}
            {sessione.stato === 'RICHIESTA_INVIATA' && isFornitoreLato && (
              <div className="form-group">
                <label className="form-label">Proponi data e ora</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="datetime-local" className="form-control" value={nuovaData}
                    onChange={e => setNuovaData(e.target.value)} />
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleProponiData}>Invia</button>
                </div>
              </div>
            )}

            {sessione.stato === 'DATA_PROPOSTA' && isStoreLato && (
              <div className="form-group">
                <label className="form-label">Rispondi alla data proposta</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleAccetta}>✓ Accetta</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="datetime-local" className="form-control" value={nuovaData}
                    onChange={e => setNuovaData(e.target.value)} placeholder="Nuova data" />
                  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={handleContropropone}>Contro-proponi</button>
                </div>
              </div>
            )}

            {(sessione.stato === 'DATA_PROPOSTA' || sessione.stato === 'DATA_CONTROPROPOSTA') && isFornitoreLato && (
              <div className="form-group">
                <label className="form-label">Conferma e assegna docente</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="form-control" placeholder="Nome docente" value={docenteNome}
                    onChange={e => setDocenteNome(e.target.value)} />
                  <input className="form-control" placeholder="Telefono docente" value={docenteTelefono}
                    onChange={e => setDocenteTelefono(e.target.value)} />
                </div>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleConferma}>Conferma sessione</button>
                {sessione.stato === 'DATA_CONTROPROPOSTA' && (
                  <div style={{ marginTop: 8 }}>
                    <label className="form-label">...oppure proponi un'altra data</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="datetime-local" className="form-control" value={nuovaData}
                        onChange={e => setNuovaData(e.target.value)} />
                      <button className="btn btn-secondary btn-sm" disabled={busy} onClick={handleProponiData}>Proponi</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {['CONFERMATA', 'REGISTRO_INVIATO', 'SVOLTA', 'COMPLETATA'].includes(sessione.stato) && (
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

                {['CONFERMATA', 'REGISTRO_INVIATO'].includes(sessione.stato) && sessione.partecipanti?.length > 0 && (
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

                {isFornitoreLato && sessione.stato === 'CONFERMATA' && (
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Carica registro (da compilare)</label>
                    <input type="file" accept="application/pdf" className="form-control"
                      onChange={handleUploadRegistro} disabled={uploadingRegistro} />
                  </div>
                )}

                {isFornitoreLato && sessione.stato === 'REGISTRO_INVIATO' && (
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: '#065F46', marginBottom: 8 }}>✓ Registro inviato al negozio.</div>
                    <label className="form-label">Carica registro compilato</label>
                    <input type="file" accept="application/pdf" className="form-control"
                      onChange={handleUploadCompilato} disabled={uploadingCompilato} />
                  </div>
                )}

                {isFornitoreLato && sessione.stato === 'SVOLTA' && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
                      Chiudi aula — presenze e attestati
                    </div>
                    {(!sessione.partecipanti || sessione.partecipanti.length === 0) ? (
                      <div style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Nessun iscritto a questa sessione.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {sessione.partecipanti.map(p => {
                          const stato = chiusura[p.id] || { presente: false, attestato: null, motivo: '' }
                          return (
                            <div key={p.id} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 10 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: stato.presente ? 8 : 0 }}>
                                <input
                                  type="checkbox"
                                  checked={stato.presente}
                                  onChange={e => updateChiusura(p.id, { presente: e.target.checked })}
                                />
                                {p.utente_nome}
                              </label>
                              {stato.presente ? (
                                <input type="file" accept="application/pdf" className="form-control"
                                  onChange={e => updateChiusura(p.id, { attestato: e.target.files[0] || null })} />
                              ) : (
                                <input type="text" className="form-control" placeholder="Motivo assenza (opz.)"
                                  value={stato.motivo}
                                  onChange={e => updateChiusura(p.id, { motivo: e.target.value })} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>
                      ℹ Gli attestati caricati vengono inviati automaticamente a vspampinato@primark.it.
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
                      disabled={chiudendo} onClick={handleChiudiAula}>
                      {chiudendo ? 'Chiusura in corso...' : 'Conferma e chiudi aula'}
                    </button>
                  </div>
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
              </>
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

            {puoAnnullare && (
              <div className="modal-actions">
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={handleAnnulla}>Annulla sessione</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
