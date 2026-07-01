import { useState, useEffect } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'

const RUOLI_CLUSTER = [
  { key: 'store_managers', label: 'Store Manager' },
  { key: 'assistant_managers', label: 'Assistant Manager' },
  { key: 'department_managers', label: 'Department Manager' },
  { key: 'team_managers', label: 'Team Manager' },
  { key: 'visual_managers', label: 'Visual Manager' },
]

export default function ConfigStore() {
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [cluster, setCluster] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/stores/').then(({ data }) => {
      const list = data.results || data
      setStores(list)
      if (list.length > 0) setStoreId(String(list[0].id))
    })
  }, [])

  useEffect(() => {
    if (!storeId) return
    setLoading(true)
    api.get(`/stores/${storeId}/cluster/`)
      .then(({ data }) => setCluster(data))
      .finally(() => setLoading(false))
  }, [storeId])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/stores/${storeId}/cluster/`, cluster)
      toast.success('Configurazione salvata.')
    } catch { toast.error('Errore nel salvataggio.') }
    finally { setSaving(false) }
  }

  const setC = (k, v) => setCluster(c => ({ ...c, [k]: parseInt(v) || 0 }))

  return (
    <div>
      <h1 className="page-title">Gestione Cluster</h1>

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Seleziona Store</label>
            <select className="form-control" value={storeId} onChange={e => setStoreId(e.target.value)}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          {loading && <div className="loading-center" style={{ padding: 24 }}><div className="spinner" /></div>}

          {cluster && !loading && (
            <form onSubmit={handleSave}>
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: '#6B7280', marginBottom: 16 }}>
                  Headcount target per ruolo — alimenta le vacancy nel Mapping.
                </p>
                {RUOLI_CLUSTER.map(r => (
                  <div key={r.key} className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 100px', alignItems: 'center', gap: 16 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>{r.label}</label>
                    <input
                      type="number" min="0" className="form-control"
                      value={cluster[r.key] ?? 0}
                      onChange={e => setC(r.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
