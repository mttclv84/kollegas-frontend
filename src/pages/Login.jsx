import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import kollegalogo from '../assets/kollegas-logo.jpeg'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrore(false)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch {
      setErrore(true)
    } finally {
      setLoading(false)
    }
  }

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
              Errore utente o password
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>
              Verifica le credenziali inserite e riprova.
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
            <input
              type="password"
              className="form-control"
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
        </form>

        <p className="login-footer">© 2026 Primark Italy internal tool</p>
      </div>
    </div>
  )
}
