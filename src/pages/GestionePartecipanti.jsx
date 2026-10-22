import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import RichiestaModal from '../components/ui/RichiestaModal'
import { isAulaChiusa } from '../utils/aule'

const STATO_LABELS = { iscritto: 'Iscritto', partecipato: 'Partecipato', assente: 'Assente' }
const STATO_BADGE = { iscritto: 'primary', partecipato: 'success', assente: 'danger' }

function downloadPdf(evento, iscritti) {
  const rows = iscritti.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.store_nome || '—'}</td>
      <td><strong>${i.user_cognome}</strong></td>
      <td>${i.user_nome}</td>
      <td>${i.ruolo_nome || '—'}</td>
      <td>${STATO_LABELS[i.stato] || i.stato}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Lista Iscritti</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 2px; }
    .meta { font-size: 11px; color: #666; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f3f4f6; padding: 6px 8px; text-align: left; border: 1px solid #d1d5db; }
    td { padding: 5px 8px; border: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${evento.attivita_nome}</h1>
  <div class="meta">
    Data: ${evento.data} &nbsp;|&nbsp;
    Orario: ${evento.ora_inizio}–${evento.ora_fine} &nbsp;|&nbsp;
    Sede: ${evento.location_display || '—'} &nbsp;|&nbsp;
    Totale iscritti: <strong>${iscritti.length}</strong>
  </div>
  <table>
    <thead>
      <tr><th>#</th><th>Store</th><th>Cognome</th><th>Nome</th><th>Ruolo</th><th>Stato</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Abilita i popup per scaricare il PDF.'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

// Pulsante presenza (V verde / X rossa): pieno quando selezionato, a contorno altrimenti.
function PresenzaButton({ simbolo, colore, titolo, attivo, onClick }) {
  return (
    <button type="button" title={titolo} onClick={onClick} style={{
      width: 30, height: 30, borderRadius: 6, cursor: 'pointer', fontSize: 15, fontWeight: 800, lineHeight: 1,
      border: `2px solid ${colore}`, background: attivo ? colore : '#fff', color: attivo ? '#fff' : colore,
    }}>{simbolo}</button>
  )
}

export default function GestionePartecipanti() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventoId = searchParams.get('evento')

  const [evento, setEvento] = useState(null)
  const [iscritti, setIscritti] = useState([])
  const [disponibili, setDisponibili] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroNegozio, setFiltroNegozio] = useState('')
  const [richiestaModal, setRichiestaModal] = useState(null)
  const [confermaAssegna, setConfermaAssegna] = useState(null)

  const fetchData = async () => {
    if (!eventoId) return
    setLoading(true)
    try {
      const [evRes, iscRes, usersRes] = await Promise.all([
        api.get(`/eventi/${eventoId}/`),
        api.get('/iscrizioni/', { params: { evento: eventoId } }),
        api.get('/users/'),
      ])
      setEvento(evRes.data)
      const iscrittiData = iscRes.data.results || iscRes.data
      setIscritti(iscrittiData)
      const iscrittiIds = new Set(iscrittiData.map(i => i.user))
      const allUsers = usersRes.data.results || usersRes.data
      setDisponibili(allUsers.filter(u => !iscrittiIds.has(u.id)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [eventoId])

  const daysUntilEvent = evento
    ? Math.ceil((new Date(evento.data) - new Date().setHours(0, 0, 0, 0)) / 86400000)
    : 99
  const isPastEvent = daysUntilEvent < 0
  // Per le formazioni EHS lo store può cancellare un iscritto fino a 7 giorni prima;
  // per gli altri eventi la soglia resta di 20 giorni.
  const giorniBlocco = evento?.is_ehs ? 7 : 20
  const isWithin20Days = daysUntilEvent >= 0 && daysUntilEvent < giorniBlocco
  // Da una formazione EHS si torna al calendario EHS, dagli altri eventi al calendario principale.
  const paginaRitorno = evento?.is_ehs ? '/ehs' : '/'
  // Iscrizioni aperte a tutti gli store fino a esaurimento posti (0 = senza limite).
  const postiEsauriti = evento?.max_partecipanti > 0 && iscritti.length >= evento.max_partecipanti
  // Aula chiusa (oltre 7 giorni dalla data): tranne l'Admin, i partecipanti sono solo consultabili.
  const isAdmin = can(['admin'])
  const aulaChiusa = !isAdmin && isAulaChiusa(evento?.data)
  const nascondiDaAssegnare = (can(['store']) && isPastEvent) || aulaChiusa

  const handleAssegna = async (userId) => {
    try {
      await api.post('/iscrizioni/', { evento: eventoId, user: userId, stato: 'iscritto' })
      toast.success('Partecipante aggiunto.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  const avviaAssegna = async (u) => {
    if (evento?.is_ehs && evento.ehs_corso_id) {
      try {
        const { data } = await api.get('/ehs/verifica-partecipante/', {
          params: { utente: u.id, corso: evento.ehs_corso_id, evento: eventoId },
        })
        if (data.bloccato) {
          // Corso ancora valido: si rinnova solo negli ultimi 120 giorni prima della scadenza.
          toast.error(`${u.cognome} ${u.nome}: corso valido fino al ${new Date(data.scadenza_formazione).toLocaleDateString('it-IT')}. `
            + `Si può rinnovare con un'aula dal ${new Date(data.rinnovabile_dal).toLocaleDateString('it-IT')}.`, { duration: 6000 })
          return
        }
        if (data.valido) {
          setConfermaAssegna({ userId: u.id, corsoNome: data.corso_nome, scadenza: data.scadenza_formazione })
          return
        }
      } catch {}
    }
    handleAssegna(u.id)
  }

  const confermaEAssegna = () => {
    const userId = confermaAssegna?.userId
    setConfermaAssegna(null)
    if (userId) handleAssegna(userId)
  }

  // Presenze: Admin e HO segnano V (partecipato) o X (assente); le scelte restano in
  // sospeso finché non si preme Salva, che le registra e aggiorna il report.
  const canMarcarePresenze = can(['admin', 'ho'])
  const [presenze, setPresenze] = useState({}) // { iscrizioneId: stato }
  const [salvataggio, setSalvataggio] = useState(false)
  const statoDi = (i) => presenze[i.id] ?? i.stato

  const segnaPresenza = (i, stato) => {
    // Un secondo clic sullo stesso simbolo lo annulla (torna "iscritto").
    const nuovo = statoDi(i) === stato ? 'iscritto' : stato
    setPresenze(prev => {
      const next = { ...prev }
      if (nuovo === i.stato) delete next[i.id]
      else next[i.id] = nuovo
      return next
    })
  }

  const handleSalva = async () => {
    const modifiche = Object.entries(presenze)
    setSalvataggio(true)
    try {
      await Promise.all(modifiche.map(([id, stato]) => api.patch(`/iscrizioni/${id}/`, { stato })))
      toast.success(modifiche.length ? 'Presenze salvate.' : 'Modifiche salvate.')
      navigate(paginaRitorno)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel salvataggio delle presenze.')
      setPresenze({})
      fetchData()
    } finally {
      setSalvataggio(false)
    }
  }

  const handleEsci = () => {
    if (Object.keys(presenze).length && !window.confirm('Ci sono presenze non salvate. Uscire senza salvare?')) return
    navigate(paginaRitorno)
  }

  const handleElimina = async (iscrizioneId) => {
    if (!window.confirm('Rimuovere questo iscritto?')) return
    try {
      await api.delete(`/iscrizioni/${iscrizioneId}/`)
      toast.success('Rimosso.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  const canModify = (iscrizione) => {
    if (aulaChiusa) return false
    if (can(['admin', 'admin_ehs', 'ho', 'area'])) return true
    if (can(['store']) && iscrizione.store_id === user.store_id) return true
    return false
  }

  // Filtro per negozio sui collaboratori da assegnare (solo Admin).
  const negoziDisponibili = [...new Set(disponibili.map(u => u.store_nome).filter(Boolean))].sort()
  const filteredDisponibili = disponibili.filter(u =>
    (!filtroNegozio || u.store_nome === filtroNegozio) &&
    (search === '' || `${u.cognome} ${u.nome}`.toLowerCase().includes(search.toLowerCase()))
  )

  if (!eventoId) {
    return (
      <div>
        <h1 className="page-title">Gestione Partecipanti</h1>
        <div className="card"><div className="card-body" style={{ color: '#9CA3AF' }}>
          Seleziona un evento dall'Elenco Attività o dal Calendario.
        </div></div>
      </div>
    )
  }

  return (
    <div>
      {richiestaModal && (
        <RichiestaModal
          iscrizione={richiestaModal}
          onClose={() => setRichiestaModal(null)}
          onSuccess={() => { setRichiestaModal(null); fetchData() }}
        />
      )}

      {confermaAssegna && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 2800, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 32, maxWidth: 440, width: '92%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <h2 style={{ margin: '0 0 16px', fontSize: 17, color: '#92400E' }}>
              Corso già effettuato e non ancora scaduto
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#374151' }}>
              Procedere alla nuova iscrizione?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn" style={{ background: '#EF4444', color: '#fff', minWidth: 100 }}
                onClick={() => setConfermaAssegna(null)}>
                NO
              </button>
              <button className="btn" style={{ background: '#10B981', color: '#fff', minWidth: 140 }}
                onClick={confermaEAssegna}>
                SI, procedo
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="page-title">
        Gestione Partecipanti
        {evento && (
          <span style={{ color: '#6B7280', fontWeight: 400, fontSize: '1rem', marginLeft: 12 }}>
            {evento.attivita_nome} — {evento.data}
          </span>
        )}
      </h1>

      {aulaChiusa && (
        <div style={{
          background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#374151',
        }}>
          🔒 Aula chiusa: sono passati più di 7 giorni, i partecipanti sono solo consultabili.
        </div>
      )}

      {can(['store']) && isWithin20Days && !isPastEvent && (
        <div style={{
          background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8,
          padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <span>
            Mancano <strong>{daysUntilEvent} giorni</strong> all'evento.
            Le cancellazioni richiedono approvazione da Admin/HO.
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: nascondiDaAssegnare ? '1fr' : '1fr 1fr', gap: 20 }}>
          {/* Iscritti */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Iscritti
              <span className="badge badge-neutral">{iscritti.length}</span>
              {evento?.is_ehs && (
                <span title="Sotto il minimo la formazione viene cancellata in automatico 3 giorni prima"
                  style={{ fontSize: 12, fontWeight: 600, color: iscritti.length < Math.max(3, evento.ehs_partecipanti_min || 0) ? '#DC2626' : '#065F46' }}>
                  min {Math.max(3, evento.ehs_partecipanti_min || 0)}
                  {evento.max_partecipanti > 0 ? ` · max ${evento.max_partecipanti}` : ''}
                  {iscritti.length < Math.max(3, evento.ehs_partecipanti_min || 0) && ' ⚠️ sotto il minimo'}
                </span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {evento && iscritti.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => downloadPdf(evento, iscritti)}
                    title="Scarica lista iscritti in PDF"
                  >
                    ⬇ PDF
                  </button>
                )}
                {!aulaChiusa && (
                  <button className="btn btn-primary btn-sm" disabled={salvataggio} onClick={handleSalva}>
                    {salvataggio ? 'Salvataggio...' : 'Salva'}
                  </button>
                )}
                <button
                  className="btn btn-sm"
                  style={{ background: '#EF4444', color: '#fff', border: 'none' }}
                  onClick={handleEsci}
                >
                  Esci
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Store</th><th>Nome</th><th>Stato</th><th></th></tr>
                </thead>
                <tbody>
                  {iscritti.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>
                        Nessun iscritto
                      </td>
                    </tr>
                  ) : iscritti.map(i => {
                    const editable = canModify(i)
                    return (
                      <tr key={i.id} style={!editable ? { opacity: 0.7 } : {}}>
                        <td>
                          <span className="badge badge-neutral">{i.store_nome || '—'}</span>
                        </td>
                        <td>{i.user_cognome} {i.user_nome}</td>
                        <td>
                          {editable && canMarcarePresenze ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <PresenzaButton simbolo="✓" colore="#10B981" titolo="Partecipato"
                                attivo={statoDi(i) === 'partecipato'} onClick={() => segnaPresenza(i, 'partecipato')} />
                              <PresenzaButton simbolo="✕" colore="#EF4444" titolo="Non presente"
                                attivo={statoDi(i) === 'assente'} onClick={() => segnaPresenza(i, 'assente')} />
                              {presenze[i.id] && (
                                <span title="Da salvare" style={{ fontSize: 10, color: '#D97706', fontWeight: 700 }}>●</span>
                              )}
                            </div>
                          ) : (
                            <span className={`badge badge-${STATO_BADGE[i.stato]}`}>
                              {STATO_LABELS[i.stato]}
                            </span>
                          )}
                        </td>
                        <td>
                          {editable && (() => {
                            if (can(['admin', 'admin_ehs', 'ho', 'area'])) {
                              return <button className="btn btn-danger btn-sm" onClick={() => handleElimina(i.id)}>✕</button>
                            }
                            if (i.richiesta_pendente_id) {
                              return (
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '2px 8px',
                                  borderRadius: 4, background: '#FEF3C7', color: '#92400E',
                                  border: '1px solid #F59E0B',
                                }}>⏳ In attesa di cancellazione da admin</span>
                              )
                            }
                            if (isPastEvent) {
                              return (
                                <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                                  Evento concluso
                                </span>
                              )
                            }
                            if (isWithin20Days) {
                              return (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B', whiteSpace: 'nowrap' }}
                                  onClick={() => setRichiestaModal(i)}
                                >⚠ Richiedi cancellazione</button>
                              )
                            }
                            if (evento?.is_ehs) {
                              return <button className="btn btn-danger btn-sm" onClick={() => handleElimina(i.id)}>✕</button>
                            }
                            return null
                          })()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Da assegnare */}
          <div className="card" style={nascondiDaAssegnare ? { display: 'none' } : {}}>
            <div className="card-header">
              Da assegnare
              {isAdmin && (
                <select
                  className="form-control"
                  style={{ maxWidth: 200, fontWeight: 400, fontSize: '13px' }}
                  value={filtroNegozio}
                  onChange={e => setFiltroNegozio(e.target.value)}
                >
                  <option value="">Tutti i negozi</option>
                  {negoziDisponibili.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              )}
              <input
                className="form-control"
                style={{ maxWidth: 200, fontWeight: 400, fontSize: '13px' }}
                placeholder="Cerca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {postiEsauriti && (
              <div style={{ fontSize: 13, color: '#991B1B', background: '#FEE2E2', padding: '8px 16px' }}>
                Posti esauriti: tutti i {evento.max_partecipanti} posti sono occupati.
              </div>
            )}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Store</th><th>Nome</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredDisponibili.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>
                        Nessun collaboratore disponibile
                      </td>
                    </tr>
                  ) : filteredDisponibili.map(u => (
                    <tr key={u.id}>
                      <td><span className="badge badge-neutral">{u.store_nome || '—'}</span></td>
                      <td>{u.cognome} {u.nome}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" disabled={postiEsauriti} onClick={() => avviaAssegna(u)}>
                          + Assegna
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
