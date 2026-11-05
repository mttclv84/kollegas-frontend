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
    if (err.response?.status === 401 && !original._retry) {
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
