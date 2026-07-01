import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Completamento.css'

const C = 213.63 // circumference of r=34 circle

function makeDashedArcArray(arcLen, d = 5, g = 4) {
  if (arcLen <= 0) return `0 ${C}`
  const unit = d + g
  const n = Math.floor(arcLen / unit)
  const rem = arcLen - n * unit
  const parts = []
  for (let i = 0; i < n; i++) { parts.push(d, g) }
  if (rem > 0) {
    parts.push(rem <= d ? rem : d)
    if (rem > d) parts.push(rem - d)
  }
  const consumed = parts.reduce((a, b) => a + b, 0)
  if (parts.length % 2 === 1) parts.push(C - consumed)
  else parts[parts.length - 1] += (C - consumed)
  return parts.join(' ')
}

function PercBar({ value, max, inProcinto = 0 }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const pctIp = max > 0 ? (inProcinto / max) * 100 : 0
  return (
    <div className="perc-bar-wrap">
      <div className="perc-bar-track">
        <div className="perc-bar-fill" style={{ width: `${pct}%` }} />
        {inProcinto > 0 && (
          <div
            className="perc-bar-dashed"
            style={{ left: `${pct}%`, width: `${pctIp}%` }}
          />
        )}
      </div>
      <span className="perc-bar-label">
        {value}/{max}
        {inProcinto > 0 && <span className="perc-bar-ip"> +{inProcinto}</span>}
      </span>
    </div>
  )
}

function CorsoCard({ corso }) {
  const pct = corso.percentuale
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'

  const partLen = (pct / 100) * C
  const iscrittiLen = corso.totale > 0 ? (corso.in_procinto / corso.totale) * C : 0
  const dashedDasharray = makeDashedArcArray(iscrittiLen)
  const dashedDashoffset = C - partLen

  return (
    <div className="completamento-card card">
      <div className="completamento-card-header">{corso.nome_breve}</div>
      <div className="completamento-card-body">
        <div className="completamento-pct-ring">
          <svg viewBox="0 0 80 80" className="ring-svg">
            <circle cx="40" cy="40" r="34" className="ring-bg" />
            <circle
              cx="40" cy="40" r="34"
              className="ring-fill"
              style={{ stroke: color, strokeDashoffset: C * (1 - pct / 100) }}
            />
            {corso.in_procinto > 0 && (
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="butt"
                strokeOpacity="0.38"
                strokeDasharray={dashedDasharray}
                strokeDashoffset={dashedDashoffset}
              />
            )}
          </svg>
          <div className="ring-text">
            <span className="ring-pct">{pct}%</span>
            <span className="ring-sub">{corso.completato}/{corso.totale}</span>
            {corso.in_procinto > 0 && (
              <span className="ring-ip">+{corso.in_procinto} iscr.</span>
            )}
          </div>
        </div>

        <div className="completamento-split">
          <div className="split-row">
            <span className="split-label">GWU RA-TM</span>
            <PercBar
              value={corso.gwu_ratm.completato}
              max={corso.gwu_ratm.totale}
              inProcinto={corso.gwu_ratm.in_procinto}
            />
          </div>
          <div className="split-row">
            <span className="split-label">Team Manager</span>
            <PercBar
              value={corso.team_manager.completato}
              max={corso.team_manager.totale}
              inProcinto={corso.team_manager.in_procinto}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const C_IT = 263.89 // 2π × r=42

function ItaliaCorsoRing({ corso }) {
  const totComp = corso.gwu_ratm.completato + corso.team_manager.completato
  const totTot  = corso.gwu_ratm.totale    + corso.team_manager.totale
  const pct   = totTot > 0 ? Math.round(100 * totComp / totTot) : 0
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
  const ratmPct = corso.gwu_ratm.totale   > 0 ? Math.round(100 * corso.gwu_ratm.completato   / corso.gwu_ratm.totale)   : 0
  const tmPct   = corso.team_manager.totale > 0 ? Math.round(100 * corso.team_manager.completato / corso.team_manager.totale) : 0

  return (
    <div className="completamento-card card">
      <div className="completamento-card-header">{corso.nome_breve}</div>
      <div className="completamento-card-body">
        {/* Ring più piccolo e con stile distinto: r=42, stroke 5, linecap butt */}
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="5" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="butt"
              strokeDasharray={C_IT}
              strokeDashoffset={C_IT * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset .6s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>{totComp}/{totTot}</span>
          </div>
        </div>
        <div className="completamento-split">
          <div className="split-row">
            <span className="split-label">GWU RA-TM</span>
            <MiniBar percentuale={ratmPct} completato={corso.gwu_ratm.completato} totale={corso.gwu_ratm.totale} />
          </div>
          <div className="split-row">
            <span className="split-label">Team Manager</span>
            <MiniBar percentuale={tmPct} completato={corso.team_manager.completato} totale={corso.team_manager.totale} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniBar({ percentuale, completato, totale }) {
  const pct = percentuale || 0
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
      <span style={{ fontSize: 10, color: '#9CA3AF', minWidth: 36 }}>{completato}/{totale}</span>
    </div>
  )
}

function AreaDetailModal({ area, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/completamento/area/${area.numero}/`)
      .then(({ data }) => setDetail(data))
      .finally(() => setLoading(false))
  }, [area.numero])

  const pct = (c, t) => t > 0 ? Math.round(100 * c / t) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 12, width: '92vw', maxWidth: 780, maxHeight: '85vh', overflowY: 'auto', padding: 24, zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Area {area.numero} — dettaglio negozi</h3>
            {(area.area_manager_retail || area.area_bp) && (
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {area.area_manager_retail && <span>AM Retail: <strong>{area.area_manager_retail}</strong></span>}
                {area.area_manager_retail && area.area_bp && <span style={{ margin: '0 8px' }}>·</span>}
                {area.area_bp && <span>Area BP: <strong>{area.area_bp}</strong></span>}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>✕</button>
        </div>

        {loading && <div className="loading-center"><div className="spinner" /></div>}

        {detail && !loading && (
          <>
            {detail.stores.length === 0 && (
              <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Nessun negozio configurato per questa area.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {detail.stores.map(store => (
                <div key={store.id} style={{ border: `2px solid ${store.alert ? '#FCA5A5' : '#E5E7EB'}`, borderRadius: 8, padding: '10px 14px', background: store.alert ? '#FFF5F5' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {store.alert && <span title="Negozio con maggior numero di persone ancora da formare" style={{ fontSize: 16 }}>⚠️</span>}
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1F2937' }}>
                      {store.codice_store ? `${store.codice_store} — ` : ''}{store.nome}
                    </span>
                    {store.alert && (
                      <span style={{ fontSize: 10, color: '#DC2626', background: '#FEE2E2', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                        priorità formazione
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {store.corsi.map(c => (
                      <div key={c.nome_breve}>
                        <div style={{ fontSize: 10.5, color: '#374151', fontWeight: 600, marginBottom: 3 }}>{c.nome_breve}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>GWU RA-TM</span>
                          <MiniBar percentuale={pct(c.gwu_ratm.completato, c.gwu_ratm.totale)} completato={c.gwu_ratm.completato} totale={c.gwu_ratm.totale} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#9CA3AF' }}>Team Manager</span>
                          <MiniBar percentuale={pct(c.team_manager.completato, c.team_manager.totale)} completato={c.team_manager.completato} totale={c.team_manager.totale} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Completamento() {
  const { user, can } = useAuth()
  const isStore = user?.livello_accesso === 'store'
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [italiaData, setItaliaData] = useState(null)
  const [italiaLoading, setItaliaLoading] = useState(false)
  const [areaModal, setAreaModal] = useState(null) // area object

  useEffect(() => {
    if (isStore) {
      setStoreId(String(user.store_id))
    } else {
      api.get('/stores/').then(({ data }) => {
        const list = data.results || data
        setStores(list)
        if (list.length > 0) setStoreId(String(list[0].id))
      })
    }
  }, [isStore, user])

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    setData(null)
    api.get(`/stores/${storeId}/completamento/`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false))
  }, [storeId])

  useEffect(() => {
    setItaliaLoading(true)
    api.get('/completamento/italia/')
      .then(({ data }) => setItaliaData(data))
      .finally(() => setItaliaLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Completamento GWU RA-TM</h1>
        {!isStore && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Store:</label>
            <select
              className="form-control"
              style={{ minWidth: 220 }}
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {data && !loading && (
        <>
          <p className="completamento-subtitle">
            Corsi obbligatori GWU RA-TM — target: ruoli <strong>GWU RA-TM</strong> e <strong>Team Manager</strong> dello store
            &nbsp;·&nbsp;
            <span className="legend-item">
              <span className="legend-solid" /> partecipato
            </span>
            <span className="legend-item">
              <span className="legend-dashed" /> iscritto
            </span>
          </p>
          <div className="completamento-grid">
            {data.corsi.map(corso => (
              <CorsoCard key={corso.nome} corso={corso} />
            ))}
          </div>
          {data.corsi.length === 0 && (
            <div className="card"><div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center' }}>
              Nessun corso GWU trovato nel catalogo.
            </div></div>
          )}
        </>
      )}

      {/* Sezione Italia — admin/ho: totali + aree; store: solo totali */}
      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #E5E7EB' }}>
          🇮🇹 Completamento Italia — tutti i negozi
        </h2>

        {italiaLoading && <div className="loading-center"><div className="spinner" /></div>}

        {italiaData && !italiaLoading && (
          <>
            {/* Italia totals — visibile a tutti */}
            <div className="completamento-grid" style={{ marginBottom: 20 }}>
              {italiaData.italia.map(c => (
                <ItaliaCorsoRing key={c.nome_breve} corso={c} />
              ))}
            </div>

            {/* Per area — admin/ho/area */}
            {can(['admin', 'ho', 'area']) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                {italiaData.aree.filter(a => a.corsi.some(c => c.totale > 0)).map(area => (
                  <div key={area.numero} className="card">
                    <div className="card-body" style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1F2937' }}>Area {area.numero}</div>
                        <button
                          onClick={() => setAreaModal(area)}
                          title="Dettaglio negozi"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 2px', color: '#6B7280', lineHeight: 1 }}
                        >🔍</button>
                      </div>
                      {area.area_manager_retail && (
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>
                          <strong>AM Retail:</strong> {area.area_manager_retail}
                        </div>
                      )}
                      {area.area_bp && (
                        <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                          <strong>Area BP:</strong> {area.area_bp}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {area.corsi.map(c => (
                          <div key={c.nome_breve}>
                            <div style={{ fontSize: 10.5, color: '#374151', fontWeight: 600, marginBottom: 4 }}>{c.nome_breve}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 10, color: '#9CA3AF' }}>GWU RA-TM</span>
                              <MiniBar
                                percentuale={c.gwu_ratm.totale > 0 ? Math.round(100 * c.gwu_ratm.completato / c.gwu_ratm.totale) : 0}
                                completato={c.gwu_ratm.completato}
                                totale={c.gwu_ratm.totale}
                              />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: '#9CA3AF' }}>Team Manager</span>
                              <MiniBar
                                percentuale={c.team_manager.totale > 0 ? Math.round(100 * c.team_manager.completato / c.team_manager.totale) : 0}
                                completato={c.team_manager.completato}
                                totale={c.team_manager.totale}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {areaModal && <AreaDetailModal area={areaModal} onClose={() => setAreaModal(null)} />}
    </div>
  )
}
