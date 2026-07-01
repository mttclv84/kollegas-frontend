import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import RichiestaModal from '../components/ui/RichiestaModal'

const MESI_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const STATO_BADGE = { iscritto: 'primary', partecipato: 'success', assente: 'danger' }
const STATO_LABELS = { iscritto: 'Iscritto', partecipato: 'Partecipato', assente: 'Assente' }

function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${MESI_IT[parseInt(m) - 1]} ${y}`
}

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr) - today) / 86400000)
}

export default function IscrizioniStore() {
  const [iscrizioni, setIscrizioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAnno, setFiltroAnno] = useState('')
  const [filtroMese, setFiltroMese] = useState('')
  const [filtroNome, setFiltroNome] = useState('')
  const [richiestaModal, setRichiestaModal] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/iscrizioni/')
      const list = (data.results || data)
        .slice()
        .sort((a, b) => (b.evento_data || '').localeCompare(a.evento_data || ''))
      setIscrizioni(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const availableYears = useMemo(() => {
    const keys = [...new Set(iscrizioni.map(i => i.evento_data?.slice(0, 4)).filter(Boolean))]
    return keys.sort((a, b) => b.localeCompare(a))
  }, [iscrizioni])

  const availableMonths = useMemo(() => {
    const source = filtroAnno
      ? iscrizioni.filter(i => i.evento_data?.startsWith(filtroAnno))
      : iscrizioni
    const keys = [...new Set(source.map(i => i.evento_data?.slice(0, 7)).filter(Boolean))]
    return keys.sort((a, b) => b.localeCompare(a))
  }, [iscrizioni, filtroAnno])

  const grouped = useMemo(() => {
    let list = iscrizioni

    if (filtroNome.trim()) {
      const q = filtroNome.toLowerCase()
      list = list.filter(i => `${i.user_cognome} ${i.user_nome}`.toLowerCase().includes(q))
    }
    if (filtroAnno) {
      list = list.filter(i => i.evento_data?.startsWith(filtroAnno))
    }
    if (filtroMese) {
      list = list.filter(i => i.evento_data?.startsWith(filtroMese))
    }

    const groups = {}
    for (const isc of list) {
      const key = isc.evento_data?.slice(0, 7)
      if (!key) continue
      if (!groups[key]) groups[key] = []
      groups[key].push(isc)
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [iscrizioni, filtroNome, filtroMese])

  const handleElimina = async (iscrizioneId) => {
    if (!window.confirm('Rimuovere questa iscrizione?')) return
    try {
      await api.delete(`/iscrizioni/${iscrizioneId}/`)
      toast.success('Iscrizione rimossa.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  return (
    <div>
      {richiestaModal && (
        <RichiestaModal
          iscrizione={richiestaModal}
          onClose={() => setRichiestaModal(null)}
          onSuccess={() => { setRichiestaModal(null); fetchData() }}
        />
      )}

      <h1 className="page-title">Iscrizioni</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 120 }}>
              <label className="form-label">Anno</label>
              <select
                className="form-control"
                value={filtroAnno}
                onChange={e => { setFiltroAnno(e.target.value); setFiltroMese('') }}
              >
                <option value="">— Tutti —</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="form-label">Mese</label>
              <select className="form-control" value={filtroMese} onChange={e => setFiltroMese(e.target.value)}>
                <option value="">— Tutti i mesi —</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
              <label className="form-label">Cerca per nominativo</label>
              <input
                className="form-control"
                placeholder="Cognome o nome..."
                value={filtroNome}
                onChange={e => setFiltroNome(e.target.value)}
              />
            </div>
            {(filtroAnno || filtroMese || filtroNome) && (
              <button className="btn btn-secondary" onClick={() => { setFiltroAnno(''); setFiltroMese(''); setFiltroNome('') }}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : grouped.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>
            Nessuna iscrizione trovata.
          </div>
        </div>
      ) : grouped.map(([monthKey, items]) => (
        <div key={monthKey} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {monthLabel(monthKey)}
            <span style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 12, textTransform: 'none' }}>
              {items.length} iscrizioni
            </span>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Attività</th>
                    <th>Collaboratore</th>
                    <th>Ore</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => {
                    const days = daysUntil(i.evento_data)
                    const isPast = days < 0
                    const within20 = days >= 0 && days < 20
                    const hasPending = Boolean(i.richiesta_pendente_id)

                    let action = null
                    if (hasPending) {
                      action = (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px',
                          borderRadius: 4, background: '#FEF3C7', color: '#92400E',
                          border: '1px solid #F59E0B', display: 'inline-block',
                        }}>⏳ In attesa di cancellazione da admin</span>
                      )
                    } else if (isPast) {
                      action = (
                        <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                          Evento concluso.
                        </span>
                      )
                    } else if (within20) {
                      action = (
                        <button
                          className="btn btn-sm"
                          style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}
                          onClick={() => setRichiestaModal(i)}
                        >⚠ Richiedi cancellazione</button>
                      )
                    } else {
                      action = (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleElimina(i.id)}
                        >Disiscrivi</button>
                      )
                    }

                    return (
                      <tr key={i.id}>
                        <td style={{ whiteSpace: 'nowrap', color: '#374151' }}>{i.evento_data}</td>
                        <td style={{ fontWeight: 600, color: '#111827' }}>{i.attivita_nome}</td>
                        <td>{i.user_cognome} {i.user_nome}</td>
                        <td>{i.evento_ore != null ? `${i.evento_ore}h` : '—'}</td>
                        <td>
                          <span className={`badge badge-${STATO_BADGE[i.stato] || 'neutral'}`}>
                            {STATO_LABELS[i.stato] || i.stato}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{action}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
