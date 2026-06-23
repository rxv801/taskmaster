#!/usr/bin/env node
// Native Messaging host for Taskmaster Browser Monitor.
// Reads Chrome length-prefixed JSON from stdin, validates messages, and forwards
// active-tab metadata to the local Taskmaster desktop app bridge.

const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

const BRIDGE_HOST = '127.0.0.1'
const BRIDGE_PORT = 17382
const STATUS_PATH = '/taskmaster-browser-monitor/status'
const ACTIVITY_PATH = '/taskmaster-browser-monitor/activity'
const MAX_MESSAGE_BYTES = 1024 * 1024
const BRIDGE_TOKEN_HEADER = 'X-Taskmaster-Bridge-Token'

let inputBuffer = Buffer.alloc(0)

process.stdin.on('data', (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk])
  readAvailableMessages()
})

process.stdin.on('end', () => {
  process.exit(0)
})

process.stdin.resume()

function readAvailableMessages() {
  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0)

    if (messageLength > MAX_MESSAGE_BYTES) {
      writeNativeResponse({ ok: false, error: 'Message too large' })
      process.exit(1)
    }

    if (inputBuffer.length < messageLength + 4) {
      return
    }

    const messageBuffer = inputBuffer.subarray(4, messageLength + 4)
    inputBuffer = inputBuffer.subarray(messageLength + 4)

    void handleNativeMessage(messageBuffer)
  }
}

async function handleNativeMessage(messageBuffer) {
  let message

  try {
    message = JSON.parse(messageBuffer.toString('utf8'))
  } catch {
    writeNativeResponse({ ok: false, error: 'Invalid JSON' })
    return
  }

  if (!isRecord(message) || typeof message.type !== 'string') {
    writeNativeResponse({ ok: false, error: 'Invalid message shape' })
    return
  }

  if (message.type === 'taskmaster-browser-monitor-status') {
    await handleStatusMessage()
    return
  }

  if (message.type === 'taskmaster-browser-activity') {
    await handleActivityMessage(message.payload)
    return
  }

  writeNativeResponse({ ok: false, error: 'Unknown message type' })
}

async function handleStatusMessage() {
  try {
    const status = await requestTaskmaster({
      method: 'GET',
      path: STATUS_PATH,
    })

    writeNativeResponse({
      ok: true,
      enabled: status.enabled === true,
    })
  } catch {
    writeNativeResponse({
      ok: false,
      enabled: false,
      error: 'Taskmaster bridge unavailable',
    })
  }
}

async function handleActivityMessage(payload) {
  const validatedPayload = parseBrowserActivityPayload(payload)

  if (!validatedPayload) {
    writeNativeResponse({ ok: false, error: 'Invalid activity payload' })
    return
  }

  try {
    const response = await requestTaskmaster({
      method: 'POST',
      path: ACTIVITY_PATH,
      body: validatedPayload,
    })

    writeNativeResponse({
      ok: true,
      accepted: response.accepted === true,
    })
  } catch {
    writeNativeResponse({
      ok: false,
      accepted: false,
      error: 'Taskmaster bridge unavailable',
    })
  }
}

function requestTaskmaster({ method, path, body }) {
  const requestBody = body ? JSON.stringify(body) : ''
  const bridgeToken = readBridgeToken()

  if (!bridgeToken) {
    return Promise.reject(new Error('Taskmaster bridge token unavailable'))
  }

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: BRIDGE_HOST,
        port: BRIDGE_PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          [BRIDGE_TOKEN_HEADER]: bridgeToken,
        },
      },
      (response) => {
        const chunks = []

        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8')

          if (!response.statusCode || response.statusCode >= 400) {
            reject(new Error(`Taskmaster returned ${response.statusCode}`))
            return
          }

          try {
            resolve(rawBody ? JSON.parse(rawBody) : {})
          } catch {
            reject(new Error('Taskmaster returned invalid JSON'))
          }
        })
      }
    )

    request.on('error', reject)
    request.write(requestBody)
    request.end()
  })
}

// Reads the per-app-run bridge token created by Taskmaster before forwarding.
function readBridgeToken() {
  try {
    const tokenFile = fs.readFileSync(getBridgeTokenPath(), 'utf8')
    const tokenPayload = JSON.parse(tokenFile)

    if (typeof tokenPayload.token === 'string') {
      return tokenPayload.token
    }
  } catch {
    return null
  }

  return null
}

function getBridgeTokenPath() {
  if (process.env.TASKMASTER_BROWSER_BRIDGE_TOKEN_PATH) {
    return process.env.TASKMASTER_BROWSER_BRIDGE_TOKEN_PATH
  }

  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || os.homedir(),
      'Taskmaster',
      'browser-bridge-token.json'
    )
  }

  if (process.platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Taskmaster',
      'browser-bridge-token.json'
    )
  }

  return path.join(os.homedir(), '.config', 'Taskmaster', 'browser-bridge-token.json')
}

function parseBrowserActivityPayload(value) {
  if (!isRecord(value)) {
    return null
  }

  if (
    value.source !== 'taskmaster-browser-extension' ||
    value.browser !== 'chromium' ||
    typeof value.title !== 'string' ||
    typeof value.url !== 'string' ||
    typeof value.domain !== 'string' ||
    typeof value.timestamp !== 'number'
  ) {
    return null
  }

  return {
    source: 'taskmaster-browser-extension',
    title: value.title.slice(0, 500),
    url: value.url.slice(0, 2048),
    domain: value.domain.slice(0, 255),
    browser: 'chromium',
    timestamp: value.timestamp,
  }
}

function writeNativeResponse(message) {
  const response = Buffer.from(JSON.stringify(message), 'utf8')
  const header = Buffer.alloc(4)

  header.writeUInt32LE(response.length, 0)
  process.stdout.write(Buffer.concat([header, response]))
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}
