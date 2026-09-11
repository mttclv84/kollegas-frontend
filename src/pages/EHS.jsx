import { useState, useEffect, useCallback, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import EventoBadge from '../components/calendario/EventoBadge'
import EHSSessioneModal from '../components/ehs/EHSSessioneModal'
import EHSRichiesteList from '../components/ehs/EHSRichiesteList'
import EHSRichiestaFormModal from '../components/ehs/EHSRichiestaFormModal'
import EHSRegistriList from '../components/ehs/EHSRegistriList'
import './Calendario.css'
import './EHS.css'

export default function EHS() {
  const { can } = useAuth()
  const [tab, setTab] = useState('calendario')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventi, setEventi] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSessioneId, setSelectedSessioneId] = useState(null)
  const [showRichiestaForm, setShowRichiestaForm] = useState(false)
  const richiesteListRef = useRef(null)

  const anno = currentDate.getFullYear()
  const mese = currentDate.getMonth() + 1

  const fetchEventi = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ehs/calendario/', { params: { anno, mese } })
      setEventi(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [anno, mese])

  useEffect(() => {
    fetchEventi()
    // Aggiornamento automatico ogni 60 minuti: un refresh manuale della pagina
    // resta sempre disponibile per dati immediatamente aggiornati.
    const timer = setInterval(fetchEventi, 3600000)
    return () => clearInterval(timer)
  }, [fetchEventi])

  const [notificheRichieste, setNotificheRichieste] = useState([])
  const isFornitore = can(['fornitore'])

  useEffect(() => {
    if (!isFornitore) return
    const fetchNotifiche = () => {
      api.get('/ehs/notifiche-richiesta/').then(({ data }) => setNotificheRichieste(data)).catch(() => {})
    }
    fetchNotifiche()
    const timer = setInterval(fetchNotifiche, 3600000)
    return () => clearInterval(timer)
  }, [isFornitore])

  const handleTabClick = (nuovaTab) => {
    setTab(nuovaTab)
    if (nuovaTab === 'richieste' && notificheRichieste.length > 0) {
      Promise.all(notificheRichieste.map(n => api.patch(`/ehs/notifiche-richiesta/${n.id}/`).catch(() => {})))
        .then(() => setNotificheRichieste([]))
    }
  }

  const giorni = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })

  const eventsByDay = {}
  eventi.forEach(ev => {
    const k = ev.data
    if (!eventsByDay[k]) eventsByDay[k] = []
    eventsByDay[k].push(ev)
  })

  const metà = Math.ceil(giorni.length / 2)
  const colonnaA = giorni.slice(0, metà)
  const colonnaB = giorni.slice(metà)

  const isSunday = (d) => getDay(d) === 0

  const handleEventoClick = (e, ev) => {
    e.stopPropagation()
    if (!ev.is_ehs || !ev.ehs_sessione_id) return
    setSelectedSessioneId(ev.ehs_sessione_id)
  }

  const renderGiorno = (giorno) => {
    const key = format(giorno, 'yyyy-MM-dd')
    const eventiGiorno = eventsByDay[key] || []
    const isToday = key === format(new Date(), 'yyyy-MM-dd')
    const isSun = isSunday(giorno)

    return (
      <div key={key} className={`cal-day ${isSun ? 'festivo' : ''} ${isToday ? 'oggi' : ''}`}>
        <div className="cal-day-header">
          <span className="cal-day-num">{format(giorno, 'd')}</span>
          <span className="cal-day-name">{format(giorno, 'EEE', { locale: it })}</span>
        </div>
        <div className="cal-day-events">
          {eventiGiorno.map(ev => (
            <EventoBadge
              key={ev.id}
              evento={ev}
              clickable={ev.is_ehs}
              onClick={ev.is_ehs ? (e) => handleEventoClick(e, ev) : undefined}
              dimmed={!ev.is_ehs}
            />
          ))}
        </div>
      </div>
    )
  }

  const canCreaRichiesta = can(['store', 'admin', 'admin_ehs', 'ho'])

  return (
    <div className="ehs-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div className="ehs-tabs">
          <button
            className={`ehs-tab ${tab === 'calendario' ? 'active' : ''}`}
            onClick={() => handleTabClick('calendario')}
          >
            📅 Calendario
          </button>
          <button
            className={`ehs-tab ${tab === 'richieste' ? 'active' : ''}`}
            onClick={() => handleTabClick('richieste')}
            style={{ position: 'relative' }}
          >
            📋 Richieste
            {notificheRichieste.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, width: 10, height: 10,
                borderRadius: '50%', background: '#EF4444', border: '2px solid #fff',
              }} />
            )}
          </button>
          <button
            className={`ehs-tab ${tab === 'registri' ? 'active' : ''}`}
            onClick={() => handleTabClick('registri')}
          >
            📁 Registri
          </button>
        </div>
        {canCreaRichiesta && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowRichiestaForm(true)}>
            + Nuova richiesta
          </button>
        )}
      </div>

      {tab === 'calendario' ? (
        <div className="calendario-page">
          <div className="cal-main">
            <h2 className="ehs-cal-title">CALENDARIO EHS</h2>
            <div className="cal-header">
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
                ← Precedente
              </button>
              <h1 className="cal-month-title">
                {format(currentDate, 'MMMM yyyy', { locale: it }).replace(/^\w/, c => c.toUpperCase())}
              </h1>
              <button className="btn btn-ghost btn-sm" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
                Successivo →
              </button>
            </div>

            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="cal-grid">
                <div className="cal-column">
                  {colonnaA.map(renderGiorno)}
                </div>
                <div className="cal-divider" />
                <div className="cal-column">
                  {colonnaB.map(renderGiorno)}
                </div>
              </div>
            )}
          </div>

          <aside className="cal-sidebar">
            <div className="cal-legenda card">
              <div className="card-body">
                <h4 className="legenda-title">Legenda</h4>
                <div className="legenda-item">
                  <span className="legenda-dot" style={{ background: '#10B981' }} /> Evento EHS (cliccabile)
                </div>
                <div className="legenda-item">
                  <span className="legenda-dot" style={{ background: '#9CA3AF' }} /> Altre attività (sola vista)
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : tab === 'richieste' ? (
        <EHSRichiesteList ref={richiesteListRef} onSelect={setSelectedSessioneId} />
      ) : (
        <EHSRegistriList />
      )}

      {selectedSessioneId && (
        <EHSSessioneModal
          sessioneId={selectedSessioneId}
          onClose={() => setSelectedSessioneId(null)}
          onChanged={() => { fetchEventi(); richiesteListRef.current?.refresh() }}
        />
      )}

      {showRichiestaForm && (
        <EHSRichiestaFormModal
          onClose={() => setShowRichiestaForm(false)}
          onCreated={() => {
            setShowRichiestaForm(false)
            setTab('richieste')
            richiesteListRef.current?.refresh()
          }}
        />
      )}
    </div>
  )
}
