// Manages the Python CV worker process (the WebSocket server in python/main.py).
//
// The worker runs on demand, not for the whole life of the app: the renderer
// calls requestPythonWorker() when it wants detection (e.g. an onboarding check
// or a focus session) and releasePythonWorker() when it's done. The worker is
// started on the first request and stopped shortly after the last release, so
// no Python process runs while nothing is watching the camera.
//
// The renderer connects to the worker's WebSocket directly to stream frames, so
// this module only owns the process lifecycle, not the detection data.

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

// The python/ project folder: this file lives in electron/src/main/, so three
// levels up is the repo root, then into python/.
const pythonProjectDir = path.join(currentDir, '../../../python')

// Port the WebSocket server listens on (must match python/main.py).
const WORKER_PORT = 8765

// Path to the Python interpreter inside the project's virtual environment.
// The folder layout differs by OS (Windows uses Scripts/python.exe).
function venvPythonPath(): string {
  const isWindows = process.platform === 'win32'
  const binDir = isWindows ? 'Scripts' : 'bin'
  const executable = isWindows ? 'python.exe' : 'python'
  return path.join(pythonProjectDir, '.venv', binDir, executable)
}

// The running worker, or null when it isn't running.
let worker: ChildProcess | null = null

// True while we're deliberately shutting the worker down (app quit / stop), so
// the exit handler knows a crash from an intentional kill and doesn't restart.
let stopping = false

// Crash-restart bookkeeping. If the worker keeps dying immediately (e.g. a
// missing dependency), restarting forever just spins, so we cap consecutive
// fast restarts and back off. A restart that survives a while resets the count.
const RESTART_DELAY_MS = 1000
const MAX_RAPID_RESTARTS = 5
// How long the worker must stay up before we treat it as "healthy" again.
const HEALTHY_UPTIME_MS = 10_000
let rapidRestarts = 0
let restartTimer: ReturnType<typeof setTimeout> | null = null

// How many consumers (renderer detection sessions) currently want the worker.
// It runs while this is > 0 and stops shortly after it returns to 0.
let activeConsumers = 0

// Grace period before stopping after the last consumer leaves, so a quick
// pause/resume, page change, or dev double-mount doesn't kill then respawn it.
const STOP_GRACE_MS = 2000
let stopTimer: ReturnType<typeof setTimeout> | null = null

// Ask for the worker. Starts it on the first request and cancels any pending
// grace-period shutdown. Call releasePythonWorker() once for each request.
export function requestPythonWorker(): void {
  activeConsumers += 1
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  startPythonWorker()
}

// Drop one request. When the last consumer leaves, stop the worker after a
// short grace period (a new request during that window cancels the stop).
export function releasePythonWorker(): void {
  activeConsumers = Math.max(0, activeConsumers - 1)
  if (activeConsumers > 0 || stopTimer) {
    return
  }
  stopTimer = setTimeout(() => {
    stopTimer = null
    stopPythonWorker()
  }, STOP_GRACE_MS)
}

// Start the CV worker. No-ops if it's already running. Internal: callers use
// requestPythonWorker() so the worker is reference-counted.
function startPythonWorker(): void {
  if (worker) {
    return
  }
  stopping = false

  // The worker only runs from the project venv (Python 3.11 + the CV deps). If
  // it's missing — e.g. setup was never run, or a Windows clone that skipped
  // setup.ps1 — spawning would fail with a cryptic ENOENT, so flag it loudly
  // and bail. Detection stays off until the user runs setup; the rest of the
  // app is unaffected.
  const pythonPath = venvPythonPath()
  if (!existsSync(pythonPath)) {
    console.error(
      `[python] CV worker venv not found at ${pythonPath}\n` +
        `         Run ./setup.sh (macOS/Linux) or setup.ps1 (Windows) to create it.`,
    )
    return
  }

  // Equivalent to running, from the python/ folder:
  //   .venv/bin/python -m uvicorn main:app --port 8765
  worker = spawn(
    pythonPath,
    ['-m', 'uvicorn', 'main:app', '--port', String(WORKER_PORT)],
    { cwd: pythonProjectDir },
  )

  // Mirror the worker's output into the app console for debugging. uvicorn logs
  // to stderr, so both streams are forwarded.
  const forwardOutput = (data: Buffer) => {
    console.log(`[python] ${data.toString().trim()}`)
  }
  worker.stdout?.on('data', forwardOutput)
  worker.stderr?.on('data', forwardOutput)

  // When the process stops, clear the handle. If it died on its own (not an
  // intentional stop), bring it back up so detection keeps working.
  const startedAt = Date.now()
  worker.on('exit', (code) => {
    console.log(`[python] worker exited (code ${code})`)
    worker = null

    if (stopping) {
      return
    }

    // Nobody is asking for detection anymore (e.g. it crashed during the stop
    // grace period), so don't resurrect a worker no one wants.
    if (activeConsumers === 0) {
      return
    }

    // A worker that ran long enough before dying is treated as a fresh failure,
    // not part of a crash loop, so reset the rapid-restart counter.
    if (Date.now() - startedAt >= HEALTHY_UPTIME_MS) {
      rapidRestarts = 0
    }

    if (rapidRestarts >= MAX_RAPID_RESTARTS) {
      console.error(
        `[python] worker crashed ${rapidRestarts} times in a row; giving up`,
      )
      return
    }

    rapidRestarts += 1
    console.log(`[python] restarting worker (attempt ${rapidRestarts})`)
    restartTimer = setTimeout(startPythonWorker, RESTART_DELAY_MS)
  })

  // Fired when the process can't be spawned at all (e.g. the venv is missing).
  worker.on('error', (error) => {
    console.error('[python] failed to start worker:', error)
    worker = null
  })

  console.log(`[python] CV worker starting on port ${WORKER_PORT}`)
}

// Stop the CV worker immediately. Used by the grace-period timer and as the
// app-quit safety net so the worker never outlives the app, regardless of how
// many consumers think they're still holding it.
export function stopPythonWorker(): void {
  // Mark this as intentional so the exit handler won't restart the worker, and
  // cancel any restart or grace-period stop already queued.
  stopping = true
  activeConsumers = 0
  if (restartTimer) {
    clearTimeout(restartTimer)
    restartTimer = null
  }
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  worker?.kill() // SIGTERM; uvicorn shuts down cleanly
  worker = null
}
