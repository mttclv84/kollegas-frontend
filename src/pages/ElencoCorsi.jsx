import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const TIPOLOGIE = [
  { value: 'ld',         label: 'L&D' },
  { value: 'recruiting', label: 'RECRUITING' },
  { value: 'ehs',        label: 'EHS' },
  { value: 'payroll',    label: 'PAYROLL' },
  { value: 'altro',      label: 'ALTRO' },
]
const TIPOLOGIA_LABEL = Object.fromEntries(TIPOLOGIE.map(t => [t.value, t.label]))

export default function ElencoCorsi() {
  const navigate = useNavigate()

  const [attivitaList, setAttivitaList] = useState([])
  const [storeList, setStoreList] = useState([])
  const [eventi, setEventi] = useState([])
  const [loading, setLoading] = useState(false)

  // which filter button is active: 'data' | 'nome' | 'location' | null
  const [mode, setMode] = useState(null)
  const [filterValue, setFilterValue] = useState('')

  // preload catalogo e stores
  useEffect(() => {
    api.get('/attivita/').then(({ data }) => {
      const list = (data.results || data).slice().sort((a, b) => a.nome.localeCompare(b.nome))
      setAttivitaList(list)
    })
    api.get('/stores/').then(({ data }) => {
      const list = (data.results || data).slice().sort((a, b) => {
        const ca = parseInt(a.codice_store) || 9999
        const cb = parseInt(b.codice_store) || 9999
        return ca - cb
      })
      setStoreList(list)
    })
  }, [])

  // fetch events whenever mode+value change (only if value is set)
  useEffect(() => {
    if (!mode || !filterValue) { setEventi([]); return }
    setLoading(true)
    const params = {}
    if (mode === 'data') { params.data_da = filterValue; params.data_a = filterValue }
    if (mode === 'nome') { params.attivita = filterValue }
    if (mode === 'location') { params.location_store = filterValue }
    if (mode === 'tipologia') { params.tipologia = filterValue }
    api.get('/eventi/', { params })
      .then(({ data }) => setEventi((data.results || data).sort((a, b) => b.data.localeCompare(a.data))))
      .finally(() => setLoading(false))
  }, [mode, filterValue])

  const selectMode = (m) => {
    if (mode === m) { setMode(null); setFilterValue('') }
    else { setMode(m); setFilterValue('') }
  }

  const btnStyle = (m) => ({
    ...m === mode
      ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
      : {}
  })

  return (
    <div>
      <h1 className="page-title">Elenco Attività</h1>

      {/* Filter buttons */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <button
              className="btn btn-ghost"
              style={btnStyle('data')}
              onClick={() => selectMode('data')}
            >
              📅 Cerca per data
            </button>
            <button
              className="btn btn-ghost"
              style={btnStyle('nome')}
              onClick={() => selectMode('nome')}
            >
              📚 Cerca per nome
            </button>
            <button
              className="btn btn-ghost"
              style={btnStyle('location')}
              onClick={() => selectMode('location')}
            >
              📍 Cerca per location
            </button>
            <button
              className="btn btn-ghost"
              style={btnStyle('tipologia')}
              onClick={() => selectMode('tipologia')}
            >
              🏷 Cerca per tipologia
            </button>

            {mode === 'data' && (
              <input
                type="date"
                className="form-control"
                style={{ maxWidth: 180 }}
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                autoFocus
              />
            )}

            {mode === 'nome' && (
              <select
                className="form-control"
                style={{ minWidth: 280 }}
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                autoFocus
              >
                <option value="">— Seleziona corso —</option>
                {attivitaList.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            )}

            {mode === 'location' && (
              <select
                className="form-control"
                style={{ minWidth: 260 }}
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                autoFocus
              >
                <option value="">— Seleziona store —</option>
                {storeList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.codice_store ? `${s.codice_store} — ` : ''}{s.nome}
                  </option>
                ))}
              </select>
            )}

            {mode === 'tipologia' && (
              <select
                className="form-control"
                style={{ minWidth: 200 }}
                value={filterValue}
                onChange={e => setFilterValue(e.target.value)}
                autoFocus
              >
                <option value="">— Seleziona tipologia —</option>
                {TIPOLOGIE.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            )}

            {mode && (
              <button className="btn btn-secondary" onClick={() => { setMode(null); setFilterValue('') }}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results — only shown when a filter value is selected */}
      {!mode && (
        <div className="card">
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
            Seleziona un filtro per visualizzare i corsi.
          </div>
        </div>
      )}

      {mode && !filterValue && (
        <div className="card">
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
            {mode === 'data' && 'Seleziona una data per vedere i corsi di quel giorno.'}
            {mode === 'nome' && 'Seleziona un corso dal menu per vedere le edizioni disponibili.'}
            {mode === 'location' && 'Seleziona uno store per vedere i corsi organizzati lì.'}
            {mode === 'tipologia' && 'Seleziona una tipologia per vedere tutti i corsi di quella categoria.'}
          </div>
        </div>
      )}

      {mode && filterValue && (
        <div className="card">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Corso</th>
                    <th>Docente/Host</th>
                    <th>Tipo Host</th>
                    <th>Orario</th>
                    <th>Location</th>
                    <th>Iscritti</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {eventi.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF', padding: 32 }}>
                        Nessun corso trovato
                      </td>
                    </tr>
                  ) : eventi.map(ev => (
                    <tr key={ev.id}>
                      <td>{ev.data}</td>
                      <td>
                        <strong>{ev.attivita_nome}</strong>
                        <br />
                        <span className="badge badge-primary" style={{ marginTop: 2 }}>{TIPOLOGIA_LABEL[ev.attivita_tipologia] || ev.attivita_tipologia}</span>
                      </td>
                      <td>{ev.host_nome}</td>
                      <td>
                        <span className={`badge badge-${ev.host_tipo === 'interno' ? 'success' : 'neutral'}`}>
                          {ev.host_tipo}
                        </span>
                      </td>
                      <td>{ev.ora_inizio?.slice(0, 5)} - {ev.ora_fine?.slice(0, 5)}</td>
                      <td>{ev.location_display}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {ev.iscritti_count}
                          {ev.max_partecipanti > 0 ? ` su ${ev.max_partecipanti}` : ''}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/iscrizioni?evento=${ev.id}`)}>
                          Partecipanti
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
