import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const TIPOLOGIE = [
  { value: 'ld',         label: 'L&D' },
  { value: 'recruiting', label: 'RECRUITING' },
  { value: 'ehs',        label: 'EHS' },
  { value: 'payroll',    label: 'PAYROLL' },
  { value: 'altro',      label: 'ALTRO' },
]

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
      padding: '16px 20px', flex: '1 1 140px', minWidth: 130,
    }}>
      <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function Stats() {
  const [attivitaList, setAttivitaList] = useState([])
  const [filterAttivita, setFilterAttivita] = useState('')
  const [filterTipologia, setFilterTipologia] = useState('')
  const [filterDa, setFilterDa] = useState('')
  const [filterA, setFilterA] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api.get('/attivita/').then(({ data }) => setAttivitaList(data.results || data)).catch(() => {})
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (filterAttivita) params.attivita = filterAttivita
    if (filterTipologia) params.tipologia = filterTipologia
    if (filterDa) params.data_da = filterDa
    if (filterA) params.data_a = filterA
    try {
      const { data: res } = await api.get('/stats/', { params })
      setData(res)
    } finally { setLoading(false) }
  }, [filterAttivita, filterTipologia, filterDa, filterA])

  useEffect(() => { fetchStats() }, [fetchStats])

  const reset = () => { setFilterAttivita(''); setFilterTipologia(''); setFilterDa(''); setFilterA('') }

  const handleExport = async () => {
    setExporting(true)
    const params = {}
    if (filterAttivita) params.attivita = filterAttivita
    if (filterTipologia) params.tipologia = filterTipologia
    if (filterDa) params.data_da = filterDa
    if (filterA) params.data_a = filterA
    try {
      const resp = await api.get('/stats/export/', { params, responseType: 'blob' })
      const url = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'stats_formazione.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const tot = data?.totale

  return (
    <div>
      <h1 className="page-title">Stats</h1>

      {/* Filtri */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
            <label className="form-label">Tipologia</label>
            <select className="form-control" value={filterTipologia} onChange={e => setFilterTipologia(e.target.value)}>
              <option value="">Tutte le tipologie</option>
              {TIPOLOGIE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 240, flex: 1 }}>
            <label className="form-label">Attività</label>
            <select className="form-control" value={filterAttivita} onChange={e => setFilterAttivita(e.target.value)}>
              <option value="">Tutte le attività</option>
              {attivitaList.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label className="form-label">Data da</label>
            <input type="date" className="form-control" value={filterDa} onChange={e => setFilterDa(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label className="form-label">Data a</label>
            <input type="date" className="form-control" value={filterA} onChange={e => setFilterA(e.target.value)} />
          </div>
          {(filterAttivita || filterTipologia || filterDa || filterA) && (
            <button className="btn btn-secondary" onClick={reset} style={{ marginBottom: 0 }}>Reset</button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting || !data}
            style={{ marginBottom: 0 }}
          >
            {exporting ? 'Esportazione...' : '⬇ Scarica Excel'}
          </button>
        </div>
      </div>

      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {!loading && tot && (
        <>
          {/* Totali in evidenza */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard label="Attività erogate" value={tot.num_edizioni} />
            <StatCard label="Ore erogate" value={`${tot.ore_erogate}h`} color="#1D4ED8" />
            <StatCard label="Partecipanti M" value={tot.maschi} color="#0369A1" sub={`${tot.ore_maschi}h persona`} />
            <StatCard label="Partecipanti F" value={tot.femmine} color="#BE185D" sub={`${tot.ore_femmine}h persona`} />
            {tot.ns > 0 && <StatCard label="N.S." value={tot.ns} color="#6B7280" sub="non specificato" />}
            <StatCard label="In Presenza" value={tot.presenza} sub="edizioni" />
            <StatCard label="Online" value={tot.online} sub="edizioni" />
            {tot.blended > 0 && <StatCard label="Blended" value={tot.blended} sub="edizioni" />}
          </div>

          {/* Tabella per attività */}
          {data.per_attivita.length === 0 ? (
            <div className="card">
              <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
                Nessuna attività trovata con i filtri selezionati.
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">Dettaglio per attività</div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Attività</th>
                      <th style={{ textAlign: 'center' }}>Attività</th>
                      <th style={{ textAlign: 'center' }}>Ore erogate</th>
                      <th style={{ textAlign: 'center' }}>Maschi</th>
                      <th style={{ textAlign: 'center' }}>Femmine</th>
                      {data.per_attivita.some(r => r.ns > 0) && (
                        <th style={{ textAlign: 'center' }}>N.S.</th>
                      )}
                      <th style={{ textAlign: 'center' }}>In Presenza</th>
                      <th style={{ textAlign: 'center' }}>Online</th>
                      {data.per_attivita.some(r => r.blended > 0) && (
                        <th style={{ textAlign: 'center' }}>Blended</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_attivita.map(r => (
                      <tr key={r.attivita_id}>
                        <td style={{ fontWeight: 500 }}>{r.attivita_nome}</td>
                        <td style={{ textAlign: 'center' }}>{r.num_edizioni}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#1D4ED8' }}>{r.ore_erogate}h</td>
                        <td style={{ textAlign: 'center', color: '#0369A1', fontWeight: 600 }}>
                          {r.maschi}
                          {r.ore_maschi > 0 && (
                            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>{r.ore_maschi}h</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#BE185D', fontWeight: 600 }}>
                          {r.femmine}
                          {r.ore_femmine > 0 && (
                            <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>{r.ore_femmine}h</div>
                          )}
                        </td>
                        {data.per_attivita.some(row => row.ns > 0) && (
                          <td style={{ textAlign: 'center', color: '#6B7280' }}>{r.ns || '—'}</td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          {r.presenza > 0 ? (
                            <span className="badge badge-neutral">{r.presenza}</span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.online > 0 ? (
                            <span className="badge badge-primary">{r.online}</span>
                          ) : '—'}
                        </td>
                        {data.per_attivita.some(row => row.blended > 0) && (
                          <td style={{ textAlign: 'center' }}>
                            {r.blended > 0 ? (
                              <span className="badge badge-violet">{r.blended}</span>
                            ) : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#F8FAFC', borderTop: '2px solid #E5E7EB' }}>
                      <td>Totale</td>
                      <td style={{ textAlign: 'center' }}>{tot.num_edizioni}</td>
                      <td style={{ textAlign: 'center', color: '#1D4ED8' }}>{tot.ore_erogate}h</td>
                      <td style={{ textAlign: 'center', color: '#0369A1' }}>
                        {tot.maschi}
                        {tot.ore_maschi > 0 && (
                          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>{tot.ore_maschi}h</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: '#BE185D' }}>
                        {tot.femmine}
                        {tot.ore_femmine > 0 && (
                          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>{tot.ore_femmine}h</div>
                        )}
                      </td>
                      {data.per_attivita.some(r => r.ns > 0) && (
                        <td style={{ textAlign: 'center', color: '#6B7280' }}>{tot.ns}</td>
                      )}
                      <td style={{ textAlign: 'center' }}>{tot.presenza}</td>
                      <td style={{ textAlign: 'center' }}>{tot.online}</td>
                      {data.per_attivita.some(r => r.blended > 0) && (
                        <td style={{ textAlign: 'center' }}>{tot.blended}</td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
