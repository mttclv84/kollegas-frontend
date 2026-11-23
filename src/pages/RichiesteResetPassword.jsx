import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/client'
import Modal from '../components/ui/Modal'

export function PasswordTemporaneaModal({ dati, onClose }) {
  const copia = async () => {
    try {
      await navigator.clipboard.writeText(dati.password)
      toast.success('Password copiata.')
    } catch {
      toast.error('Copia non riuscita: selezionala a mano.')
    }
  }
  return (
    <Modal title="Password temporanea" onClose={onClose} size="sm">
      <p style={{ marginBottom: 8 }}><strong>{dati.nome}</strong></p>
      <p style={{ fontFamily: 'monospace', background: '#F1F5F9', padding: 12, borderRadius: 6, fontSize: 16, letterSpacing: 1, userSelect: 'all' }}>
        {dati.password}
      </p>
      <p style={{ fontSize: 13, color: '#92400E', marginTop: 10 }}>
        Viene mostrata solo ora. Comunicala direttamente alla persona: vale 5 giorni e al primo accesso dovrà cambiarla.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn btn-secondary" onClick={copia}>Copia</button>
        <button className="btn btn-primary" onClick={onClose}>Chiudi</button>
      </div>
    </Modal>
  )
}

export default function RichiesteResetPassword() {
  const [richieste, setRichieste] = useState(null)
  const [busy, setBusy] = useState(null)
  const [mostrata, setMostrata] = useState(null)

  const carica = useCallback(() => {
    api.get('/richieste-reset-password/').then(({ data }) => setRichieste(data))
      .catch(() => { setRichieste([]); toast.error('Errore nel caricamento.') })
  }, [])
  useEffect(carica, [carica])

  const decidi = async (r, azione) => {
    const domanda = azione === 'reset'
      ? `Generare una password temporanea per ${r.utente_nome}? La password attuale smetterà di funzionare.`
      : `Rifiutare la richiesta di ${r.utente_nome}?`
    if (!window.confirm(domanda)) return
    setBusy(r.id)
    try {
      const { data } = await api.post(`/richieste-reset-password/${r.id}/`, { azione })
      if (azione === 'reset') setMostrata({ nome: r.utente_nome, password: data.password_temporanea })
      else toast.success('Richiesta rifiutata.')
      carica()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <h1 className="page-title">🔑 Richieste reset password</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginTop: -8, marginBottom: 16, maxWidth: 760 }}>
        Prima di procedere verifica che la richiesta arrivi davvero dalla persona indicata.
      </p>
      <div className="card">
        {richieste === null ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : richieste.length === 0 ? (
          <div className="card-body" style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>Nessuna richiesta in attesa.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Persona</th><th>Email</th><th>Profilo</th><th>Workplace</th><th>Richiesta il</th><th>Azioni</th></tr>
              </thead>
              <tbody>
                {richieste.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.utente_nome}</td>
                    <td>{r.email}</td>
                    <td>{r.livello_accesso}</td>
                    <td>{r.store_nome || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-primary btn-sm" disabled={busy === r.id} onClick={() => decidi(r, 'reset')}>Genera password</button>{' '}
                      <button className="btn btn-secondary btn-sm" disabled={busy === r.id} onClick={() => decidi(r, 'rifiuta')}>Rifiuta</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {mostrata && <PasswordTemporaneaModal dati={mostrata} onClose={() => setMostrata(null)} />}
    </div>
  )
}
