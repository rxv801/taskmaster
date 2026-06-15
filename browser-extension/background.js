// Dev-only Taskmaster browser activity bridge.
// Privacy behavior: this service worker asks localhost whether monitoring is
// active before reading the active tab URL/title. When Taskmaster says disabled,
// no tab metadata is read or sent.

const BRIDGE_ORIGIN = 'http://127.0.0.1:17382'
const STATUS_URL = `${BRIDGE_ORIGIN}/taskmaster-browser-monitor/status`
const ACTIVITY_URL = `${BRIDGE_ORIGIN}/taskmaster-browser-monitor/activity`
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

// Asks the local Electron bridge whether browser monitoring is currently active.
async function isMonitoringEnabled() {
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

// Sends tab metadata to localhost only. Failures are expected when Taskmaster is closed.
async function sendActivity(payload) {
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
