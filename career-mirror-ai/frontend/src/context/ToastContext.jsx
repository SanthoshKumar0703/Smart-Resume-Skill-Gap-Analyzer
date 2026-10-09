import { createContext, useCallback, useContext, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { browserNotifySupported, showBrowserNotification } from '../utils/browserNotify'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((title, message = '', kind = 'success', timeout = 5200) => {
    const id = ++toastId
    setToasts((ts) => [...ts, { id, title, message, kind }])

    const browserTitle = title || 'Career Mirror AI'
    const browserMessage = message || 'A change was made in the app.'

    if (browserNotifySupported() && Notification.permission === 'granted') {
      showBrowserNotification(browserTitle, browserMessage, {
        tag: `toast-${kind}-${id}`,
        onClick: () => window.focus(),
      })
    }

    setTimeout(() => dismiss(id), timeout)
  }, [dismiss])

  const toast = {
    success: (title, msg) => push(title, msg, 'success'),
    error: (title, msg) => push(title, msg, 'error', 7000),
    info: (title, msg) => push(title, msg, 'info'),
    warn: (title, msg) => push(title, msg, 'warn'),
  }

  const icons = {
    success: <CheckCircle2 />,
    error: <AlertCircle />,
    info: <Info />,
    warn: <Info />,
  }
  const colors = {
    success: 'var(--success)',
    error: 'var(--danger)',
    info: 'var(--info)',
    warn: 'var(--warn)',
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" style={{ '--toast-color': colors[t.kind] }}>
            <span>{icons[t.kind]}</span>
            <div style={{ flex: 1 }}>
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-msg">{t.message}</div>}
            </div>
            <button className="input-toggle" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
