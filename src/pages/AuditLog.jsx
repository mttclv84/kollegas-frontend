import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AZIONE_CFG = {
  crea:       { label: 'Creazione',       bg: '#D1FAE5', color: '#065F46' },
  modifica:   { label: 'Modifica',        bg: '#DBEAFE', color: '#1E40AF' },
  elimina:    { label: 'Eliminazione',    bg: '#F3E8FF', color: '#6B21A8' },
  disattiva:  { label: 'Disattivazione',  bg: '#FEE2E2', color: '#991B1B' },
  riattiva:   { label: 'Riattivazione',   bg: '#FEF3C7', color: '#92400E' },
}

const TIPO_LABEL = {
  utente:           'Utente',
  percorso_crescita:'Percorso crescita',
  store:            'Store',
  ruolo:            'Ruolo',
  iscrizione:       'Iscrizione',
  evento:           'Evento',
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function AzioneBadge({ azione }) {
  const cfg = AZIONE_CFG[azione] || { label: azione, bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 5, padding: '2px 9px',
      fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

export default function AuditLog() {
  const [filters, setFilters] = useState({ search: '', azione: '', tipo: '', data_da: '', data_a: '' })
  const [applied, setApplied] = useState({ search: '', azione: '', tipo: '', data_da: '', data_a: '' })
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback((f) => {
    setLoading(true)
    const params = {}
    if (f.search)  params.search  = f.search
    if (f.azione)  params.azione  = f.azione
    if (f.tipo)    params.tipo    = f.tipo
    if (f.data_da) params.data_da = f.data_da
    if (f.data_a)  params.data_a  = f.data_a
    api.get('/users/audit/', { params })
      .then(({ data }) => setLogs(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(applied) }, [applied, load])

  const apply = () => setApplied({ ...filters })
  const reset = () => {
    const empty = { search: '', azione: '', tipo: '', data_da: '', data_a: '' }
    setFilters(empty)
    setApplied(empty)
  }

  const hasFilter = Object.values(filters).some(Boolean)

  const tipi = [...new Set(logs.map(l => l.target_tipo).filter(Boolean))].sort()

  return (
    <div>
      <h1 className="page-title">Audit Log</h1>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 180px 150px 150px auto', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cerca</label>
              <input
                className="form-control"
                placeholder="Nome utente, oggetto, dettaglio..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && apply()}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Azione</label>
              <select className="form-control" value={filters.azione} onChange={e => setFilters(f => ({ ...f, azione: e.target.value }))}>
                <option value="">Tutte</option>
                {Object.entries(AZIONE_CFG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo oggetto</label>
              <select className="form-control" value={filters.tipo} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
                <option value="">Tutti</option>
                {tipi.map(t => <option key={t} value={t}>{TIPO_LABEL[t] || t}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Dal</label>
              <input type="date" className="form-control" value={filters.data_da} onChange={e => setFilters(f => ({ ...f, data_da: e.target.value }))} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Al</label>
              <input type="date" className="form-control" value={filters.data_a} onChange={e => setFilters(f => ({ ...f, data_a: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={apply}>Cerca</button>
              {hasFilter && <button className="btn btn-secondary" onClick={reset}>Reset</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
            Nessuna operazione trovata.
          </div>
        ) : (
          <>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Operazioni</span>
              <span style={{ fontWeight: 400, fontSize: 13, color: '#6B7280' }}>
                {logs.length} risultati{logs.length === 500 ? ' (limite massimo)' : ''}
              </span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Data / Ora</th>
                    <th>Eseguita da</th>
                    <th>Azione</th>
                    <th>Tipo</th>
                    <th>Oggetto</th>
                    <th>Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', color: '#6B7280', fontSize: 12.5 }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {log.actor_nome || <span style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td><AzioneBadge azione={log.azione} /></td>
                      <td style={{ color: '#6B7280', fontSize: 13 }}>
                        {TIPO_LABEL[log.target_tipo] || log.target_tipo}
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                          title={log.target_repr || ''}>
                        {log.target_repr || <span style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td style={{ color: '#6B7280', fontSize: 12.5, maxWidth: 300 }}>
                        {log.dettaglio || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
