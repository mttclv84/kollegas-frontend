import { useAuth } from '../../context/AuthContext'
import './Topbar.css'

export default function Topbar({ onMenuToggle }) {
  const { user } = useAuth()

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
            <span className="topbar-role">{user.livello_accesso.toUpperCase()}</span>
          </span>
        )}
      </div>
    </header>
  )
}
