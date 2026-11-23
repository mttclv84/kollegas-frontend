import { useEffect, useRef, useState } from 'react'

const DURATA_MS = 1000

// Campo password con occhio: un clic la mostra per 1 secondo, poi torna nascosta.
export default function PasswordInput({ className = 'form-control', style, ...props }) {
  const [visibile, setVisibile] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const mostra = () => {
    clearTimeout(timer.current)
    setVisibile(true)
    timer.current = setTimeout(() => setVisibile(false), DURATA_MS)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input {...props} type={visibile ? 'text' : 'password'} className={className}
        style={{ ...style, paddingRight: 40 }} />
      <button type="button" onClick={mostra} aria-label="Mostra la password per 1 secondo"
        title="Mostra per 1 secondo"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 38, padding: 0, border: 'none',
          background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: visibile ? 'var(--color-primary)' : '#6B7280',
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  )
}
