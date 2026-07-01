import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import DataTable from '../components/ui/DataTable'
import toast from 'react-hot-toast'

const STATO_BADGE = { iscritto: 'primary', partecipato: 'success', assente: 'danger' }
const TIPOLOGIA_LABEL = { ld: 'L&D', recruiting: 'RECRUITING', ehs: 'EHS', payroll: 'PAYROLL', altro: 'ALTRO' }

export default function Report() {
  const { user, can } = useAuth()
  const [dati, setDati] = useState([])
  const [loading, setLoading] = useState(true)
  const [ruoli, setRuoli] = useState([])
  const [stores, setStores] = useState([])
  const [filters, setFilters] = useState({ data_da: '', data_a: '', ruolo: '', store: '' })

  useEffect(() => {
    Promise.all([api.get('/ruoli/'), api.get('/stores/')]).then(([rRes, sRes]) => {
      setRuoli(rRes.data.results || rRes.data)
      setStores(sRes.data.results || sRes.data)
    })
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const params = {}
    if (filters.data_da) params.data_da = filters.data_da
    if (filters.data_a) params.data_a = filters.data_a
    if (filters.ruolo) params.ruolo = filters.ruolo
    if (filters.store && can(['admin', 'ho', 'area'])) params.store = filters.store
    try {
      const { data } = await api.get('/report/', { params })
      setDati(data.results || data)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchReport() }, [fetchReport])

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const assentiCount = dati.filter(d => d.stato === 'assente').length

  const handleDeleteAssenti = async () => {
    if (!window.confirm(
      `Eliminare ${assentiCount} record con stato "assente"${Object.values(filters).some(Boolean) ? ' (filtri attivi)' : ''}?\n\nL'operazione è irreversibile.`
    )) return
    try {
      const params = {}
      if (filters.data_da) params.data_da = filters.data_da
      if (filters.data_a)  params.data_a  = filters.data_a
      if (filters.ruolo)   params.ruolo   = filters.ruolo
      if (filters.store && can(['admin', 'ho', 'area'])) params.store = filters.store
      const { data } = await api.delete('/iscrizioni/assenti/', { params })
      toast.success(`${data.eliminati} record eliminati.`)
      fetchReport()
    } catch { toast.error('Errore durante l\'eliminazione.') }
  }

  const exportCSV = () => {
    const headers = ['Data','Attività','Ore','Tipologia','Store','Collaboratore','Sesso','Location','Stato']
    const rows = dati.map(d => [
      d.evento_data, d.attivita_nome, d.evento_ore, d.attivita_tipologia,
      d.store_nome, `${d.user_cognome} ${d.user_nome}`, d.user_sesso,
      d.location_display, d.stato,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'report_popsquare.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'evento_data', label: 'Data', sortable: true },
    { key: 'attivita_nome', label: 'Attività', sortable: true },
    { key: 'evento_ore', label: 'Ore', accessor: d => d.evento_ore ? `${d.evento_ore}h` : '—' },
    {
      key: 'attivita_tipologia', label: 'Tipo',
      render: d => <span className="badge badge-primary">{TIPOLOGIA_LABEL[d.attivita_tipologia] || d.attivita_tipologia}</span>
    },
    { key: 'store_nome', label: 'Store', accessor: d => d.store_nome || '—' },
    { key: 'collaboratore', label: 'Collaboratore', accessor: d => `${d.user_cognome} ${d.user_nome}` },
    { key: 'user_sesso', label: 'Sesso' },
    { key: 'location_display', label: 'Location', accessor: d => d.location_display || '—' },
    {
      key: 'stato', label: 'Stato',
      render: d => <span className={`badge badge-${STATO_BADGE[d.stato] || 'neutral'}`}>{d.stato}</span>
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Dettaglio</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {assentiCount > 0 && can(['admin', 'ho', 'area']) && (
            <button className="btn btn-danger" onClick={handleDeleteAssenti}>
              🗑 Elimina assenti ({assentiCount})
            </button>
          )}
          <button className="btn btn-secondary" onClick={exportCSV} disabled={dati.length === 0}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', padding: '12px 16px' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label className="form-label">Dal</label>
            <input type="date" className="form-control" value={filters.data_da} onChange={e => setF('data_da', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label className="form-label">Al</label>
            <input type="date" className="form-control" value={filters.data_a} onChange={e => setF('data_a', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
            <label className="form-label">Ruolo</label>
            <select className="form-control" value={filters.ruolo} onChange={e => setF('ruolo', e.target.value)}>
              <option value="">Tutti i ruoli</option>
              {ruoli.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
          {can(['admin', 'ho', 'area']) && (
            <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="form-label">Store</label>
              <select className="form-control" value={filters.store} onChange={e => setF('store', e.target.value)}>
                <option value="">Tutti gli store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-secondary" onClick={() => setFilters({ data_da: '', data_a: '', ruolo: '', store: '' })}>Reset</button>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <DataTable columns={columns} data={dati} searchable={true} pageSize={10} />
        )}
      </div>
    </div>
  )
}
