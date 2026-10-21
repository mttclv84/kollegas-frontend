import { useState, useEffect } from 'react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../ui/Modal'

// Stesse soglie colore della pagina Completamento GWU.
const coloreDa = (pct) => pct == null ? '#9CA3AF' : pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
const sfondoDa = (pct) => pct == null ? '#F9FAFB' : pct >= 80 ? '#D1FAE5' : pct >= 50 ? '#FEF3C7' : '#FEE2E2'

const SEMAFORO = {
  valida:      { icona: '🟢', label: 'Valida' },
  in_scadenza: { icona: '🟡', label: 'In scadenza (45 gg)' },
  scaduta:     { icona: '🔴', label: 'Scaduta' },
  mancante:    { icona: '🔴', label: 'Da fare' },
  iscritta:    { icona: '🔵', label: 'Iscritta a un\'aula' },
}

const fmtData = (d) => d ? new Date(d).toLocaleDateString('it-IT') : null
const daFormare = (c) => c.mancante + c.scaduta

const C = 2 * Math.PI * 34

function Anello({ pct, iscrittePct }) {
  const colore = coloreDa(pct)
  const pieno = ((pct || 0) / 100) * C
  const tratteggio = ((iscrittePct || 0) / 100) * C
  return (
    <svg viewBox="0 0 80 80" style={{ width: 84, height: 84, transform: 'rotate(-90deg)' }}>
      <circle cx="40" cy="40" r="34" fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle cx="40" cy="40" r="34" fill="none" stroke={colore} strokeWidth="8"
        strokeDasharray={`${pieno} ${C}`} />
      {tratteggio > 0 && (
        <circle cx="40" cy="40" r="34" fill="none" stroke={colore} strokeWidth="8" strokeOpacity="0.38"
          strokeDasharray={`${tratteggio} ${C}`} strokeDashoffset={-pieno} />
      )}
    </svg>
  )
}

function CardCorso({ corso, dati }) {
  const pct = dati.percentuale
  const iscrittePct = dati.dovuti ? (100 * dati.iscritta) / dati.dovuti : 0
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{corso.nome}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Anello pct={pct} iscrittePct={iscrittePct} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: coloreDa(pct) }}>
            {pct == null ? '—' : `${pct}%`}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
          <div><strong>{dati.conformi}</strong>/{dati.dovuti} in regola</div>
          {daFormare(dati) > 0 && <div style={{ color: '#DC2626' }}>{daFormare(dati)} da formare</div>}
          {dati.in_scadenza > 0 && <div style={{ color: '#B45309' }}>{dati.in_scadenza} in scadenza</div>}
          {dati.iscritta > 0 && <div style={{ color: '#2563EB' }}>{dati.iscritta} iscritti</div>}
          {dati.facoltativi > 0 && (
            <div style={{ color: '#6B7280' }} title="Formazione facoltativa fatta in anticipo da chi non ha ancora l'obbligo">
              ⭐ {dati.facoltativi_fatti}/{dati.facoltativi} pronti per promozione
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GrigliaCorsi({ corsi, riepilogo }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginBottom: 20 }}>
      {corsi.filter(c => riepilogo[c.id]?.dovuti || riepilogo[c.id]?.facoltativi).map(c => (
        <CardCorso key={c.id} corso={c} dati={riepilogo[c.id]} />
      ))}
    </div>
  )
}

function Legenda() {
  return (
    <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', flexWrap: 'wrap', gap: 14, margin: '8px 0 12px' }}>
      {['valida', 'in_scadenza', 'mancante', 'iscritta'].map(s => (
        <span key={s}>{SEMAFORO[s].icona} {s === 'mancante' ? 'Da fare / scaduta' : SEMAFORO[s].label}</span>
      ))}
      <span>⭐ facoltativa già fatta</span>
      <span>— non richiesta</span>
    </div>
  )
}

export function DettaglioNegozio({ negozioId }) {
  const [dati, setDati] = useState(null)

  useEffect(() => {
    setDati(null)
    api.get(`/ehs/completamento/negozio/${negozioId}/`).then(({ data }) => setDati(data))
  }, [negozioId])

  if (!dati) return <div className="loading-center"><div className="spinner" /></div>
  if (dati.persone.length === 0) {
    return <p style={{ color: '#9CA3AF' }}>Nessuna persona soggetta alla formazione obbligatoria.</p>
  }

  const cella = (s) => {
    if (!s) return <span style={{ color: '#D1D5DB' }}>—</span>
    const titolo = [
      s.facoltativo ? 'Facoltativa' : SEMAFORO[s.stato].label,
      s.data && `svolta il ${fmtData(s.data)}`,
      s.scadenza && `scade il ${fmtData(s.scadenza)}`,
    ].filter(Boolean).join(' · ')
    if (s.facoltativo) {
      const fatta = s.stato === 'valida' || s.stato === 'in_scadenza'
      return <span title={titolo} style={{ fontSize: fatta ? 15 : 10, color: '#9CA3AF' }}>{fatta ? '⭐' : 'facolt.'}</span>
    }
    return <span title={titolo} style={{ fontSize: 15 }}>{SEMAFORO[s.stato].icona}</span>
  }

  return (
    <div>
      {/* Cosa fare, in una riga per corso: è la prima cosa che il negozio deve leggere. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {dati.corsi.map(c => {
          const r = dati.riepilogo[c.id]
          if (!r.dovuti) return null
          const n = daFormare(r)
          return (
            <div key={c.id} style={{
              borderRadius: 8, padding: '8px 12px', fontSize: 13, background: sfondoDa(r.percentuale),
              border: `1px solid ${coloreDa(r.percentuale)}`,
            }}>
              <strong>{c.nome}</strong>{' '}
              {n > 0 ? <span style={{ color: '#991B1B' }}>— {n} da formare</span> : <span style={{ color: '#065F46' }}>— tutti in regola</span>}
              {r.in_scadenza > 0 && <span style={{ color: '#92400E' }}> · {r.in_scadenza} in scadenza</span>}
              {r.iscritta > 0 && <span style={{ color: '#1D4ED8' }}> · {r.iscritta} iscritti</span>}
            </div>
          )
        })}
      </div>

      <Legenda />
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #FCA5A5' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 180 }}>Persona</th>
              <th style={{ textAlign: 'left', padding: '10px 12px' }}>Ruolo</th>
              {dati.corsi.map(c => <th key={c.id} style={{ padding: '10px 6px', textAlign: 'center' }}>{c.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {dati.persone.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '7px 12px', fontWeight: 600 }}>{p.nome_completo}</td>
                <td style={{ padding: '7px 12px', color: '#6B7280' }}>
                  {p.ruolo_nome || '—'}
                  {p.mansioni.length > 0 && <div style={{ fontSize: 11 }}>{p.mansioni.join(', ')}</div>}
                </td>
                {dati.corsi.map(c => (
                  <td key={c.id} style={{ textAlign: 'center', padding: 4 }}>{cella(p.stati[c.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CellaPct({ dati }) {
  if (!dati || !dati.dovuti) return <td style={{ textAlign: 'center', color: '#D1D5DB' }}>—</td>
  return (
    <td style={{ textAlign: 'center', padding: 3 }}>
      <div title={`${dati.conformi}/${dati.dovuti} in regola · ${daFormare(dati)} da formare · ${dati.iscritta} iscritti`}
        style={{ background: sfondoDa(dati.percentuale), color: coloreDa(dati.percentuale), borderRadius: 6,
          padding: '4px 2px', fontWeight: 700, fontSize: 12 }}>
        {dati.percentuale}%
        <div style={{ fontWeight: 400, fontSize: 10, color: '#6B7280' }}>{dati.conformi}/{dati.dovuti}</div>
      </div>
    </td>
  )
}

function Mappa({ dati, area, onApri }) {
  const aree = dati.aree.filter(a => !area || a.numero === Number(area))
  // Negozi senza alcun obbligo (es. Regional Office) non entrano nella mappa.
  const negozi = dati.negozi.filter(n => dati.corsi.some(c => n.corsi[c.id]?.dovuti))
  const gruppi = [
    ...aree.map(a => ({ titolo: `Area ${a.numero}`, sotto: [a.area_manager_retail, a.area_bp].filter(Boolean).join(' · '),
      totale: a.corsi, negozi: negozi.filter(n => n.area === a.numero) })),
    ...(!area ? [{ titolo: 'Senza area', negozi: negozi.filter(n => n.area == null) }] : []),
  ].filter(g => g.negozi.length)

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #FCA5A5' }}>
            <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 190 }}>Negozio</th>
            {dati.corsi.map(c => <th key={c.id} style={{ padding: '10px 4px', minWidth: 78 }}>{c.nome}</th>)}
          </tr>
        </thead>
        <tbody>
          {gruppi.map(g => [
            <tr key={`g-${g.titolo}`} style={{ background: '#FEF2F2', borderTop: '2px solid #FCA5A5' }}>
              <td style={{ padding: '8px 12px', fontWeight: 800 }}>
                {g.titolo}
                {g.sotto && <div style={{ fontWeight: 400, fontSize: 11, color: '#6B7280' }}>{g.sotto}</div>}
              </td>
              {dati.corsi.map(c => g.totale ? <CellaPct key={c.id} dati={g.totale[c.id]} /> : <td key={c.id} />)}
            </tr>,
            ...g.negozi.map(n => (
              <tr key={n.id} onClick={() => onApri(n)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                title="Apri il dettaglio persone">
                <td style={{ padding: '6px 12px 6px 22px', fontWeight: 600, color: '#1F2937' }}>
                  🔍 {n.nome}
                  <span style={{ fontWeight: 400, fontSize: 11, color: '#9CA3AF' }}> · {n.persone} persone</span>
                </td>
                {dati.corsi.map(c => <CellaPct key={c.id} dati={n.corsi[c.id]} />)}
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  )
}

export default function EHSCompletamentoObblighi() {
  const { user } = useAuth()
  const isStore = user?.livello_accesso === 'store'
  const [dati, setDati] = useState(null)
  const [area, setArea] = useState('')
  const [negozio, setNegozio] = useState(null)

  useEffect(() => {
    if (isStore) return
    api.get('/ehs/completamento/').then(({ data }) => setDati(data))
  }, [isStore])

  if (isStore) return <DettaglioNegozio negozioId={user.store_id} />
  if (!dati) return <div className="loading-center"><div className="spinner" /></div>

  const riepilogo = area ? dati.aree.find(a => a.numero === Number(area))?.corsi || {} : dati.italia

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Vista:</label>
        <select className="form-control" style={{ maxWidth: 260 }} value={area} onChange={e => setArea(e.target.value)}>
          <option value="">🇮🇹 Italia — tutti i negozi</option>
          {dati.aree.map(a => <option key={a.numero} value={a.numero}>Area {a.numero}</option>)}
        </select>
      </div>
      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 0 }}>
        % = persone in regola sul totale di chi ha l'obbligo (Retail Assistant esclusi) · tratteggio = iscritti a un'aula confermata ·
        ⭐ = facoltativa fatta in anticipo, non conteggiata nella %.
      </p>

      <GrigliaCorsi corsi={dati.corsi} riepilogo={riepilogo} />
      <Mappa dati={dati} area={area} onApri={setNegozio} />

      {negozio && (
        <Modal title={`${negozio.nome} — formazione obbligatoria`} onClose={() => setNegozio(null)} size="xl">
          <DettaglioNegozio negozioId={negozio.id} />
        </Modal>
      )}
    </div>
  )
}
