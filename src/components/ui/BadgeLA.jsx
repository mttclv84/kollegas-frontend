// Segnale accanto al nome di chi è in Long Absence, nelle liste di chi deve fare o ha fatto un'attività.
export default function BadgeLA({ attivo }) {
  if (!attivo) return null
  return (
    <span title="Long Absence" aria-label="Long Absence"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 6, verticalAlign: 'middle',
        fontSize: 9.5, fontWeight: 800, lineHeight: 1, letterSpacing: '0.03em', whiteSpace: 'nowrap',
        color: '#92400E', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 4, padding: '2px 4px',
      }}>
      ⚠ LA
    </span>
  )
}
