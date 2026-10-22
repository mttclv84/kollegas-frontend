import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import EventoModal from '../components/calendario/EventoModal'
import { useNavigate } from 'react-router-dom'
import EventoBadge, { TIPOLOGIA_COLORS, ROSSO_FUOCO_EHS } from '../components/calendario/EventoBadge'
import '../components/calendario/EventoModal.css'
import { isAulaChiusa } from '../utils/aule'
import MiniCalendario from '../components/calendario/MiniCalendario'
import './Calendario.css'

const DIPARTIMENTI = [
  ['ld', 'L&D'], ['recruiting', 'Recruiting'], ['payroll', 'Payroll'], ['altro', 'Altro'],
]

export default function Calendario() {
  const { can } = useAuth()
  const navigate = useNavigate()
  // L'utente Area visualizza soltanto: non crea formazioni.
  const canEdit = can(['admin', 'admin_ehs', 'ho'])
  const canAreaEHS = can(['admin', 'admin_ehs', 'ho', 'store', 'base', 'fornitore'])
  const isAdmin = can(['admin'])

  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventi, setEventi] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedEvento, setSelectedEvento] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'create' | 'detail'
  const [aulaEHS, setAulaEHS] = useState(null)
  const [activeDaysPrev, setActiveDaysPrev] = useState(new Set())
  const [activeDaysNext, setActiveDaysNext] = useState(new Set())
  const [eccezioni, setEccezioni] = useState({}) // { 'yyyy-MM-dd': nome_evento }

  const anno = currentDate.getFullYear()
  const mese = currentDate.getMonth() + 1

  const fetchEventi = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/eventi/', { params: { anno, mese } })
      setEventi(data.results || data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [anno, mese])

  useEffect(() => { fetchEventi() }, [fetchEventi])

  useEffect(() => {
    api.get('/eccezioni/', { params: { anno, mese } })
      .then(({ data }) => {
        const map = {}
        data.forEach(e => { map[e.data] = e.nome_evento })
        setEccezioni(map)
      })
      .catch(() => {})
  }, [anno, mese])

  useEffect(() => {
    const prev = subMonths(currentDate, 1)
    const next = addMonths(currentDate, 1)
    api.get('/eventi/', { params: { anno: prev.getFullYear(), mese: prev.getMonth() + 1 } })
      .then(({ data }) => setActiveDaysPrev(new Set((data.results || data).map(ev => ev.data))))
      .catch(() => {})
    api.get('/eventi/', { params: { anno: next.getFullYear(), mese: next.getMonth() + 1 } })
      .then(({ data }) => setActiveDaysNext(new Set((data.results || data).map(ev => ev.data))))
      .catch(() => {})
  }, [currentDate])

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

  const handleDayClick = (giorno) => {
    setSelectedDay(giorno)
    if (canEdit) {
      setSelectedEvento(null)
      setModalMode('create')
    }
  }

  // Ogni evento è aperto all'iscrizione da parte di tutti gli store. Le formazioni
  // EHS qui sono solo un promemoria: si gestiscono nell'area EHS dedicata.
  const handleEventoClick = (e, evento) => {
    e.stopPropagation()
    if (evento.is_ehs) { setAulaEHS(evento); return }
    setSelectedEvento(evento)
    setModalMode('detail')
  }

  // Aula chiusa (oltre 7 giorni): per tutti tranne l'Admin solo info e partecipanti.
  const solaLettura = !isAdmin && isAulaChiusa(selectedEvento?.data)

  const handleModalClose = () => {
    setModalMode(null)
    setSelectedEvento(null)
  }

  const handleSaved = () => {
    handleModalClose()
    fetchEventi()
  }

  const renderGiorno = (giorno) => {
    const key = format(giorno, 'yyyy-MM-dd')
    const eventiGiorno = eventsByDay[key] || []
    const isToday = key === format(new Date(), 'yyyy-MM-dd')
    const isSun = isSunday(giorno)
    const eccezione = eccezioni[key]

    return (
      <div
        key={key}
        className={`cal-day ${isSun ? 'festivo' : ''} ${isToday ? 'oggi' : ''} ${canEdit ? 'clickable' : ''}`}
        onClick={() => handleDayClick(giorno)}
      >
        <div className="cal-day-header">
          <span className="cal-day-num">{format(giorno, 'd')}</span>
          <span className="cal-day-name">{format(giorno, 'EEE', { locale: it })}</span>
          {eccezione && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
              <span style={{ color: '#EF4444', fontSize: 8, lineHeight: 1 }}>●</span>
              <span style={{ fontSize: 9, color: '#EF4444', fontWeight: 600, letterSpacing: 0 }}>{eccezione}</span>
            </span>
          )}
        </div>
        <div className="cal-day-events">
          {eventiGiorno.map(ev => (
            <EventoBadge
              key={ev.id}
              evento={ev}
              onClick={(e) => handleEventoClick(e, ev)}
              dimmed={isAulaChiusa(ev.data)}
              ehsRidotto={ev.is_ehs}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="calendario-page">
      <div className="cal-main">
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
        <MiniCalendario
          date={subMonths(currentDate, 1)}
          activeDays={activeDaysPrev}
          onNavigate={setCurrentDate}
        />
        <MiniCalendario
          date={addMonths(currentDate, 1)}
          activeDays={activeDaysNext}
          onNavigate={setCurrentDate}
        />
        <div className="cal-legenda card">
          <div className="card-body">
            <h4 className="legenda-title">Legenda</h4>
            <div className="legenda-item">
              <span className="legenda-dot festivo-color" /> Domenica
            </div>
            <div className="legenda-item">
              <span className="legenda-dot oggi-color" /> Oggi
            </div>
            {/* Colore dell'evento in base al dipartimento che lo pubblica */}
            <h4 className="legenda-title" style={{ marginTop: 12 }}>Dipartimenti</h4>
            {DIPARTIMENTI.map(([tipologia, nome]) => (
              <div key={tipologia} className="legenda-item">
                <span className="legenda-dot" style={{ background: TIPOLOGIA_COLORS[tipologia] }} /> {nome}
              </div>
            ))}
            <div className="legenda-item">
              <span className="legenda-dot" style={{ background: '#F97316' }} /> GWU RA-TM
            </div>
            <div className="legenda-item">
              <span className="legenda-dot" style={{ background: '#F3F4F6', border: `2px solid ${ROSSO_FUOCO_EHS}` }} /> EHS (area dedicata)
            </div>
          </div>
        </div>
      </aside>

      {modalMode && (
        <EventoModal
          mode={modalMode}
          selectedDay={selectedDay}
          evento={selectedEvento}
          onClose={handleModalClose}
          onSaved={handleSaved}
          canEdit={canEdit && !solaLettura}
          solaLettura={solaLettura}
        />
      )}

      {aulaEHS && (
        <div className="modal-overlay" onClick={() => setAulaEHS(null)}>
          <div className="modal-box" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{ width: 48, height: 48, margin: '0 auto 12px', borderRadius: '50%', border: `3px solid ${ROSSO_FUOCO_EHS}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: ROSSO_FUOCO_EHS }}>EHS</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>Formazione EHS</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#4B5563' }}>Entra nell'area dedicata.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setAulaEHS(null)}>Chiudi</button>
                {canAreaEHS && (
                  <button className="btn btn-primary" onClick={() => navigate('/ehs')}>Vai all'area EHS</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
