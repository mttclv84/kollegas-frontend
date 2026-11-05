import { useEffect, useMemo } from 'react'

// Tasti che modificano o esportano dati: per i profili in sola lettura vengono nascosti
// (il backend rifiuta comunque ogni scrittura). Si confronta testo e title del tasto.
const AZIONI = /^\s*(\+|✓|✏️|♻️|🗑|🚫)|\b(salva|elimina|assegna|nuov[oa]|aggiungi|crea|invia|approva|rifiuta|accetta|conferma|contro-proponi|inserisci|gestisci|annulla attività|ho caricato|rinnovo|completata|aggiorna|applica|sostituisci|duplica|modifica|importa|export|esporta|scarica|stampa|pdf|disattiva|riattiva|richiedi|carica|rimuovi|registra|segna|visto|valuta|iscrivi|password|cancella)/i

function nascondiAzioni(radice) {
  radice.querySelectorAll('button:not([data-sl])').forEach(b => {
    b.dataset.sl = '1'
    if (b.closest('.sidebar')) return
    if (AZIONI.test(`${b.textContent} ${b.title || ''}`)) {
      b.dataset.slAzione = '1'
      b.style.display = 'none'
    }
  })
  // I moduli che servono a salvare (hanno un tasto di azione) restano visibili ma non compilabili.
  radice.querySelectorAll('form').forEach(f => {
    if (!f.querySelector('[data-sl-azione]')) return
    f.querySelectorAll('input, select, textarea').forEach(c => { if (!c.disabled) c.disabled = true })
  })
}

function filigranaSvg(testo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240">
    <text x="210" y="120" text-anchor="middle" transform="rotate(-28 210 120)"
      font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="rgba(17,24,39,0.11)">${testo}</text></svg>`
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
}

export default function SolaLettura({ user }) {
  const sfondo = useMemo(() => {
    const ora = new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
    return filigranaSvg(`${user.nome_completo} · ${user.email} · ${ora}`)
  }, [user])

  useEffect(() => {
    nascondiAzioni(document.body)
    const obs = new MutationObserver(() => nascondiAzioni(document.body))
    obs.observe(document.body, { childList: true, subtree: true })

    const blocca = (e) => e.preventDefault()
    const tasti = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'c', 'a', 'x'].includes(e.key.toLowerCase())) e.preventDefault()
    }
    document.addEventListener('contextmenu', blocca)
    document.addEventListener('copy', blocca)
    document.addEventListener('cut', blocca)
    document.addEventListener('dragstart', blocca)
    document.addEventListener('keydown', tasti)
    document.body.classList.add('sola-lettura')
    return () => {
      obs.disconnect()
      document.removeEventListener('contextmenu', blocca)
      document.removeEventListener('copy', blocca)
      document.removeEventListener('cut', blocca)
      document.removeEventListener('dragstart', blocca)
      document.removeEventListener('keydown', tasti)
      document.body.classList.remove('sola-lettura')
    }
  }, [])

  return (
    <>
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none', backgroundImage: sfondo,
      }} />
      <div style={{
        position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 99991,
        background: '#111827', color: '#fff', padding: '6px 16px', borderRadius: 999, fontSize: 12,
        fontWeight: 700, letterSpacing: 0.5, boxShadow: '0 4px 14px rgba(0,0,0,0.25)', pointerEvents: 'none',
      }}>
        👁 PROFILO IN SOLA LETTURA
      </div>
    </>
  )
}
