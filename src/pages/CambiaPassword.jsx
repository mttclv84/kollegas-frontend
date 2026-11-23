import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import kollegalogo from '../assets/kollegas-logo.jpeg'
import './Login.css'

const fmtScadenza = (d) => new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })

// Obbligatoria finché la password è temporanea; poi resta disponibile dal menù laterale.
export default function CambiaPassword() {
  const { user, aggiornaSessione, logout } = useAuth()
  const navigate = useNavigate()
  const obbligatoria = !!user?.deve_cambiare_password
  const [form, setForm] = useState({ attuale: '', nuova: '', conferma: '' })
  const [errore, setErrore] = useState('')
  const [loading, setLoading] = useState(false)
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrore('')
    if (form.nuova !== form.conferma) { setErrore('Le due password non coincidono.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/cambia-password/', {
        password_attuale: form.attuale, nuova_password: form.nuova,
      })
      aggiornaSessione(data)
      toast.success('Password aggiornata.')
      navigate('/', { replace: true })
    } catch (err) {
      setErrore(err.response?.data?.detail || 'Errore durante il cambio password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header" style={{ marginBottom: 20 }}>
          <img src={kollegalogo} alt="Kollegas" style={{ width: 140, marginBottom: 12 }} />
          <h1 style={{ fontSize: 19, margin: '0 0 6px' }}>{obbligatoria ? 'Scegli la tua password' : 'Cambia password'}</h1>
          {obbligatoria && (
            <p className="login-subtitle">
              La password attuale è temporanea: per continuare devi sostituirla.
              {user?.password_scadenza && <> Scade il <strong>{fmtScadenza(user.password_scadenza)}</strong>.</>}
            </p>
          )}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Password attuale</label>
            <input type="password" className="form-control" autoComplete="current-password" autoFocus required
              value={form.attuale} onChange={setF('attuale')} />
          </div>
          <div className="form-group">
            <label className="form-label">Nuova password</label>
            <input type="password" className="form-control" autoComplete="new-password" minLength={8} required
              value={form.nuova} onChange={setF('nuova')} />
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              Almeno 8 caratteri, non solo numeri, non troppo comune e senza la parola Primark all'inizio.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Conferma nuova password</label>
            <input type="password" className="form-control" autoComplete="new-password" minLength={8} required
              value={form.conferma} onChange={setF('conferma')} />
          </div>
          {errore && (
            <div role="alert" style={{ fontSize: 13, color: '#991B1B', background: '#FEE2E2', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
              {errore}
            </div>
          )}
          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva password'}
          </button>
        </form>

        <p className="login-footer">
          {obbligatoria
            ? <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Esci</button>
            : <Link to="/">Torna a Kollegas</Link>}
        </p>
      </div>
    </div>
  )
}
