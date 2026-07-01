import { useState, useEffect } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'

const SLOTS = 10

export default function GestioneAree() {
  const [aree, setAree] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // area numero being saved

  useEffect(() => {
    Promise.all([api.get('/aree/'), api.get('/stores/')]).then(([aRes, sRes]) => {
      const areeData = aRes.data
      const storeList = sRes.data.results || sRes.data
      // Convert store_details to 10-slot arrays
      const areeWithSlots = areeData.map(a => ({
        ...a,
        slots: padSlots(a.store_details.map(s => String(s.id))),
      }))
      setAree(areeWithSlots)
      setStores(storeList)
    }).finally(() => setLoading(false))
  }, [])

  function padSlots(ids) {
    const arr = [...ids]
    while (arr.length < SLOTS) arr.push('')
    return arr.slice(0, SLOTS)
  }

  const setField = (areaIdx, field, val) => {
    setAree(prev => prev.map((a, i) => i === areaIdx ? { ...a, [field]: val } : a))
  }

  const setSlot = (areaIdx, slotIdx, val) => {
    setAree(prev => prev.map((a, i) => {
      if (i !== areaIdx) return a
      const slots = [...a.slots]
      slots[slotIdx] = val
      return { ...a, slots }
    }))
  }

  const handleSave = async (area, idx) => {
    setSaving(area.numero)
    try {
      const store_ids = area.slots.filter(Boolean).map(Number)
      await api.put(`/aree/${area.id}/`, {
        area_manager_retail: area.area_manager_retail,
        area_bp: area.area_bp,
        store_ids,
      })
      toast.success(`Area ${area.numero} salvata.`)
      // Refresh store_details
      const { data } = await api.get('/aree/')
      const updated = data.find(a => a.numero === area.numero)
      if (updated) {
        setAree(prev => prev.map((a, i) => i === idx
          ? { ...updated, slots: padSlots(updated.store_details.map(s => String(s.id))) }
          : a
        ))
      }
    } catch { toast.error('Errore nel salvataggio.') }
    finally { setSaving(null) }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  // Build a map of storeId → store for display
  const storeMap = Object.fromEntries(stores.map(s => [String(s.id), s]))

  return (
    <div>
      <h1 className="page-title">Gestione Aree</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {aree.map((area, idx) => (
          <div key={area.numero} className="card">
            <div className="card-body">
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1F2937', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #E5E7EB' }}>
                Area {area.numero}
              </div>

              <div className="form-group">
                <label className="form-label">Area Manager Retail</label>
                <input
                  className="form-control"
                  value={area.area_manager_retail}
                  onChange={e => setField(idx, 'area_manager_retail', e.target.value)}
                  placeholder="Nome cognome..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Area BP</label>
                <input
                  className="form-control"
                  value={area.area_bp}
                  onChange={e => setField(idx, 'area_bp', e.target.value)}
                  placeholder="Nome cognome..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Store gestiti</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {area.slots.map((slotVal, slotIdx) => (
                    <select
                      key={slotIdx}
                      className="form-control"
                      value={slotVal}
                      onChange={e => setSlot(idx, slotIdx, e.target.value)}
                      style={{ fontSize: 13 }}
                    >
                      <option value="">— Slot {slotIdx + 1} vuoto —</option>
                      {stores.map(s => (
                        <option key={s.id} value={String(s.id)}>
                          {s.codice_store ? `${s.codice_store} — ` : ''}{s.nome}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="btn btn-primary"
                  disabled={saving === area.numero}
                  onClick={() => handleSave(area, idx)}
                >
                  {saving === area.numero ? 'Salvataggio...' : 'Salva Area'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
