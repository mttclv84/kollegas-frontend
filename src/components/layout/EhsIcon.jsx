// Icone della sezione EHS: simbolo bianco su quadratino rosso, per distinguerle
// dalle emoji colorate delle altre sezioni.
const SIMBOLI = {
  casco: (
    <>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M10 7.3V5h4v2.3" />
      <path d="M2.5 15h19v2.5h-19z" />
    </>
  ),
  calendario: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  fornitori: (
    <>
      <path d="M4 20V5.5L12 3v17M12 9h8v11" />
      <path d="M2.5 20h19M7.5 8h1.5M7.5 12h1.5M7.5 16h1.5M15.5 13h1.5M15.5 16.5h1.5" />
    </>
  ),
  corsi: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
      <path d="M12 6.5V20" />
    </>
  ),
  richieste: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  obblighi: (
    <>
      <path d="M2 9.5 12 5l10 4.5-10 4.5z" />
      <path d="M6 11.5v4.5c3.5 2.5 8.5 2.5 12 0v-4.5M22 9.5v5" />
    </>
  ),
}

export default function EhsIcon({ nome }) {
  return (
    <span className="ehs-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {SIMBOLI[nome]}
      </svg>
    </span>
  )
}
