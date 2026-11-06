import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SolaLettura from './SolaLettura'
import { useAuth } from '../../context/AuthContext'
import './AppLayout.css'

// I popup automatici (notifiche EHS, scadenze, avvisi, trasferimenti, cancellazioni,
// eventi) sono disattivati per tutti: anche quelli già generati non vengono più mostrati.
export default function AppLayout() {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div
        className={`mobile-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
      />
      {user?.sola_lettura && <SolaLettura user={user} />}
      <div className="main-area">
        <Topbar onMenuToggle={() => setMobileOpen(o => !o)} />
        <main className="page-wrapper">
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
