import { useState } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function RichiestaModal({ iscrizione, onClose, onSuccess }) {
  const [motivazione, setMotivazione] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!motivazione.trim()) { toast.error('Inserisci la motivazione.'); return }
    setLoading(true)
    try {
      await api.post('/richieste-cancellazione/', { iscrizione: iscrizione.id, motivazione })
      toast.success('Richiesta inviata ad Admin/HO.')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore invio richiesta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 28, maxWidth: 480, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>
          Richiesta di cancellazione
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>
          Mancano meno di 20 giorni all'evento. La richiesta verrà inviata ad Admin/HO per approvazione.
        </p>
        <div style={{
          background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E',
        }}>
          <strong>{iscrizione.user_cognome} {iscrizione.user_nome}</strong>
          {iscrizione.store_nome && (
            <span style={{ color: '#B45309', marginLeft: 8 }}>— {iscrizione.store_nome}</span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Motivazione *</label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Spiega il motivo della cancellazione..."
            value={motivazione}
            onChange={e => setMotivazione(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Annulla</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Invio...' : 'Invia richiesta'}
          </button>
        </div>
      </div>
    </div>
  )
}
