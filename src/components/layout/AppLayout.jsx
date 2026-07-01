import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/client'
import './AppLayout.css'

function NotifichePopup({ notifiche, onClose }) {
  if (!notifiche || notifiche.length === 0) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 32, maxWidth: 520, width: '92%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🔔</span>
          <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Aggiornamenti sulle tue richieste</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
          {notifiche.map(n => (
            <div key={n.id} style={{
              borderRadius: 8, padding: '12px 16px',
              border: `1px solid ${n.stato === 'approvata' ? '#6EE7B7' : '#FCA5A5'}`,
              background: n.stato === 'approvata' ? '#F0FDF4' : '#FFF5F5',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: n.stato === 'approvata' ? '#D1FAE5' : '#FEE2E2',
                  color: n.stato === 'approvata' ? '#065F46' : '#991B1B',
                }}>
                  {n.stato === 'approvata' ? '✓ CANCELLAZIONE APPROVATA' : '✕ RIFIUTATA'}
                </span>
              </div>
              <div style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>
                {n.snap_partecipante_nome || n.partecipante_nome}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {n.snap_attivita_nome || n.attivita_nome}
                {(n.snap_evento_data || n.evento_data) && (
                  <span> — {n.snap_evento_data || n.evento_data}</span>
                )}
              </div>
              {n.stato === 'approvata' && (
                <div style={{ fontSize: 12, color: '#065F46', marginTop: 4 }}>
                  Il partecipante è stato rimosso dall'evento.
                </div>
              )}
              {n.processed_by_nome && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  Elaborata da {n.processed_by_nome}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 20, width: '100%' }}
          onClick={onClose}
        >
          Ho capito
        </button>
      </div>
    </div>
  )
}

function NotificaEventoPopup({ notifica, onOk }) {
  if (!notifica) return null
  const annullata = notifica.tipo === 'annullata'
  const dataFmt = notifica.snap_data
    ? new Date(notifica.snap_data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: annullata ? '#FFF5F5' : '#fff',
        border: annullata ? '2px solid #FCA5A5' : 'none',
        borderRadius: 14, padding: 40, maxWidth: 480, width: '92%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{annullata ? '❌' : '📅'}</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, color: annullata ? '#DC2626' : '#111827', textTransform: 'uppercase', letterSpacing: 1 }}>
          {annullata ? 'Attività Annullata' : 'Nuova Attività'}
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>
          {annullata ? 'È stata annullata l\'attività:' : 'È stata inserita in calendario una nuova attività:'}
        </p>
        <div style={{
          background: annullata ? '#FEE2E2' : '#F8FAFC',
          border: `1px solid ${annullata ? '#FCA5A5' : '#E2E8F0'}`,
          borderRadius: 10, padding: '16px 20px', marginBottom: 28, textAlign: 'left',
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: annullata ? '#991B1B' : '#111827', marginBottom: 8 }}>
            {notifica.snap_attivita_nome}
          </div>
          <div style={{ fontSize: 14, color: '#374151' }}>📆 {dataFmt}</div>
          {notifica.snap_location && notifica.snap_location !== '—' && (
            <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>📍 {notifica.snap_location}</div>
          )}
          {annullata && notifica.snap_motivazione && (
            <div style={{ fontSize: 13, color: '#B91C1C', marginTop: 10, fontStyle: 'italic' }}>
              Motivazione: {notifica.snap_motivazione}
            </div>
          )}
          {notifica.snap_creato_da && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>
              {annullata ? 'Annullato da' : 'Creato da'} {notifica.snap_creato_da}
            </div>
          )}
        </div>
        <button className="btn btn-primary" style={{ minWidth: 120, fontSize: 15 }} onClick={onOk}>
          OK
        </button>
      </div>
    </div>
  )
}

function NotificaTrasferimentoPopup({ notifica, onVisto }) {
  if (!notifica) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 40, maxWidth: 480, width: '92%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔄</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, color: '#111827' }}>Nuovo trasferimento</h2>
        <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.6, margin: '0 0 28px' }}>
          <strong>{notifica.snap_nome_store_origine}</strong> ha appena trasferito{' '}
          <strong>{notifica.snap_nome_utente}</strong> presso il tuo negozio.
        </p>
        <button className="btn btn-primary" style={{ minWidth: 140, fontSize: 15 }} onClick={onVisto}>
          OK
        </button>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { user, can } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifiche, setNotifiche] = useState([])
  const [notificheTrasferimento, setNotificheTrasferimento] = useState([])
  const [notificheEvento, setNotificheEvento] = useState([])

  useEffect(() => {
    if (!user || !can(['store'])) return
    api.get('/richieste-cancellazione/notifiche/')
      .then(({ data }) => { if (data.length > 0) setNotifiche(data) })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user || !can(['store'])) return
    const fetch = () => {
      api.get('/notifiche-trasferimento/')
        .then(({ data }) => { if (data.length > 0) setNotificheTrasferimento(data) })
        .catch(() => {})
    }
    fetch()
    const timer = setInterval(fetch, 30000)
    return () => clearInterval(timer)
  }, [user])

  const handleCloseNotifiche = async () => {
    try { await api.post('/richieste-cancellazione/notifiche/') } catch {}
    setNotifiche([])
  }

  useEffect(() => {
    if (!user || !can(['store', 'ho', 'admin'])) return
    const fetch = () => {
      api.get('/notifiche-evento/')
        .then(({ data }) => { if (data.length > 0) setNotificheEvento(data) })
        .catch(() => {})
    }
    fetch()
    const timer = setInterval(fetch, 30000)
    return () => clearInterval(timer)
  }, [user])

  const handleOkEvento = async () => {
    const notifica = notificheEvento[0]
    if (!notifica) return
    try { await api.patch(`/notifiche-evento/${notifica.id}/`) } catch {}
    setNotificheEvento(prev => prev.slice(1))
  }

  const handleVistoTrasferimento = async () => {
    const notifica = notificheTrasferimento[0]
    if (!notifica) return
    try { await api.patch(`/notifiche-trasferimento/${notifica.id}/`) } catch {}
    setNotificheTrasferimento(prev => prev.slice(1))
  }

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <NotifichePopup notifiche={notifiche} onClose={handleCloseNotifiche} />
      <NotificaEventoPopup
        notifica={notificheEvento[0] || null}
        onOk={handleOkEvento}
      />
      <NotificaTrasferimentoPopup
        notifica={notificheTrasferimento[0] || null}
        onVisto={handleVistoTrasferimento}
      />
      <div
        className={`mobile-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
      />
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
