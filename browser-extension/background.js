// Taskmaster Browser Monitor service worker.
// This file owns active-tab metadata collection for the browser extension.
//
// Privacy behavior:
// - No external servers are used.
// - No content scripts are used.
// - Page content, cookies, form inputs, and the browsing history API are never read.
// - The active tab URL/title is queried only after Taskmaster says monitoring is active.
//
// Transport is intentionally separated from tab collection. Production uses
// Native Messaging; the old localhost path is retained only for local debugging.

const BRIDGE_ORIGIN = 'http://127.0.0.1:17382'
const STATUS_URL = `${BRIDGE_ORIGIN}/taskmaster-browser-monitor/status`
const ACTIVITY_URL = `${BRIDGE_ORIGIN}/taskmaster-browser-monitor/activity`
const NATIVE_HOST_NAME = 'com.taskmaster.browser_monitor'
const TRANSPORT_MODE = 'native-messaging'
const INTERNAL_URL_PREFIXES = [
  'chrome://',
  'edge://',
  'opera://',
  'about:',
  'devtools://',
]

let pendingReportTimer = null

// Tab activation means the user changed tabs, but we still check Taskmaster
// status before reading the active tab metadata.
chrome.tabs.onActivated.addListener(() => {
  queueActiveTabReport()
})

// Tab updates can mean title or URL changes. The handler only queues work, and
// the status check happens before any active tab data is queried.
chrome.tabs.onUpdated.addListener(() => {
  queueActiveTabReport()
})

// Browser window focus changes can reveal a new active tab, so queue a report
// after confirming the browser has a real focused window.
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    queueActiveTabReport()
  }
})

// Debounces noisy browser events so quick tab changes do not spam localhost.
function queueActiveTabReport() {
  if (pendingReportTimer !== null) {
    clearTimeout(pendingReportTimer)
  }

  pendingReportTimer = setTimeout(() => {
    pendingReportTimer = null
    reportActiveTabIfMonitoring()
  }, 150)
}

// Main privacy gate. This does not query tabs unless Taskmaster says a focus
// session is running or paused.
async function reportActiveTabIfMonitoring() {
  if (!(await isMonitoringEnabled())) {
    return
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!tab?.url || shouldIgnoreUrl(tab.url)) {
    return
  }

  const payload = createPayload(tab)

  if (!payload) {
    return
  }

  await sendActivity(payload)
}

// Asks the active transport whether browser monitoring is currently enabled.
async function isMonitoringEnabled() {
  if (TRANSPORT_MODE === 'native-messaging') {
    return isNativeMonitoringEnabled()
  }

  return isDevLocalhostMonitoringEnabled()
}

// Production status check. Chrome launches the registered Native Messaging host,
// then the host asks the local Taskmaster bridge whether monitoring is active.
async function isNativeMonitoringEnabled() {
  try {
    const response = await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
      type: 'taskmaster-browser-monitor-status',
    })

    return response?.enabled === true
  } catch {
    return false
  }
}

// Dev-only localhost status check retained for local prototype testing.
async function isDevLocalhostMonitoringEnabled() {
  try {
    const response = await fetch(STATUS_URL, { method: 'GET' })

    if (!response.ok) {
      return false
    }

    const status = await response.json()

    return status.enabled === true
  } catch {
    return false
  }
}

// Converts the active Chrome/Opera tab into Taskmaster's dev bridge payload.
function createPayload(tab) {
  try {
    const url = new URL(tab.url)

    return {
      source: 'taskmaster-browser-extension',
      title: tab.title || 'Untitled tab',
      url: tab.url,
      domain: url.hostname,
      browser: 'chromium',
      timestamp: Date.now(),
    }
  } catch {
    return null
  }
}

// Internal browser pages are skipped because they are not useful focus signals.
function shouldIgnoreUrl(url) {
  const normalizedUrl = url.toLowerCase()

  return INTERNAL_URL_PREFIXES.some((prefix) => normalizedUrl.startsWith(prefix))
}

// Sends tab metadata through the active transport.
async function sendActivity(payload) {
  if (TRANSPORT_MODE === 'native-messaging') {
    await sendNativeActivity(payload)
    return
  }

  await sendDevLocalhostActivity(payload)
}

// Production sender. The native host validates and forwards this to Taskmaster.
async function sendNativeActivity(payload) {
  try {
    await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
      type: 'taskmaster-browser-activity',
      payload,
    })
  } catch {
    // Native Messaging is expected to be unavailable until the host is installed.
  }
}

// Dev-only localhost sender. This is not the official production transport.
async function sendDevLocalhostActivity(payload) {
  try {
    await fetch(ACTIVITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // The bridge only exists while Taskmaster dev is running.
  }
}
