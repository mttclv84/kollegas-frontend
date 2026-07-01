import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import './Mapping.css'

const RUOLO_CONFIG = {
  'Store Manager':              { header: '#F59E0B', badge: '#92400E', order: 1 },
  'Assistant Manager':          { header: '#E91E8C', badge: '#9D174D', order: 2 },
  'Department Manager':         { header: '#6B7280', badge: '#374151', order: 3 },
  'Visual Manager':             { header: '#10B981', badge: '#065F46', order: 4 },
  'Team Manager':               { header: '#7C4DFF', badge: '#5B21B6', order: 5 },
  'GWU RA-TM':                  { header: '#F97316', badge: '#9A3412', order: 6 },
  'P&C Store Business Partner': { header: '#E91E8C', badge: '#9D174D', order: 7 },
  'P&C Admin':                  { header: '#3F51B5', badge: '#1E40AF', order: 8 },
  'Stage P&C':                  { header: '#3F51B5', badge: '#1E40AF', order: 9 },
  'P&C Coordinator':            { header: '#3F51B5', badge: '#1E40AF', order: 10 },
}

function CommentoEditPopup({ data, onChange, onSave, onDelete, onClose }) {
  if (!data) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 28, maxWidth: 420, width: '92%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#111827' }}>
          Commento — {data.user.cognome} {data.user.nome}
        </div>
        <textarea
          className="form-control"
          rows={4}
          value={data.text}
          onChange={e => onChange(e.target.value)}
          placeholder="Scrivi un commento..."
          autoFocus
          style={{ marginBottom: 16, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {data.user.commento_mapping && (
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Elimina commento</button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary btn-sm" onClick={onSave}>Salva</button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ user, onEditComment }) {
  return (
    <div className={`mapping-card ${user.long_absence ? 'long-absence' : ''}`}>
      <div className="mapping-avatar">
        {user.foto
          ? <img src={user.foto} alt={user.nome_completo} />
          : <div className="avatar-initials">{(user.cognome?.[0] || '') + (user.nome?.[0] || '')}</div>
        }
        {user.long_absence && <span className="absence-badge" title="Long Absence">!</span>}
      </div>
      <div className="mapping-name">{user.cognome} {user.nome}</div>
      <button
        className="comment-bubble-btn"
        onClick={() => onEditComment(user)}
        title={user.commento_mapping ? 'Modifica commento' : 'Aggiungi commento'}
        style={{
          opacity: user.commento_mapping ? 1 : 0.35,
          background: user.commento_mapping ? '#DBEAFE' : 'transparent',
          borderRadius: 6,
        }}
      >
        💬
      </button>
    </div>
  )
}

function VacancyCard() {
  return (
    <div className="mapping-card vacancy">
      <div className="mapping-avatar">
        <div className="avatar-vacancy">?</div>
      </div>
      <div className="mapping-name" style={{ color: '#9CA3AF' }}>Vacancy</div>
    </div>
  )
}

function RuoloGruppo({ ruolo, utenti, cluster, onEditComment }) {
  const cfg = RUOLO_CONFIG[ruolo] || { header: '#6B7280', badge: '#374151', order: 99 }
  const target = cluster?.[ruolo] ?? 0
  const attivi = utenti.filter(u => !u.long_absence).length
  const vacancies = Math.max(0, target - attivi)

  return (
    <div className="mapping-group">
      <div className="mapping-group-header" style={{ background: cfg.header }}>
        <span>{ruolo}</span>
        <span className="group-count">{utenti.length}{target > 0 ? `/${target}` : ''}</span>
      </div>
      <div className="mapping-cards-row">
        {utenti.map(u => <Avatar key={u.id} user={u} onEditComment={onEditComment} />)}
        {Array.from({ length: vacancies }).map((_, i) => <VacancyCard key={`vac-${i}`} />)}
        {utenti.length === 0 && vacancies === 0 && (
          <div className="mapping-empty">Nessun collaboratore</div>
        )}
      </div>
    </div>
  )
}

const CLUSTER_KEYS = {
  'Store Manager': 'store_managers',
  'Assistant Manager': 'assistant_managers',
  'Department Manager': 'department_managers',
  'Team Manager': 'team_managers',
  'Visual Manager': 'visual_managers',
}

export default function Mapping() {
  const { user, can } = useAuth()
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [mapping, setMapping] = useState(null)
  const [loading, setLoading] = useState(false)
  const [commentEdit, setCommentEdit] = useState(null) // { user, text }

  const openCommentEdit = useCallback((user) => {
    setCommentEdit({ user, text: user.commento_mapping || '' })
  }, [])

  const saveComment = async () => {
    try {
      await api.patch(`/users/${commentEdit.user.id}/`, { commento_mapping: commentEdit.text })
      setMapping(prev => ({
        ...prev,
        collaboratori: prev.collaboratori.map(u =>
          u.id === commentEdit.user.id ? { ...u, commento_mapping: commentEdit.text } : u
        ),
      }))
      setCommentEdit(null)
    } catch {}
  }

  const deleteComment = async () => {
    try {
      await api.patch(`/users/${commentEdit.user.id}/`, { commento_mapping: '' })
      setMapping(prev => ({
        ...prev,
        collaboratori: prev.collaboratori.map(u =>
          u.id === commentEdit.user.id ? { ...u, commento_mapping: '' } : u
        ),
      }))
      setCommentEdit(null)
    } catch {}
  }

  useEffect(() => {
    api.get('/stores/').then(({ data }) => {
      const list = (data.results || data).filter(s => s.codice_store !== 'HO' && s.codice_store !== '979')
      setStores(list)
      if (!storeId && list.length > 0) {
        const arese = list.find(s => s.codice_store === '270')
        setStoreId(String((arese || list[0]).id))
      }
    })
  }, [])

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    api.get(`/stores/${storeId}/mapping/`)
      .then(({ data }) => setMapping(data))
      .finally(() => setLoading(false))
  }, [storeId])

  const byRuolo = {}
  if (mapping?.collaboratori) {
    mapping.collaboratori.forEach(u => {
      const r = u.ruolo_nome || 'Altro'
      if (!byRuolo[r]) byRuolo[r] = []
      byRuolo[r].push(u)
    })
  }

  const ruoliOrdinati = Object.keys(byRuolo).sort((a, b) => {
    const oa = RUOLO_CONFIG[a]?.order ?? 99
    const ob = RUOLO_CONFIG[b]?.order ?? 99
    return oa - ob
  })

  const clusterByRuolo = {}
  if (mapping?.cluster) {
    Object.entries(CLUSTER_KEYS).forEach(([ruolo, key]) => {
      clusterByRuolo[ruolo] = mapping.cluster[key]
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Mapping</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Store:</label>
          <select className="form-control" style={{ minWidth: 200 }} value={storeId}
            onChange={e => setStoreId(e.target.value)}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="loading-center"><div className="spinner" /></div>}

      {mapping && !loading && (
        <div className="mapping-container">
          <div className="mapping-store-header">
            <h2>{mapping.store.nome}</h2>
            <div className="mapping-legenda">
              <span className="legenda-pill absence">Long Absence</span>
              <span className="legenda-pill vacancy">Vacancy</span>
            </div>
          </div>

          {mapping.area && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Area {mapping.area.numero}</span>
              {mapping.area.area_manager_retail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F4F6', borderRadius: 8, padding: '6px 12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {mapping.area.area_manager_retail.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>AM Retail</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{mapping.area.area_manager_retail}</div>
                  </div>
                </div>
              )}
              {mapping.area.area_bp && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F4F6', borderRadius: 8, padding: '6px 12px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {mapping.area.area_bp.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Area BP</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{mapping.area.area_bp}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {ruoliOrdinati.map(ruolo => (
            <RuoloGruppo
              key={ruolo}
              ruolo={ruolo}
              utenti={byRuolo[ruolo]}
              cluster={clusterByRuolo}
              onEditComment={openCommentEdit}
            />
          ))}

          {Object.keys(byRuolo).length === 0 && (
            <div className="card"><div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center' }}>
              Nessun collaboratore nello store. Vai in Gestione Account per aggiungerne.
            </div></div>
          )}
        </div>
      )}

      <CommentoEditPopup
        data={commentEdit}
        onChange={text => setCommentEdit(prev => ({ ...prev, text }))}
        onSave={saveComment}
        onDelete={deleteComment}
        onClose={() => setCommentEdit(null)}
      />
    </div>
  )
}
