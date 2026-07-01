import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'
import './EventoModal.css'

const TIME_SLOTS = (() => {
  const slots = []
  for (let h = 6; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 23) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
})()

export default function EventoModal({ mode, selectedDay, evento, onClose, onSaved, canEdit }) {
  const navigate = useNavigate()
  const [attivita, setAttivita] = useState([])
  const [hosts, setHosts] = useState([])
  const [stores, setStores] = useState([])
  const [eventiGiorno, setEventiGiorno] = useState([])
  const [loading, setLoading] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [motivazione, setMotivazione] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    data: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '',
    ora_inizio: '',
    ora_fine: '',
    attivita: '',
    host: '',
    location_store: '',
    location_esterna: '',
    max_partecipanti: 0,
    modalita_partecipazione: 'presenza',
    nota: '',
  })

  useEffect(() => {
    if (mode === 'create') {
      Promise.all([
        api.get('/attivita/'),
        api.get('/host/'),
        api.get('/stores/'),
      ]).then(([a, h, s]) => {
        setAttivita(a.data.results || a.data)
        setHosts(h.data.results || h.data)
        setStores(s.data.results || s.data)
      })
      if (selectedDay) {
        api.get('/eventi/', { params: { anno: selectedDay.getFullYear(), mese: selectedDay.getMonth() + 1 } })
          .then(({ data }) => {
            const dayKey = format(selectedDay, 'yyyy-MM-dd')
            setEventiGiorno((data.results || data).filter(e => e.data === dayKey))
          })
      }
    }
    if (mode === 'detail' && evento) {
      setForm({
        data: evento.data,
        ora_inizio: evento.ora_inizio?.slice(0, 5) || '',
        ora_fine: evento.ora_fine?.slice(0, 5) || '',
        attivita: evento.attivita,
        host: evento.host,
        location_store: evento.location_store || '',
        location_esterna: evento.location_esterna || '',
        max_partecipanti: evento.max_partecipanti,
        modalita_partecipazione: evento.modalita_partecipazione,
        nota: evento.nota || '',
      })
    }
  }, [mode, selectedDay, evento])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/eventi/', form)
      toast.success('Evento creato!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel salvataggio.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    setMotivazione('')
    setDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!motivazione.trim()) { toast.error('Inserisci la motivazione.'); return }
    setDeleting(true)
    try {
      await api.delete(`/eventi/${evento.id}/`, {
        data: { motivazione: motivazione.trim() },
        params: { motivazione: motivazione.trim() },
      })
      toast.success('Evento annullato.')
      setDeleteModal(false)
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante l\'annullamento.')
    } finally {
      setDeleting(false) }
  }

  const titleDate = selectedDay
    ? format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })
    : evento?.data

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'create' ? `Nuova attività — ${titleDate}` : evento?.attivita_nome}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {mode === 'create' && (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ora inizio *</label>
                <select className="form-control" value={form.ora_inizio}
                  onChange={e => setForm(f => ({ ...f, ora_inizio: e.target.value }))} required>
                  <option value="">— Seleziona —</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ora fine *</label>
                <select className="form-control" value={form.ora_fine}
                  onChange={e => setForm(f => ({ ...f, ora_fine: e.target.value }))} required>
                  <option value="">— Seleziona —</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Attività *</label>
              <select className="form-control" value={form.attivita}
                onChange={e => setForm(f => ({ ...f, attivita: e.target.value }))} required>
                <option value="">Seleziona attività...</option>
                {attivita.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Host *</label>
              <select className="form-control" value={form.host}
                onChange={e => setForm(f => ({ ...f, host: e.target.value }))} required>
                <option value="">Seleziona host...</option>
                {hosts.map(h => <option key={h.id} value={h.id}>{h.descrizione}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Location (store)</label>
              <select className="form-control" value={form.location_store}
                onChange={e => setForm(f => ({ ...f, location_store: e.target.value }))}>
                <option value="">Seleziona store...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Location esterna</label>
              <input type="text" className="form-control" placeholder="Es. Hotel Milano, online..."
                value={form.location_esterna}
                onChange={e => setForm(f => ({ ...f, location_esterna: e.target.value }))} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Max partecipanti (0 = libero)</label>
                <input type="number" className="form-control" min="0" value={form.max_partecipanti}
                  onChange={e => setForm(f => ({ ...f, max_partecipanti: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Modalità</label>
                <select className="form-control" value={form.modalita_partecipazione}
                  onChange={e => setForm(f => ({ ...f, modalita_partecipazione: e.target.value }))}>
                  <option value="presenza">In Presenza</option>
                  <option value="online">Online</option>
                  <option value="blended">Blended</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nota</label>
              <textarea className="form-control" rows="2" value={form.nota}
                onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvataggio...' : 'Inserisci'}
              </button>
            </div>

            {eventiGiorno.length > 0 && (
              <div className="eventi-giorno-list">
                <h4>Altre attività in questo giorno</h4>
                <table>
                  <thead><tr><th>Attività</th><th>Store/Host</th><th>Orario</th><th></th></tr></thead>
                  <tbody>
                    {eventiGiorno.map(ev => (
                      <tr key={ev.id}>
                        <td>{ev.attivita_nome}</td>
                        <td>{ev.host_nome}</td>
                        <td>{ev.ora_inizio?.slice(0,5)} - {ev.ora_fine?.slice(0,5)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => { setSelectedEvento(ev); setModalMode('detail') }}>
                            Gestisci
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        )}

        {mode === 'detail' && evento && (
          <div className="evento-detail">
            <div className="detail-grid">
              <div className="detail-row"><span>Data</span><strong>{evento.data}</strong></div>
              <div className="detail-row"><span>Orario</span><strong>{evento.ora_inizio?.slice(0,5)} - {evento.ora_fine?.slice(0,5)} ({evento.ore_totali}h)</strong></div>
              <div className="detail-row"><span>Host</span><strong>{evento.host_nome}</strong></div>
              <div className="detail-row"><span>Location</span><strong>{evento.location_display}</strong></div>
              <div className="detail-row"><span>Modalità</span><strong>{evento.modalita_partecipazione}</strong></div>
              <div className="detail-row"><span>Iscritti</span><strong>{evento.iscritti_count}{evento.max_partecipanti > 0 ? ` su ${evento.max_partecipanti} posti` : ''}</strong></div>
              {evento.nota && <div className="detail-row"><span>Nota</span><strong>{evento.nota}</strong></div>}
            </div>
            <div className="modal-actions">
              {canEdit && (
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Elimina</button>
              )}
              <button className="btn btn-primary" onClick={() => navigate(`/iscrizioni?evento=${evento.id}`)}>
                Gestione Partecipanti
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {deleteModal && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} onClick={() => setDeleteModal(false)}>
        <div style={{
          background: '#fff', borderRadius: 12, padding: 28, maxWidth: 440, width: '92%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#DC2626' }}>
            Annulla attività
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            Stai annullando <strong>{evento?.attivita_nome}</strong> del {evento?.data}. Tutti gli utenti riceveranno una notifica.
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Motivazione *
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={motivazione}
              onChange={e => setMotivazione(e.target.value)}
              placeholder="Scrivi il motivo dell'annullamento..."
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteModal(false)}>Annulla</button>
            <button className="btn btn-danger btn-sm" onClick={confirmDelete} disabled={deleting || !motivazione.trim()}>
              {deleting ? 'Annullamento...' : 'Conferma annullamento'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
