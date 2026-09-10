import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import api from '../../api/client'

const STATO_LABELS = {
  RICHIESTA_INVIATA: 'Richiesta inviata',
  DATA_PROPOSTA: 'Data proposta',
  DATA_CONTROPROPOSTA: 'Contro-proposta',
  CONFERMATA: 'Confermata',
  REGISTRO_INVIATO: 'Registro inviato',
  SVOLTA: 'Svolta',
  COMPLETATA: 'Completata',
  ANNULLATA: 'Annullata',
}

const STATO_COLORS = {
  RICHIESTA_INVIATA: { bg: '#DBEAFE', text: '#1E40AF' },
  DATA_PROPOSTA: { bg: '#FEF3C7', text: '#92400E' },
  DATA_CONTROPROPOSTA: { bg: '#FEF3C7', text: '#92400E' },
  CONFERMATA: { bg: '#D1FAE5', text: '#065F46' },
  REGISTRO_INVIATO: { bg: '#D1FAE5', text: '#065F46' },
  SVOLTA: { bg: '#D1FAE5', text: '#065F46' },
  COMPLETATA: { bg: '#E5E7EB', text: '#374151' },
  ANNULLATA: { bg: '#FEE2E2', text: '#991B1B' },
}

const EHSRichiesteList = forwardRef(function EHSRichiesteList({ onSelect }, ref) {
  const [sessioni, setSessioni] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSessioni = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ehs/sessioni/')
      setSessioni(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessioni() }, [fetchSessioni])
  useImperativeHandle(ref, () => ({ refresh: fetchSessioni }))

  if (loading) return <div className="loading-center"><div className="spinner" /></div>

  if (sessioni.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>
          Nessuna richiesta EHS.
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Corso</th>
              <th>Negozio</th>
              <th>Stato</th>
              <th>Partecipanti</th>
              <th>Creata il</th>
            </tr>
          </thead>
          <tbody>
            {sessioni.map(s => {
              const stato = STATO_COLORS[s.stato] || { bg: '#F3F4F6', text: '#374151' }
              return (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(s.id)}>
                  <td><strong>{s.corso_nome}</strong></td>
                  <td>{s.negozio_nome}</td>
                  <td>
                    <span style={{
                      background: stato.bg, color: stato.text,
                      borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      {STATO_LABELS[s.stato] || s.stato}
                    </span>
                  </td>
                  <td>{s.partecipanti_count}</td>
                  <td>{new Date(s.creata_il).toLocaleDateString('it-IT')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default EHSRichiesteList
