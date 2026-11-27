import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const AZIONE_CFG = {
  crea:       { label: 'Creazione',       bg: '#D1FAE5', color: '#065F46' },
  modifica:   { label: 'Modifica',        bg: '#DBEAFE', color: '#1E40AF' },
  elimina:    { label: 'Eliminazione',    bg: '#F3E8FF', color: '#6B21A8' },
  disattiva:  { label: 'Disattivazione',  bg: '#FEE2E2', color: '#991B1B' },
  riattiva:   { label: 'Riattivazione',   bg: '#FEF3C7', color: '#92400E' },
  accesso:    { label: 'Accesso',         bg: '#F3F4F6', color: '#374151' },
  accesso_fallito: { label: 'Accesso non riuscito', bg: '#FFE4E6', color: '#9F1239' },
  download:   { label: 'Download',        bg: '#E0F2FE', color: '#075985' },
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

const PER_PAGINA = 30
// Tabelle compatte: tutto visibile senza scorrere a destra e sinistra.
const STILE_COMPATTO = `
  .audit-compatto table { width: 100%; table-layout: fixed; font-size: 12.5px; }
  .audit-compatto th { padding: 7px 8px !important; font-size: 11px; white-space: normal !important; }
  .audit-compatto td { padding: 6px 8px !important; vertical-align: top !important; white-space: normal !important;
    overflow-wrap: anywhere; }
`

const dataBreve = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—'

function ElencoPersone({ titolo, persone, extra }) {
  if (!persone.length) return null
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{titolo} ({persone.length})</summary>
      <div className="table-wrapper" style={{ marginTop: 8, maxHeight: 320, overflow: 'auto' }}>
        <table>
          <thead><tr><th>Nome</th><th>Livello</th><th>Negozio</th>{extra && <th>{extra.titolo}</th>}</tr></thead>
          <tbody>
            {persone.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nome}</td>
                <td>{p.livello}</td>
                <td>{p.negozio || '—'}</td>
                {extra && <td>{extra.valore(p)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// Riepilogo per seguire il lancio: chi è entrato, chi mai, chi ha ancora la password temporanea.
function Adozione() {
  const [dati, setDati] = useState(null)
  useEffect(() => { api.get('/users/audit/adozione/').then(({ data }) => setDati(data)).catch(() => setDati(false)) }, [])
  if (dati === null) return <div className="card" style={{ marginBottom: 20 }}><div className="card-body"><div className="spinner" /></div></div>
  if (!dati) return null
  const t = dati.totale
  const perc = (n, d) => d ? `${Math.round((n / d) * 100)}%` : '—'
  const COLONNE = [
    ['totale', 'Profili con accesso'], ['entrati', 'Entrati almeno una volta'], ['mai_entrati', 'Mai entrati'],
    ['attivi_7', 'Attivi ultimi 7 gg'], ['attivi_30', 'Attivi ultimi 30 gg'], ['password_temporanea', 'Password temporanea'],
  ]
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        Adozione di Kollegas
        <span className="badge badge-neutral">{t.entrati} su {t.totale} entrati ({perc(t.entrati, t.totale)})</span>
      </div>
      <div className="card-body">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Livello</th>{COLONNE.map(([k, l]) => <th key={k} style={{ textAlign: 'right' }}>{l}</th>)}</tr></thead>
            <tbody>
              {dati.livelli.map(r => (
                <tr key={r.livello}>
                  <td style={{ fontWeight: 600 }}>{r.etichetta}</td>
                  {COLONNE.map(([k]) => (
                    <td key={k} style={{ textAlign: 'right', color: k === 'mai_entrati' && r[k] ? '#B91C1C' : undefined }}>
                      {r[k]}{k === 'entrati' && <span style={{ color: '#9CA3AF', fontSize: 12 }}> ({perc(r.entrati, r.totale)})</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: '#F9FAFB' }}>
                <td>Totale</td>
                {COLONNE.map(([k]) => <td key={k} style={{ textAlign: 'right' }}>{t[k]}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <ElencoPersone titolo="Mai entrati" persone={dati.mai_entrati} />
        <ElencoPersone titolo="Password temporanea ancora da cambiare" persone={dati.password_temporanea}
          extra={{ titolo: 'Scadenza', valore: p => p.scaduta
            ? <span style={{ color: '#B91C1C', fontWeight: 600 }}>Scaduta il {dataBreve(p.scadenza)}</span>
            : dataBreve(p.scadenza) }} />
      </div>
    </div>
  )
}

export default function AuditLog() {
  const [filters, setFilters] = useState({ search: '', azione: '', tipo: '', data_da: '', data_a: '' })
  const [applied, setApplied] = useState({ search: '', azione: '', tipo: '', data_da: '', data_a: '' })
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [pagina, setPagina]   = useState(1)

  const load = useCallback((f) => {
    setLoading(true)
    const params = {}
    if (f.search)  params.search  = f.search
    if (f.azione)  params.azione  = f.azione
    if (f.tipo)    params.tipo    = f.tipo
    if (f.data_da) params.data_da = f.data_da
    if (f.data_a)  params.data_a  = f.data_a
    api.get('/users/audit/', { params })
      .then(({ data }) => { setLogs(data); setPagina(1) })
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
  const pagine = Math.max(1, Math.ceil(logs.length / PER_PAGINA))
  const visibili = logs.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA)

  return (
    <div className="audit-compatto">
      <style>{STILE_COMPATTO}</style>
      <h1 className="page-title">Audit Log</h1>

      <Adozione />

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'flex-end' }}>
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
                {logs.length} risultati{logs.length === 2000 ? ' (ultime 2000: usa i filtri per restringere)' : ''}
                {pagine > 1 && ` · pagina ${pagina} di ${pagine}`}
              </span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '11%' }}>Data / Ora</th>
                    <th style={{ width: '15%' }}>Eseguita da</th>
                    <th style={{ width: '12%' }}>Azione</th>
                    <th style={{ width: '12%' }}>Tipo</th>
                    <th style={{ width: '18%' }}>Oggetto</th>
                    <th style={{ width: '32%' }}>Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {visibili.map(log => (
                    <tr key={log.id}>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {log.actor_nome || <span style={{ color: '#9CA3AF' }}>—</span>}
                        {log.actor_livello && (
                          <div style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>{log.actor_livello}</div>
                        )}
                      </td>
                      <td><AzioneBadge azione={log.azione} /></td>
                      <td style={{ color: '#6B7280' }}>
                        {TIPO_LABEL[log.target_tipo] || log.target_tipo}
                      </td>
                      <td title={log.target_repr || ''}>
                        {log.target_repr || <span style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>
                        {log.dettaglio || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagine > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12 }}>
                <button className="btn btn-secondary btn-sm" disabled={pagina === 1} onClick={() => setPagina(1)} aria-label="Prima pagina">«</button>
                <button className="btn btn-secondary btn-sm" disabled={pagina === 1} onClick={() => setPagina(n => n - 1)}>‹ Precedente</button>
                <span style={{ fontSize: 13, color: '#374151' }}>Pagina {pagina} di {pagine}</span>
                <button className="btn btn-secondary btn-sm" disabled={pagina === pagine} onClick={() => setPagina(n => n + 1)}>Successiva ›</button>
                <button className="btn btn-secondary btn-sm" disabled={pagina === pagine} onClick={() => setPagina(pagine)} aria-label="Ultima pagina">»</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
