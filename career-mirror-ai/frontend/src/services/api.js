import axios from 'axios'

// VITE_API_URL overrides the dev proxy (e.g. http://localhost:8000)
const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export const api = axios.create({ baseURL, timeout: 120000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('careermirror_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401 && !error.config?.url?.includes('/auth/login') &&
        !error.config?.url?.includes('/auth/register') &&
        !error.config?.url?.includes('/auth/google')) {
      // session expired / invalid -> clear and bounce to login
      localStorage.removeItem('careermirror_token')
      localStorage.removeItem('careermirror_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/** Extract a friendly error message from an API error response. */
export function errMsg(error, fallback = 'Something went wrong. Please try again.') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
  }
  if (error?.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Make sure the backend is running (uvicorn on port 8000).'
  }
  return fallback
}
