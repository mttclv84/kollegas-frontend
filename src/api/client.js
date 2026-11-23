import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Profilo in sola lettura: le scritture si fermano già qui (il backend le rifiuta comunque).
const SOLA_LETTURA_CONSENTITI = /^\/?auth\/|notifiche/

function isSolaLettura() {
  try { return !!JSON.parse(localStorage.getItem('user'))?.sola_lettura } catch { return false }
}

api.interceptors.request.use((config) => {
  const metodo = (config.method || 'get').toLowerCase()
  if (metodo !== 'get' && isSolaLettura() && !SOLA_LETTURA_CONSENTITI.test(config.url || '')) {
    const detail = 'Profilo in sola lettura: operazione non consentita.'
    return Promise.reject({ config, response: { status: 403, data: { detail } }, message: detail })
  }
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    // Sessione già aperta quando è scattato l'obbligo di cambio password.
    if (err.response?.status === 403 && err.response.data?.codice === 'cambio_password_richiesto') {
      try {
        const utente = JSON.parse(localStorage.getItem('user'))
        localStorage.setItem('user', JSON.stringify({ ...utente, deve_cambiare_password: true }))
      } catch { /* la pagina di login gestisce il caso */ }
      if (window.location.pathname !== '/cambia-password') window.location.href = '/cambia-password'
      return Promise.reject(err)
    }
    // Credenziali errate al login: nessun token da rinnovare, l'errore lo mostra la pagina.
    if (err.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login')) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/refresh/`,
            { refresh }
          )
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
