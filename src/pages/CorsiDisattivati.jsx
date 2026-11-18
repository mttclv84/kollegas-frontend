import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import DataTable from '../components/ui/DataTable'

const TIPOLOGIA_LABEL = { ld: 'L&D', recruiting: 'RECRUITING', ehs: 'EHS', payroll: 'PAYROLL', altro: 'ALTRO' }

// Disattivati > Corsi disattivati (solo Admin): corsi EHS e attività del catalogo
// disattivati. Non sono più selezionabili per nuove richieste o nuovi eventi, ma
// formazioni svolte, eventi, iscrizioni e statistiche restano intatti.
export default function CorsiDisattivati() {
  const [corsiEhs, setCorsiEhs] = useState([])
  const [attivita, setAttivita] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDati = useCallback(async () => {
    setLoading(true)
    try {
      const [c, a] = await Promise.all([
        api.get('/ehs/corsi/'),
        api.get('/attivita/', { params: { disattivate: 1 } }),
      ])
      setCorsiEhs(c.data.filter(x => !x.attivo))
      setAttivita(a.data.results || a.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDati() }, [fetchDati])

  const riattiva = async (url, payload, nome) => {
    if (!window.confirm(`Riattivare "${nome}"?`)) return
    try {
      await api.patch(url, payload)
      toast.success('Riattivato.')
      fetchDati()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    }
  }

  const bottoneRiattiva = (onClick) => (
    <button className="btn btn-secondary btn-sm" onClick={onClick} title="Riattiva">♻️ Riattiva</button>
  )

  return (
    <div>
      <h1 className="page-title">Corsi disattivati</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginTop: -8, marginBottom: 20 }}>
        Non sono più disponibili per nuove richieste o nuovi eventi. Lo storico (formazioni svolte, eventi,
        iscrizioni) resta conservato e continua a contare nelle statistiche.
      </p>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              Corsi EHS <span className="badge badge-neutral">{corsiEhs.length}</span>
            </div>
            <DataTable
              columns={[
                { key: 'codice', label: 'Codice', sortable: true },
                { key: 'nome', label: 'Nome corso', sortable: true },
                { key: 'durata_ore', label: 'Durata (ore)', accessor: c => c.durata_ore },
                { key: 'scadenza_giorni', label: 'Scadenza (giorni)', accessor: c => c.scadenza_giorni ?? '— nessuna —' },
              ]}
              data={corsiEhs}
              actions={c => bottoneRiattiva(() => riattiva(`/ehs/corsi/${c.id}/`, { attivo: true }, c.nome))}
            />
          </div>

          <div className="card">
            <div className="card-header">
              Attività del catalogo <span className="badge badge-neutral">{attivita.length}</span>
            </div>
            <DataTable
              columns={[
                { key: 'nome', label: 'Nome attività', sortable: true },
                { key: 'tipologia', label: 'Tipologia', accessor: a => TIPOLOGIA_LABEL[a.tipologia] || a.tipologia },
                { key: 'dettaglio', label: 'Dettaglio', accessor: a => a.dettaglio || '—' },
              ]}
              data={attivita}
              actions={a => bottoneRiattiva(() => riattiva(`/attivita/${a.id}/`, { is_active: true }, a.nome))}
            />
          </div>
        </>
      )}
    </div>
  )
}
