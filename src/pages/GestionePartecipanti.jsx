import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import RichiestaModal from '../components/ui/RichiestaModal'

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
  const [richiestaModal, setRichiestaModal] = useState(null)

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
  const isWithin20Days = daysUntilEvent >= 0 && daysUntilEvent < 20

  const handleAssegna = async (userId) => {
    try {
      await api.post('/iscrizioni/', { evento: eventoId, user: userId, stato: 'iscritto' })
      toast.success('Partecipante aggiunto.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  const handleStatoChange = async (iscrizioneId, stato) => {
    try {
      await api.patch(`/iscrizioni/${iscrizioneId}/`, { stato })
      setIscritti(prev => prev.map(i => i.id === iscrizioneId ? { ...i, stato } : i))
    } catch {
      toast.error('Errore aggiornamento stato.')
    }
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
    if (can(['admin', 'ho', 'area'])) return true
    if (can(['store']) && iscrizione.store_id === user.store_id) return true
    return false
  }

  const filteredDisponibili = disponibili.filter(u =>
    search === '' ||
    `${u.cognome} ${u.nome}`.toLowerCase().includes(search.toLowerCase())
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

      <h1 className="page-title">
        Gestione Partecipanti
        {evento && (
          <span style={{ color: '#6B7280', fontWeight: 400, fontSize: '1rem', marginLeft: 12 }}>
            {evento.attivita_nome} — {evento.data}
          </span>
        )}
      </h1>

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
        <div style={{ display: 'grid', gridTemplateColumns: can(['store']) && isPastEvent ? '1fr' : '1fr 1fr', gap: 20 }}>
          {/* Iscritti */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Iscritti
              <span className="badge badge-neutral">{iscritti.length}</span>
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
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { toast.success('Modifiche salvate.'); navigate('/') }}
                >
                  Salva
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: '#EF4444', color: '#fff', border: 'none' }}
                  onClick={() => navigate('/')}
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
                          {editable && can(['admin', 'ho', 'area']) ? (
                            <select
                              className="form-control"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              value={i.stato}
                              onChange={e => handleStatoChange(i.id, e.target.value)}
                            >
                              <option value="iscritto">Iscritto</option>
                              <option value="partecipato">Partecipato</option>
                              <option value="assente">Assente</option>
                            </select>
                          ) : (
                            <span className={`badge badge-${STATO_BADGE[i.stato]}`}>
                              {STATO_LABELS[i.stato]}
                            </span>
                          )}
                        </td>
                        <td>
                          {editable && (() => {
                            if (can(['admin', 'ho', 'area'])) {
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
          <div className="card" style={can(['store']) && isPastEvent ? { display: 'none' } : {}}>
            <div className="card-header">
              Da assegnare
              <input
                className="form-control"
                style={{ maxWidth: 200, fontWeight: 400, fontSize: '13px' }}
                placeholder="Cerca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
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
                        <button className="btn btn-primary btn-sm" onClick={() => handleAssegna(u.id)}>
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
