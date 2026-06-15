// Shared browser activity payloads for the dev extension HTTP bridge.
// Raw URLs are kept in memory only and are not persisted by Taskmaster.

export type BrowserActivityPayload = {
  source: 'taskmaster-browser-extension'
  title: string
  url: string
  domain: string
  browser: 'chromium'
  timestamp: number
}
