import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import '../calendario/EventoModal.css'

export default function EHSRichiestaFormModal({ onClose, onCreated }) {
  const { user, can } = useAuth()
  const isAdminHO = can(['admin', 'ho'])

  const [corsi, setCorsi] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    corso: '',
    negozio: user?.store_id || '',
    contatto_negozio_nome: '',
    contatto_negozio_telefono: '',
    note: '',
  })

  useEffect(() => {
    api.get('/ehs/corsi/').then(({ data }) => {
      setCorsi(data)
      if (data.length === 1) setForm(f => ({ ...f, corso: data[0].id }))
    })
    if (isAdminHO) {
      api.get('/stores/').then(({ data }) => setStores(data.results || data))
    }
  }, [isAdminHO])

  const corsoSelezionato = corsi.find(c => c.id === Number(form.corso))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        corso: form.corso,
        contatto_negozio_nome: form.contatto_negozio_nome,
        contatto_negozio_telefono: form.contatto_negozio_telefono,
        note: form.note,
      }
      if (isAdminHO) payload.negozio = form.negozio
      await api.post('/ehs/sessioni/', payload)
      toast.success('Richiesta inviata al fornitore.')
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
          <h2 className="modal-title">Nuova richiesta formazione</h2>
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
                onChange={e => setForm(f => ({ ...f, corso: e.target.value }))} required>
                <option value="">Seleziona corso...</option>
                {corsi.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.durata_ore} ore)</option>)}
              </select>
            )}
          </div>

          {isAdminHO ? (
            <div className="form-group">
              <label className="form-label">Negozio *</label>
              <select className="form-control" value={form.negozio}
                onChange={e => setForm(f => ({ ...f, negozio: e.target.value }))} required>
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
            <label className="form-label">Contatto negozio *</label>
            <input
              className="form-control"
              placeholder="Nome referente in negozio"
              value={form.contatto_negozio_nome}
              onChange={e => setForm(f => ({ ...f, contatto_negozio_nome: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Telefono contatto *</label>
            <input
              className="form-control"
              placeholder="Es. cellulare P&C"
              value={form.contatto_negozio_telefono}
              onChange={e => setForm(f => ({ ...f, contatto_negozio_telefono: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note (opz.)</label>
            <textarea className="form-control" rows="2" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annulla</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.corso}>
              {loading ? 'Invio...' : 'Invia richiesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
