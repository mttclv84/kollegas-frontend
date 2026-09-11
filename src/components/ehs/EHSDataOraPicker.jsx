const TIME_SLOTS = (() => {
  const slots = []
  for (let h = 6; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
})()

// Data (input nativo) + orario a tendina limitato a 00/30 minuti: impossibile
// inserire un valore diverso, a differenza dello step su datetime-local che
// vincola solo le frecce e non la digitazione manuale.
export default function EHSDataOraPicker({ value, onChange, style }) {
  const [data, ora] = value ? value.split('T') : ['', '']

  const setData = (nuovaData) => onChange(nuovaData && ora ? `${nuovaData}T${ora}` : nuovaData ? `${nuovaData}T09:00` : '')
  const setOra = (nuovaOra) => onChange(data ? `${data}T${nuovaOra}` : '')

  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <input type="date" className="form-control" value={data || ''} onChange={e => setData(e.target.value)} />
      <select className="form-control" value={ora || ''} onChange={e => setOra(e.target.value)}>
        <option value="">— Ora —</option>
        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}
