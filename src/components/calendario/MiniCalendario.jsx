import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'
import './MiniCalendario.css'

export default function MiniCalendario({ date, title, activeDays, onNavigate }) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 })
  const giorni = eachDayOfInterval({ start, end })
  const oggi = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="mini-cal card">
      <div className="mini-cal-header">
        <button className="mini-nav-btn" onClick={() => onNavigate(date)}>
          {title || format(date, 'MMMM yyyy', { locale: it }).replace(/^\w/, c => c.toUpperCase())}
        </button>
      </div>
      <div className="mini-cal-body">
        <div className="mini-weekdays">
          {['L','M','M','G','V','S','D'].map((d, i) => (
            <span key={i} className="mini-wd">{d}</span>
          ))}
        </div>
        <div className="mini-days">
          {giorni.map(g => {
            const key = format(g, 'yyyy-MM-dd')
            const isCurrentMonth = g.getMonth() === date.getMonth()
            const isSun = getDay(g) === 0
            const isToday = key === oggi
            const hasEvent = isCurrentMonth && activeDays?.has(key)
            return (
              <span
                key={key}
                className={`mini-day ${!isCurrentMonth ? 'other-month' : ''} ${isSun ? 'sunday' : ''} ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
                onClick={() => onNavigate(g)}
              >
                {format(g, 'd')}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
