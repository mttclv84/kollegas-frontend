import { useEffect, useState } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import './Topbar.css'

export default function Topbar({ onMenuToggle }) {
  const { user } = useAuth()
  // Il ruolo arriva con il login; per le sessioni aperte prima si legge una volta da /me/.
  const [ruolo, setRuolo] = useState(user?.ruolo_nome)

  useEffect(() => {
    if (!user) return
    if (user.ruolo_nome !== undefined) { setRuolo(user.ruolo_nome); return }
    api.get('/me/').then(({ data }) => setRuolo(data.ruolo_nome || '')).catch(() => {})
  }, [user])

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuToggle} aria-label="Menu">
        ☰
      </button>
      <div className="topbar-brand">
        <span className="topbar-logo">P</span>
        <span className="topbar-title">POPSQUARE</span>
      </div>
      <div className="topbar-right">
        {user && (
          <span className="topbar-user">
            {user.nome_completo}
            <span className="topbar-role" title="Livello di accesso">{user.sola_lettura ? 'GUEST' : user.livello_accesso.toUpperCase()}</span>
            {ruolo && <span className="topbar-ruolo" title="Ruolo">{ruolo}</span>}
          </span>
        )}
      </div>
    </header>
  )
}
