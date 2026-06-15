// Dev-only localhost bridge for the Taskmaster browser extension prototype.
// This accepts active tab metadata only while a focus session has enabled monitoring.

import http from 'node:http'
import type { BrowserActivityPayload } from '../shared/browserActivity.ts'

const BRIDGE_HOST = '127.0.0.1'
const BRIDGE_PORT = 17382
const STATUS_PATH = '/taskmaster-browser-monitor/status'
const ACTIVITY_PATH = '/taskmaster-browser-monitor/activity'

type BrowserActivityListener = (payload: BrowserActivityPayload) => void

let server: http.Server | null = null
let isBrowserMonitoringActive = false
let latestBrowserActivity: BrowserActivityPayload | null = null
let notifyRenderer: BrowserActivityListener | null = null

/* Starts the dev HTTP bridge once the Electron app is ready. */
export function startBrowserActivityBridge(onActivity: BrowserActivityListener) {
  notifyRenderer = onActivity

  if (server) {
    return
  }

  server = http.createServer((request, response) => {
    addCorsHeaders(response)

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    const requestUrl = new URL(request.url ?? '/', `http://${BRIDGE_HOST}:${BRIDGE_PORT}`)

    if (requestUrl.pathname === STATUS_PATH) {
      handleStatusRequest(request, response)
      return
    }

    if (requestUrl.pathname === ACTIVITY_PATH) {
      handleActivityRequest(request, response)
      return
    }

    sendJson(response, 404, { error: 'Not found' })
  })

  server.listen(BRIDGE_PORT, BRIDGE_HOST, () => {
    console.log(`[Taskmaster] Browser activity bridge listening on ${BRIDGE_HOST}:${BRIDGE_PORT}`)
  })

  server.on('error', (error) => {
    console.error('[Taskmaster] Browser activity bridge failed:', error)
  })
}

/* Closes the local bridge during app shutdown. */
export function stopBrowserActivityBridge() {
  setBrowserMonitoringActive(false)

  if (!server) {
    return
  }

  server.close()
  server = null
}

/* Controls whether the extension is allowed to read and send active tab data. */
export function setBrowserMonitoringActive(isActive: boolean) {
  isBrowserMonitoringActive = isActive

  if (!isActive) {
    latestBrowserActivity = null
  }
}

/* Returns the latest in-memory browser activity snapshot for newly active renderers. */
export function getLatestBrowserActivity() {
  return latestBrowserActivity
}

/* Responds to extension status checks before the extension reads tab metadata. */
function handleStatusRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse
) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  sendJson(response, 200, { enabled: isBrowserMonitoringActive })
}

/* Accepts the latest active tab payload while monitoring is enabled. */
function handleActivityRequest(
  request: http.IncomingMessage,
  response: http.ServerResponse
) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  if (!isBrowserMonitoringActive) {
    sendJson(response, 403, { error: 'Browser monitoring is not active' })
    return
  }

  readJsonBody(request, response, (body) => {
    const payload = parseBrowserActivityPayload(body)

    if (!payload) {
      sendJson(response, 400, { error: 'Invalid browser activity payload' })
      return
    }

    latestBrowserActivity = payload
    notifyRenderer?.(payload)
    sendJson(response, 202, { accepted: true })
  })
}

/* Reads a small JSON request body without adding an HTTP framework dependency. */
function readJsonBody(
  request: http.IncomingMessage,
  response: http.ServerResponse,
  onBody: (body: unknown) => void
) {
  const chunks: Buffer[] = []
  let bodySize = 0

  request.on('data', (chunk: Buffer) => {
    bodySize += chunk.length

    if (bodySize > 32_768) {
      sendJson(response, 413, { error: 'Payload too large' })
      request.destroy()
      return
    }

    chunks.push(chunk)
  })

  request.on('end', () => {
    try {
      onBody(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON' })
    }
  })
}

/* Validates the extension payload before it reaches renderer windows. */
function parseBrowserActivityPayload(body: unknown): BrowserActivityPayload | null {
  if (!isRecord(body)) {
    return null
  }

  if (
    body.source !== 'taskmaster-browser-extension' ||
    body.browser !== 'chromium' ||
    typeof body.title !== 'string' ||
    typeof body.url !== 'string' ||
    typeof body.domain !== 'string' ||
    typeof body.timestamp !== 'number'
  ) {
    return null
  }

  return {
    source: 'taskmaster-browser-extension',
    title: body.title.slice(0, 500),
    url: body.url.slice(0, 2048),
    domain: body.domain.slice(0, 255),
    browser: 'chromium',
    timestamp: body.timestamp,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/* Allows the unpacked dev extension to call the local bridge during development. */
function addCorsHeaders(response: http.ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

/* Writes consistent JSON responses for status, validation, and activity calls. */
function sendJson(response: http.ServerResponse, statusCode: number, body: object) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}
