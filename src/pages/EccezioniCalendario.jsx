import { useState, useEffect } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'

export default function EccezioniCalendario() {
  const [eccezioni, setEccezioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ data: '', nome_evento: '' })
  const [saving, setSaving] = useState(false)

  const fetchAll = () => {
    setLoading(true)
    api.get('/eccezioni/').then(({ data }) => setEccezioni(data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.data || !form.nome_evento.trim()) return
    setSaving(true)
    try {
      await api.post('/eccezioni/', form)
      toast.success('Eccezione aggiunta.')
      setForm({ data: '', nome_evento: '' })
      fetchAll()
    } catch { toast.error('Errore nel salvataggio.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa eccezione?')) return
    try {
      await api.delete(`/eccezioni/${id}/`)
      toast.success('Eliminata.')
      setEccezioni(prev => prev.filter(e => e.id !== id))
    } catch { toast.error('Errore.') }
  }

  const formatData = (d) => new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div>
      <h1 className="page-title">Eccezioni Calendario</h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>
        Gli eventi inseriti qui appaiono sul calendario principale con un puntino rosso e il nome in piccolo,
        per segnalare ricorrenze nazionali o date particolari.
      </p>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Aggiungi eccezione</div>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="form-label">Data</label>
              <input
                type="date"
                className="form-control"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 260, flex: 1 }}>
              <label className="form-label">Nome evento</label>
              <input
                className="form-control"
                placeholder="Es. Natale, Ferragosto..."
                value={form.nome_evento}
                onChange={e => setForm(f => ({ ...f, nome_evento: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : '+ Aggiungi'}
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : eccezioni.length === 0 ? (
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>
            Nessuna eccezione configurata.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome evento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {eccezioni.map(ec => (
                <tr key={ec.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#EF4444', marginRight: 6 }}>●</span>
                    {formatData(ec.data)}
                  </td>
                  <td style={{ fontWeight: 500 }}>{ec.nome_evento}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(ec.id)} title="Elimina">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
