import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import kollegalogo from '../../assets/kollegas-logo.jpeg'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Calendario', icon: '📅', roles: ['admin', 'ho', 'area', 'store', 'base'] },
  { to: '/corsi', label: 'Elenco Attività', icon: '📝', roles: ['admin', 'ho', 'store'] },
  {
    group: 'Report',
    icon: '📊',
    roles: ['admin', 'ho', 'area', 'store'],
    children: [
      { to: '/completamento', label: '% Completamento', icon: '📈', roles: ['admin', 'ho', 'area', 'store'] },
      { to: '/report',        label: 'Dettaglio',        icon: '🔍', roles: ['admin', 'ho', 'area', 'store'] },
      { to: '/mapping',       label: 'Mapping',          icon: '🗂️', roles: ['admin', 'ho', 'area', 'store'] },
    ],
  },
  { to: '/development',   label: 'Development',      icon: '🚀', roles: ['admin', 'ho', 'area'] },
  {
    group: 'Gestione',
    icon: '⚙️',
    roles: ['admin', 'ho', 'store'],
    children: [
      { to: '/account',      label: 'Gestione Account',   icon: '👤', roles: ['admin', 'ho', 'store'], accountBadge: true },
      { to: '/attivita',     label: 'Catalogo Attività',  icon: '🎓', roles: ['admin', 'ho'] },
      { to: '/store',        label: 'Gestione Store',     icon: '🏪', roles: ['admin'] },
      { to: '/store-config', label: 'Gestione Cluster', icon: '⚙️', roles: ['admin'] },
      { to: '/aree',         label: 'Gestione Aree',     icon: '🗺️', roles: ['admin'] },
      { to: '/host',         label: 'Gestione Host',      icon: '🎤', roles: ['admin', 'ho'] },
      { to: '/ruoli',        label: 'Gestione Ruoli',     icon: '🏷️', roles: ['admin'] },
      { to: '/eccezioni',    label: 'Eccezioni Calendario', icon: '📌', roles: ['admin', 'ho'] },
    ],
  },
  { divider: true },
  { to: '/iscrizioni-store', label: 'Iscrizioni',            icon: '📋', roles: ['store'] },
  { to: '/richieste',        label: 'Richieste di Modifica', icon: '🔔', roles: ['admin', 'ho'], alertBadge: true },
  { to: '/audit',            label: 'Audit Log',              icon: '📋', roles: ['admin', 'ho'] },
  { to: '/stats',            label: 'Stats',                  icon: '📊', roles: ['admin', 'ho', 'area'] },
  { to: '/disattivati',      label: 'Disattivati',            icon: '🗄️', roles: ['admin'] },
]

export default function Sidebar({ collapsed, onToggle, mobileOpen }) {
  const { user, logout, can } = useAuth()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState({ Report: true, Gestione: true })
  const [pendingCount, setPendingCount] = useState(0)
  const [accountBadge, setAccountBadge] = useState(0)

  useEffect(() => {
    if (!user || !can(['admin', 'ho'])) return
    const fetch = () => {
      api.get('/richieste-cancellazione/', { params: { stato: 'pending' } })
        .then(({ data }) => setPendingCount(data.length))
        .catch(() => {})
    }
    fetch()
    const timer = setInterval(fetch, 120000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    if (!user || !can(['admin', 'ho'])) return
    const fetch = () => {
      api.get('/account-badge/')
        .then(({ data }) => setAccountBadge(data.count || 0))
        .catch(() => {})
    }
    fetch()
    const timer = setInterval(fetch, 60000)
    return () => clearInterval(timer)
  }, [user])

  const toggleGroup = (name) =>
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }))

  const isGroupActive = (children) =>
    children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo">
        {collapsed
          ? <img src={kollegalogo} alt="Kollegas" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }} />
          : <img src={kollegalogo} alt="Kollegas" style={{ width: 130, objectFit: 'contain' }} />
        }
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {

          // ── Divider ──
          if (item.divider) {
            return <div key={`divider-${idx}`} className="nav-divider" />
          }

          // ── Group ──
          if (item.group) {
            const visibleChildren = item.children.filter(c => can(c.roles))
            if (visibleChildren.length === 0) return null
            const active = isGroupActive(visibleChildren)
            const open = openGroups[item.group] ?? true

            return (
              <div key={item.group} className="nav-group">
                <button
                  className={`nav-group-header ${active ? 'active' : ''}`}
                  onClick={() => !collapsed && toggleGroup(item.group)}
                  title={collapsed ? item.group : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="nav-label">{item.group}</span>
                      <span className={`nav-group-chevron ${open ? 'open' : ''}`}>
                        <span className="nav-chevron-icon">▼</span>
                      </span>
                    </>
                  )}
                </button>

                {(open || collapsed) && (
                  <div className={`nav-group-children ${collapsed ? 'collapsed-children' : ''}`}>
                    {visibleChildren.map(child => {
                      const hasAccBadge = child.accountBadge && accountBadge > 0 && can(['admin', 'ho'])
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end={child.to === '/'}
                          className={({ isActive }) =>
                            `nav-item nav-child ${isActive ? 'active' : ''}`
                          }
                          title={collapsed ? child.label : undefined}
                          style={{ position: 'relative' }}
                        >
                          <span className="nav-icon">{child.icon}</span>
                          {!collapsed && (
                            <span className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {child.label}
                              {hasAccBadge && (
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0, display: 'inline-block' }} />
                              )}
                            </span>
                          )}
                          {collapsed && hasAccBadge && (
                            <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // ── Flat item ──
          if (!can(item.roles)) return null
          const hasBadge = item.alertBadge && pendingCount > 0
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ position: 'relative' }}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && (
                <span className="nav-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.label}
                  {hasBadge && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#EF4444', flexShrink: 0, display: 'inline-block',
                    }} />
                  )}
                </span>
              )}
              {collapsed && hasBadge && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
                }} />
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && user && (
          <div className="user-info">
            <div className="user-avatar">{user.nome_completo?.[0] || '?'}</div>
            <div className="user-details">
              <span className="user-name">{user.nome_completo}</span>
              <span className="user-role">{user.livello_accesso.toUpperCase()}</span>
            </div>
          </div>
        )}
        <button
          className="logout-btn"
          onClick={() => window.confirm('Vuoi effettuare il logout?') && logout()}
          title="Logout"
        >🚪</button>
      </div>

      <button className="sidebar-toggle" onClick={onToggle}>
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  )
}
