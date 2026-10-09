/**
 * Native browser notification helpers (Web Notifications API).
 * These are opt-in: the user grants permission from Settings (or the
 * browser prompt), and popups appear even when the app is in another tab.
 */

export function browserNotifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function browserPermission() {
  if (!browserNotifySupported()) return 'unsupported'
  return Notification.permission
}

/** Must be called from a user gesture (e.g. a button click). */
export async function requestBrowserPermission() {
  if (!browserNotifySupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch (_) {
    return 'denied'
  }
}

/**
 * Show a native browser popup. Returns true when actually shown.
 * Silently no-ops when unsupported or permission is not granted.
 */
export function showBrowserNotification(title, body, { onClick = null, tag = 'careermirror' } = {}) {
  if (!browserNotifySupported() || Notification.permission !== 'granted') return false
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag,
      silent: false,
    })
    if (onClick) {
      n.onclick = () => {
        onClick()
        n.close()
      }
    }
    // auto-close so the stack never grows stale
    setTimeout(() => n.close(), 15000)
    return true
  } catch (_) {
    return false
  }
}
