import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import PasswordInput from '../components/ui/PasswordInput'
import kollegalogo from '../assets/kollegas-logo.jpeg'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState(false)
  const [modoReset, setModoReset] = useState(false)
  const [esitoReset, setEsitoReset] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrore(false)
    try {
      const utente = await login(form.email, form.password)
      navigate(utente.deve_cambiare_password ? '/cambia-password' : '/')
    } catch (err) {
      const stato = err.response?.status
      setErrore(stato === 403 || stato === 429 ? (err.response.data?.detail || 'Accesso non consentito.') : true)
    } finally {
      setLoading(false)
    }
  }

  const handleRichiediReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/richiedi-reset/', { email: form.email })
      setEsitoReset(data.detail)
    } catch {
      setEsitoReset('Invio non riuscito. Riprova tra qualche minuto.')
    } finally {
      setLoading(false)
    }
  }

  const apriLogin = () => { setModoReset(false); setEsitoReset('') }

  return (
    <div className="login-page">
      {errore && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setErrore(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: '36px 40px',
              textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              minWidth: 280,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>
              {errore === true ? 'Errore utente o password' : 'Accesso non disponibile'}
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>
              {errore === true ? 'Verifica le credenziali inserite e riprova.' : errore}
            </p>
            <button
              className="btn btn-primary"
              style={{ minWidth: 100 }}
              onClick={() => setErrore(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="login-card">
        <div className="login-header">
          <img src={kollegalogo} alt="Kollegas" style={{ width: 180, marginBottom: 12 }} />
          <p className="login-subtitle">Primark Italy — Learning & Development</p>
        </div>

        {modoReset ? (
          <form className="login-form" onSubmit={handleRichiediReset}>
            <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>Richiedi reset password</h2>
            {esitoReset ? (
              <p role="status" style={{ fontSize: 13, color: '#065F46', background: '#D1FAE5', borderRadius: 6, padding: '10px 12px' }}>
                {esitoReset}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>
                  La richiesta arriva all'Admin, che ti comunicherà una password temporanea.
                </p>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" placeholder="nome@primark.it" required autoFocus
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
                  {loading ? 'Invio...' : 'Invia richiesta'}
                </button>
              </>
            )}
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10, alignSelf: 'center' }} onClick={apriLogin}>
              ← Torna al login
            </button>
          </form>
        ) : (
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="nome@primark.it"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <PasswordInput
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10, alignSelf: 'center' }}
            onClick={() => setModoReset(true)}>
            Richiedi reset password
          </button>
        </form>
        )}

        <p className="login-footer">© 2026 Primark Italy internal tool</p>
      </div>
    </div>
  )
}
