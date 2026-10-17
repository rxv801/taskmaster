// Wraps Electron's Notification API.
// Other modules call this instead of touching Electron directly.

import { Notification } from 'electron'

type FocusWarningNotification = {
  title: string
  body: string
}

/* Shows a native Windows/macOS notification for sustained focus distractions. */
export function notifyFocusDistraction({
  title,
  body,
}: FocusWarningNotification) {
  if (!Notification.isSupported()) {
    console.warn('[Taskmaster] Native notifications are not supported.')
    return
  }

  new Notification({
    title,
    body,
    silent: false,
  }).show()
}
