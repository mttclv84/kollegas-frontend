import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import './EHS.css'

const CONFERMA = 'SVUOTA'

const fmtData = (d) => (d ? new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const fmtPeso = (b) => {
  if (!b) return '0 KB'
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const box = (bg, color) => ({ background: bg, color, borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 })

// Archivio mensile dei documenti EHS (Admin / Admin EHS; HO vede solo il riepilogo): si
// scaricano in un unico ZIP i documenti delle sezioni completate e poi si svuota Kollegas.
// In app resta la riga di ogni documento con la data di archiviazione.
export default function ArchivioDocumentiEHS() {
  const { can } = useAuth()
  const puoGestire = can(['admin', 'admin_ehs'])
  const [stato, setStato] = useState(null)
  const [busy, setBusy] = useState(false)
  const [conferma, setConferma] = useState('')

  const fetchStato = useCallback(() => {
    api.get('/ehs/archivio-documenti/').then(({ data }) => setStato(data)).catch(() => toast.error('Errore nel caricamento.'))
  }, [])
  useEffect(() => { fetchStato() }, [fetchStato])

  const aperta = stato?.esportazione_aperta

  const scarica = async () => {
    setBusy(true)
    try {
      const esp = aperta || (await api.post('/ehs/archivio-documenti/')).data
      const res = await api.get(`/ehs/archivio-documenti/${esp.id}/zip/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `Kollegas_EHS_documenti_${new Date(esp.creata_il).toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('ZIP scaricato. Spostalo nell\'archivio aziendale prima di svuotare.')
      fetchStato()
    } catch (err) {
      let msg = err.response?.data?.detail
      if (!msg && err.response?.data instanceof Blob) {
        try { msg = JSON.parse(await err.response.data.text()).detail } catch { /* niente */ }
      }
      toast.error(msg || 'Errore durante lo scarico.')
    } finally {
      setBusy(false)
    }
  }

  const svuota = async () => {
    setBusy(true)
    try {
      await api.post(`/ehs/archivio-documenti/${aperta.id}/svuota/`, { conferma })
      toast.success('Documenti archiviati: Kollegas è stato svuotato.')
      setConferma('')
      fetchStato()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore durante lo svuotamento.')
    } finally {
      setBusy(false)
    }
  }

  if (!stato) return <div className="loading-center"><div className="spinner" /></div>

  return (
    <div className="ehs-section">
      <h1 className="page-title">Archivio documenti EHS</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginTop: -8, marginBottom: 20, maxWidth: 820 }}>
        Una volta al mese scarica in un unico ZIP i documenti EHS (Presenze e Attestati) delle sezioni completate,
        spostalo nell'archivio aziendale protetto e poi svuota Kollegas. In app restano aule, presenze e l'elenco dei
        documenti con la data di archiviazione.
      </p>

      {!puoGestire && (
        <div style={box('#F3F4F6', '#374151')}>👁 Il tuo profilo può solo visualizzare il riepilogo dell'archivio.</div>
      )}

      {stato.mesi_precedenti > 0 && !aperta && (
        <div style={box('#FEF3C7', '#92400E')}>
          ⏰ Ci sono {stato.mesi_precedenti} documenti dei mesi precedenti ancora da archiviare.
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          {!aperta ? (
            <>
              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{stato.da_archiviare}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>documenti da archiviare ({fmtPeso(stato.dimensione)})</div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#9CA3AF' }}>{stato.in_sezioni_aperte}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>in sezioni non ancora completate (al prossimo giro)</div>
                </div>
              </div>
              {puoGestire && (
                <button className="btn btn-primary" disabled={busy || stato.da_archiviare === 0} onClick={scarica}>
                  {busy ? 'Preparazione ZIP...' : '⬇ 1. Scarica ZIP'}
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, marginBottom: 12 }}>
                <strong>Esportazione del {fmtData(aperta.creata_il)}</strong> — {aperta.numero_file} documenti ({fmtPeso(aperta.dimensione)})
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {aperta.scaricata_il
                    ? `Scaricata il ${fmtData(aperta.scaricata_il)} da ${aperta.scaricata_da || '—'}`
                    : 'Non ancora scaricata'}
                </div>
              </div>
              {puoGestire && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <button className="btn btn-secondary" disabled={busy} onClick={scarica}>
                    {busy ? 'Preparazione ZIP...' : aperta.scaricata_il ? '⬇ Scarica di nuovo lo ZIP' : '⬇ 1. Scarica ZIP'}
                  </button>
                </div>
              )}

              {puoGestire && aperta.scaricata_il && (
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                  <div style={box('#FEE2E2', '#991B1B')}>
                    ⚠️ Prima di svuotare, verifica di aver aperto lo ZIP e di averlo salvato nell'archivio aziendale
                    protetto. Dopo lo svuotamento quella sarà <strong>l'unica copia</strong> di questi {aperta.numero_file} documenti.
                    I documenti caricati dopo lo scarico non vengono toccati.
                  </div>
                  <label className="form-label">Digita <strong>{CONFERMA}</strong> per confermare</label>
                  <div style={{ display: 'flex', gap: 10, maxWidth: 420 }}>
                    <input className="form-control" value={conferma} placeholder={CONFERMA}
                      onChange={e => setConferma(e.target.value)} />
                    <button className="btn btn-danger" disabled={busy || conferma !== CONFERMA} onClick={svuota}>
                      🗑 2. Svuota
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Archiviazioni precedenti</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Esportazione</th><th>Documenti</th><th>Scaricata</th><th>Svuotata</th></tr>
            </thead>
            <tbody>
              {stato.storico.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>Nessuna archiviazione.</td></tr>
              ) : stato.storico.map(e => (
                <tr key={e.id}>
                  <td>{fmtData(e.creata_il)}</td>
                  <td>{e.numero_file} ({fmtPeso(e.dimensione)})</td>
                  <td>{fmtData(e.scaricata_il)} · {e.scaricata_da || '—'}</td>
                  <td>{fmtData(e.svuotata_il)} · {e.svuotata_da || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
