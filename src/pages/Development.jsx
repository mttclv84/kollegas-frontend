import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Development.css'

const RUOLO_LEVEL = {
  'Retail Assistant': 1,
  'Team Manager': 2, 'Team Manager Visual': 2,
  'Department Manager': 3, 'Visual Manager': 3,
  'Assistant Manager': 4,
  'Store Manager': 5,
}
const LEVEL_COLOR = { 1: '#9CA3AF', 2: '#3B82F6', 3: '#8B5CF6', 4: '#F59E0B', 5: '#10B981' }
const LEVEL_LABEL = { 1: 'Livello 1', 2: 'Livello 2', 3: 'Livello 3', 4: 'Livello 4', 5: 'Livello 5' }
const TIPO_LABEL = { promozione: '⬆ Promozione', trasferimento: '↔ Trasferimento', cambio_ruolo: '🔄 Cambio Ruolo', nota: '📝 Nota' }
const TIPO_COLOR = { promozione: '#10B981', trasferimento: '#3B82F6', cambio_ruolo: '#F59E0B', nota: '#9CA3AF' }

const TIPOLOGIA_COLOR = {
  ld:         { bg: '#DBEAFE', text: '#1E40AF' },
  recruiting: { bg: '#D1FAE5', text: '#065F46' },
  ehs:        { bg: '#FEF3C7', text: '#92400E' },
  payroll:    { bg: '#FCE7F3', text: '#9D174D' },
  altro:      { bg: '#F3F4F6', text: '#374151' },
}
const TIPOLOGIA_LABEL = {
  ld: 'L&D', recruiting: 'RECRUITING', ehs: 'EHS', payroll: 'PAYROLL', altro: 'ALTRO',
}
const STATO_CFG = {
  partecipato: { label: 'Partecipato', color: '#065F46', bg: '#D1FAE5' },
  assente:     { label: 'Assente',     color: '#991B1B', bg: '#FEE2E2' },
  iscritto:    { label: 'Iscritto',    color: '#1E40AF', bg: '#DBEAFE' },
}
const MODALITA_LABEL = { presenza: 'Presenza', online: 'Online', blended: 'Blended' }

function AttivitaTable({ attivita, navigate }) {
  if (!attivita || attivita.length === 0) return (
    <div style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 14 }}>
      Nessuna attività registrata.
    </div>
  )
  const totOre = attivita
    .filter(a => a.stato === 'partecipato' && a.ore_totali)
    .reduce((s, a) => s + a.ore_totali, 0)

  return (
    <div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
        {attivita.length} attività ·{' '}
        <strong style={{ color: '#374151' }}>{totOre.toFixed(1)} ore</strong> di formazione completate
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', color: '#6B7280', fontWeight: 600 }}>Data</th>
              <th style={{ padding: '6px 8px', color: '#6B7280', fontWeight: 600 }}>Attività</th>
              <th style={{ padding: '6px 8px', color: '#6B7280', fontWeight: 600 }}>Tipologia</th>
              <th style={{ padding: '6px 8px', color: '#6B7280', fontWeight: 600 }}>Modalità</th>
              <th style={{ padding: '6px 8px', color: '#6B7280', fontWeight: 600 }}>Ore</th>
              <th style={{ padding: '6px 8px', color: '#6B7280', fontWeight: 600 }}>Stato</th>
            </tr>
          </thead>
          <tbody>
            {attivita.map(a => {
              const tip = TIPOLOGIA_COLOR[a.attivita_tipologia] || TIPOLOGIA_COLOR.altro
              const st  = STATO_CFG[a.stato] || STATO_CFG.iscritto
              return (
                <tr
                  key={a.id}
                  style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                  onClick={() => navigate(`/iscrizioni?evento=${a.evento_id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: '#374151' }}>
                    {a.data}
                  </td>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#111827' }}>
                    {a.attivita_nome}
                    {a.host && <div style={{ fontWeight: 400, color: '#9CA3AF', fontSize: 11 }}>{a.host}</div>}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      background: tip.bg, color: tip.text,
                      borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600,
                    }}>
                      {TIPOLOGIA_LABEL[a.attivita_tipologia] || a.attivita_tipologia}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: '#6B7280' }}>
                    {MODALITA_LABEL[a.modalita] || a.modalita}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#374151' }}>
                    {a.ore_totali != null ? `${a.ore_totali}h` : '—'}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      background: st.bg, color: st.color,
                      borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600,
                    }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Avatar({ foto, nome, cognome }) {
  if (foto) return <img src={foto} alt="foto" className="dev-avatar-img" />
  const initials = `${cognome?.[0] || ''}${nome?.[0] || ''}`
  return <div className="dev-avatar-initials">{initials}</div>
}

function withinDays(isoDatetime, days) {
  return (Date.now() - new Date(isoDatetime).getTime()) / 86400000 <= days
}

function TimelineCard({ step, onDelete }) {
  const level = RUOLO_LEVEL[step.ruolo_nome] || 0
  const color = LEVEL_COLOR[level] || '#9CA3AF'
  const canDelete = onDelete && step.created_at && withinDays(step.created_at, 15)
  return (
    <div className="timeline-item">
      <div className="timeline-dot" style={{ background: color }} />
      <div className="timeline-content" style={{ position: 'relative' }}>
        {canDelete && (
          <button
            onClick={() => onDelete(step.id)}
            title="Elimina questa variazione (disponibile 15 giorni)"
            style={{
              position: 'absolute', top: 0, right: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9CA3AF', fontSize: 14, lineHeight: 1,
              padding: '2px 4px', borderRadius: 4,
              transition: 'color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
          >
            ✕
          </button>
        )}
        <div className="timeline-header">
          <span className="timeline-tipo" style={{ color: TIPO_COLOR[step.tipo_evento] }}>
            {TIPO_LABEL[step.tipo_evento] || step.tipo_evento}
          </span>
          <span className="timeline-data">{step.data}</span>
        </div>
        {step.ruolo_nome && (
          <div className="timeline-ruolo" style={{ color }}>
            {step.ruolo_nome}
            {level > 0 && <span className="timeline-level-badge" style={{ background: color }}>{LEVEL_LABEL[level]}</span>}
          </div>
        )}
        {step.store_nome && <div className="timeline-store">📍 {step.store_nome}</div>}
        {step.descrizione && <div className="timeline-desc">{step.descrizione}</div>}
        {step.created_by_nome && (
          <div className="timeline-meta">registrato da {step.created_by_nome}</div>
        )}
      </div>
    </div>
  )
}

export default function Development() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const [ruoli, setRuoli] = useState([])
  const [stores, setStores] = useState([])
  const [filters, setFilters] = useState({ nome: '', ruolo: '', store: '' })
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)   // { user, percorso }
  const [loadingDetail, setLoadingDetail] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    api.get('/ruoli/').then(({ data }) => setRuoli(data.results || data))
    api.get('/stores/').then(({ data }) => {
      const list = (data.results || data).slice().sort((a, b) => {
        return (parseInt(a.codice_store) || 9999) - (parseInt(b.codice_store) || 9999)
      })
      setStores(list)
    })
  }, [])

  const doSearch = (f) => {
    if (!f.nome && !f.ruolo && !f.store) { setResults([]); return }
    setSearching(true)
    const params = {}
    if (f.nome) params.nome = f.nome
    if (f.ruolo) params.ruolo = f.ruolo
    if (f.store) params.store = f.store
    api.get('/users/search/', { params })
      .then(({ data }) => setResults(data))
      .finally(() => setSearching(false))
  }

  const setF = (k, v) => {
    const next = { ...filters, [k]: v }
    setFilters(next)
    if (k === 'nome') {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => doSearch(next), 350)
    } else {
      doSearch(next)
    }
  }

  const openUser = async (userId) => {
    setLoadingDetail(true)
    setSelected(null)
    try {
      const { data } = await api.get(`/users/${userId}/development/`)
      setSelected(data)
    } finally {
      setLoadingDetail(false)
    }
  }

  const resetFilters = () => {
    setFilters({ nome: '', ruolo: '', store: '' })
    setResults([])
    setSelected(null)
  }

  const handleDeletePercorso = async (percorsoId) => {
    if (!window.confirm('Eliminare questa variazione del percorso?')) return
    try {
      await api.delete(`/percorso/${percorsoId}/`)
      setSelected(prev => ({ ...prev, percorso: prev.percorso.filter(s => s.id !== percorsoId) }))
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Errore durante l\'eliminazione.'
      alert(msg)
    }
  }

  const hasFilter = filters.nome || filters.ruolo || filters.store

  return (
    <div>
      <h1 className="page-title">Development</h1>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cerca per nome</label>
              <input
                className="form-control"
                placeholder="Cognome o nome..."
                value={filters.nome}
                onChange={e => setF('nome', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Filtra per ruolo</label>
              <select className="form-control" value={filters.ruolo} onChange={e => setF('ruolo', e.target.value)}>
                <option value="">— Tutti i ruoli —</option>
                {ruoli.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Filtra per store</label>
              <select className="form-control" value={filters.store} onChange={e => setF('store', e.target.value)}>
                <option value="">— Tutti gli store —</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.codice_store ? `${s.codice_store} — ` : ''}{s.nome}</option>)}
              </select>
            </div>
            {hasFilter && (
              <button className="btn btn-secondary" onClick={resetFilters}>Reset</button>
            )}
          </div>
        </div>
      </div>

      {/* Layout: results + detail */}
      <div className={`dev-layout ${selected ? 'dev-layout-split' : ''}`}>

        {/* Results list */}
        {hasFilter && (
          <div className="card dev-results">
            {searching ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : results.length === 0 ? (
              <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 32 }}>
                Nessun utente trovato
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nominativo</th>
                    <th>Ruolo</th>
                    <th>Store</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(u => (
                    <tr
                      key={u.id}
                      className={selected?.user?.id === u.id ? 'dev-row-selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openUser(u.id)}
                    >
                      <td><strong>{u.cognome} {u.nome}</strong></td>
                      <td>{u.ruolo_nome || '—'}</td>
                      <td>{u.store_nome || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--color-primary)', fontSize: 18 }}>›</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!hasFilter && !selected && (
          <div className="card">
            <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
              Usa i filtri sopra per cercare un collaboratore.
            </div>
          </div>
        )}

        {/* Profile card */}
        {loadingDetail && (
          <div className="card dev-profile">
            <div className="loading-center"><div className="spinner" /></div>
          </div>
        )}

        {selected && !loadingDetail && (
          <div className="card dev-profile">
            <div className="card-body">
              {/* Header */}
              <div className="dev-profile-header">
                <Avatar foto={selected.user.foto} nome={selected.user.nome} cognome={selected.user.cognome} />
                <div className="dev-profile-info">
                  <h2 className="dev-profile-name">{selected.user.cognome} {selected.user.nome}</h2>
                  <div className="dev-profile-ruolo">{selected.user.ruolo_nome || '—'}</div>
                  <div className="dev-profile-store">📍 {selected.user.store_nome || '—'}</div>
                </div>
                <button className="modal-close" style={{ alignSelf: 'flex-start' }} onClick={() => setSelected(null)}>✕</button>
              </div>

              {/* Career timeline */}
              <div className="dev-timeline-title" style={{ marginTop: 20 }}>Percorso di Crescita</div>
              {selected.percorso.length === 0 ? (
                <div style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 14 }}>Nessun percorso registrato.</div>
              ) : (
                <div className="timeline">
                  {selected.percorso.map((step, i) => (
                    <TimelineCard
                      key={step.id}
                      step={step}
                      onDelete={i === 0 && can(['admin', 'ho', 'area']) ? handleDeletePercorso : null}
                    />
                  ))}
                </div>
              )}

              {/* Activity history */}
              <div className="dev-timeline-title" style={{ marginTop: 24 }}>Attività Formative</div>
              <AttivitaTable attivita={selected.attivita} navigate={navigate} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
