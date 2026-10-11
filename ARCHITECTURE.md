# Taskmaster — Architecture Guide

A map of how the app is wired: the moving parts, how they talk to each other,
where the important logic actually lives, and *why* each piece exists. Written
to be read without opening the code. If you only read one doc to understand the
project, read this one.

> New to Electron/CV apps? There's a plain-English [glossary](#glossary) at the
> bottom. Terms like *main process*, *renderer*, *IPC*, and *WebSocket* are
> explained there.

---

## The 10-second mental model

Taskmaster is **three programs that talk to each other**, plus a browser
extension:

1. **Electron main process** — the "backend." Has full OS access. Spawns things,
   watches the active window, runs local servers.
2. **Electron renderer** — the "frontend." A React web app in a window. It also
   owns the **webcam** and does a surprising amount of the real logic.
3. **Python CV worker** — a separate program that looks at webcam frames and
   answers two questions: *is a phone visible?* and *are you looking at the
   screen?*
4. **Browser extension + native host** — reports which website is in your active
   browser tab.

The golden rule: **the renderer (frontend) is the brain.** The main process and
Python worker are services it drives. This is unusual, and it's the single most
important thing to internalize (see [Where logic
lives](#where-does-x-live-the-cheat-sheet)).

---

## The big picture

```
                         ELECTRON APP
 ┌───────────────────────────────────────────────────────────┐
 │                                                           │
 │   MAIN PROCESS (Node.js, full OS access)                  │
 │   ├─ spawns + supervises the Python worker                │
 │   ├─ polls the active OS window (active-win)              │
 │   ├─ runs a local HTTP bridge for the browser extension   │
 │   └─ talks to the UI over IPC (via preload)               │
 │                          ▲                                 │
 │                          │ IPC (preload bridge)            │
 │                          ▼                                 │
 │   RENDERER (React UI, owns the webcam)                     │
 │   ├─ runs the session timer + focus logic                 │
 │   ├─ classifies activity against your rules               │
 │   └─ streams webcam frames ──┐                            │
 └──────────────────────────────┼────────────────────────────┘
                                │ WebSocket (JPEG in, events out)
                                ▼
                     PYTHON CV WORKER  (localhost:8765)
                     ├─ Phone: YOLOX  (via ONNX Runtime)
                     └─ Gaze:  MediaPipe FaceLandmarker

    Chrome/Edge ──► Extension ──► Native host ──► HTTP bridge (localhost:17382)
                                                     └─► IPC ─► Renderer
```

Two things to notice:

- The **webcam never touches Python.** The renderer captures frames and *sends*
  them to Python. Python never opens a camera. (This sidesteps a messy
  "browser camera ID vs. OpenCV camera index" mismatch — see [design
  decisions](#key-design-decisions-and-why).)
- Everything runs **locally**. The two servers (`:8765`, `:17382`) are bound to
  `127.0.0.1` — nothing leaves your machine, no cloud, no account.

---

## The main flows (as stories)

### 1. Camera → detection (the CV loop)

This is the heart of the app. Follow it once and a lot clicks.

1. A session (or the onboarding camera check) starts, so the renderer wants
   detection. The hook **`useCvDetection.ts`** runs.
2. It calls `window.taskmaster.cv.request()` → over IPC → the main process
   **`python-bridge.ts`** spawns the Python worker (if not already running).
3. The renderer opens the **webcam** in the browser, grabs **one frame per
   second**, downscales it to 640px wide, and encodes it to JPEG.
4. It connects to the worker's **WebSocket** (`ws://127.0.0.1:8765/ws`) and
   sends each JPEG.
5. **`python/main.py`** decodes the frame and runs both detectors:
   - `cv/phone_detector.py` → YOLOX object detection, filtered to COCO's "cell
     phone" class.
   - `cv/gaze_detector.py` → MediaPipe FaceLandmarker → head pose (yaw/pitch).
6. The worker sends two JSON events back (`{type:"phone"...}`,
   `{type:"gaze"...}`). The hook stores them as React state; the UI reads them.
7. On stop/unmount, the hook stops the camera and calls `cv.release()`. The
   worker is **reference-counted**: it shuts down shortly after the last
   consumer releases it (no camera process runs when nothing's watching).

**Key files:** `renderer/hooks/useCvDetection.ts` (owns camera + WebSocket),
`main/python-bridge.ts` (process lifecycle only — *not* detection data),
`python/main.py` + `python/cv/*`.

### 2. Desktop app activity (which app is focused)

1. When a session starts, the renderer sends `desktop-monitoring-start` over IPC.
2. The main process **`activity-monitor.ts`** polls the active OS window once a
   second using the `active-win` package (window title + app name + process).
3. Each snapshot is pushed to the renderer over IPC
   (`taskmaster:desktop-activity`).
4. The renderer classifies it against your saved rules (allowed / blocked /
   unknown) — this logic lives in **`useFocusMonitoringSession.ts`**, not in the
   main process.

**Key files:** `main/activity-monitor.ts` (raw polling),
`main/appDetection/*` (which apps are installed, for onboarding),
`renderer/hooks/useFocusMonitoringSession.ts` (the actual classification).

### 3. Browser activity (which website is open)

The OS active-window check can only see "Chrome is focused," not *which tab*.
So a browser extension fills the gap:

1. The **browser extension** watches the active tab and sends its
   domain/title to a **native messaging host** (a small script Chrome launches).
2. The native host forwards it to a **local HTTP bridge** the main process runs
   (`main/browser-activity-bridge.ts`, `127.0.0.1:17382`), authenticated with a
   per-run token.
3. The bridge pushes it to the renderer over IPC
   (`taskmaster:browser-activity`), which classifies it like desktop apps.

The token (written by the app, required by the bridge) stops random web pages
from POSTing fake activity to localhost. See `native-host/` for the installer.

**Key files:** `browser-extension/`, `native-host/`,
`main/browser-activity-bridge.ts`.

### 4. Sessions, timers, and focus rules (renderer-owned)

This is the part that surprises people: **the session logic is in the
renderer**, not the main process.

- **`useDeepSeshTimer.ts`** — the Pomodoro / Deep Sesh countdown.
- **`useFocusMonitoringSession.ts`** (the big one, ~530 lines) — ties together
  CV events + desktop activity + browser activity, classifies them, and decides
  what counts as "distracted."
- **`useFocusEnvironmentSettings.ts`** — the allow/block rules for apps and
  websites, saved to `localStorage`.

> ⚠️ **Trap:** `main/session-manager.ts` and `main/notifier.ts` look like they'd
> own this — they don't. They're **empty stubs** (a couple of comment lines,
> imported nowhere). Don't waste time there. The logic is in the hooks above.

---

## Where does X live? (the cheat sheet)

| I want to change / understand… | Look here |
|---|---|
| Phone detection model / logic | `python/cv/phone_detector.py` (YOLOX + ONNX Runtime) |
| Gaze / "looking away" logic | `python/cv/gaze_detector.py` (MediaPipe head pose) |
| The WebSocket server (frames in, events out) | `python/main.py` |
| How the camera is captured & streamed | `renderer/hooks/useCvDetection.ts` |
| Starting/stopping the Python worker | `main/python-bridge.ts` |
| Which app is currently focused | `main/activity-monitor.ts` |
| Which apps are installed (onboarding) | `main/appDetection/detectCommonApps.ts` |
| Browser tab reporting | `browser-extension/`, `native-host/`, `main/browser-activity-bridge.ts` |
| The session timer (Pomodoro) | `renderer/hooks/useDeepSeshTimer.ts` |
| "Am I distracted?" decision logic | `renderer/hooks/useFocusMonitoringSession.ts` |
| Allow/block rules for apps & sites | `renderer/hooks/useFocusEnvironmentSettings.ts` + `shared/appDetection/commonApps.ts` |
| App windows, tray, startup | `main/index.ts` |
| The safe UI ↔ main API (IPC) | `main/preload/index.js` (exposes `window.taskmaster.*`) + `main/ipc-handlers.ts` |
| UI routes / pages | `renderer/App.tsx` |
| Packaging into a `.app`/`.exe` | `electron/electron.vite.config.ts`, `package.json` "build", `python/taskmaster_worker.spec` |

---

## The IPC surface (how UI and backend talk)

The renderer can't call Node/OS code directly (security). Everything goes
through a small, explicit API exposed by **`preload/index.js`** as
`window.taskmaster.*`. The main-process handlers are in **`ipc-handlers.ts`**.
The channels:

| Channel | Direction | Purpose |
|---|---|---|
| `taskmaster:detect-common-apps` | renderer → main (ask) | list installed apps for onboarding |
| `taskmaster:cv-request` / `cv-release` | renderer → main | start / release the Python worker |
| `taskmaster:desktop-monitoring-start` / `pause` / `stop` | renderer → main | control active-window polling |
| `taskmaster:desktop-activity` | main → renderer | a focused-window snapshot |
| `taskmaster:browser-monitoring-active` | renderer → main | enable/disable browser reporting |
| `taskmaster:browser-activity` | main → renderer | an active-tab snapshot |

Note the CV **frames** do **not** go over IPC — they go straight from the
renderer to Python over the WebSocket. IPC is only used for control messages and
the small activity snapshots.

---

## Key design decisions (and why)

- **Permissive ML only (no PyTorch, no AGPL).** Phone detection uses **YOLOX
  (Apache-2.0)** via **ONNX Runtime (MIT)**, not the popular Ultralytics YOLO
  (AGPL). AGPL would force open-sourcing a shipped app. This keeps Taskmaster
  closeable and the runtime light. *If you ever train your own model, don't
  reintroduce AGPL tooling.*
- **The browser owns the camera, Python doesn't.** The renderer already knows
  the exact camera device the user picked; passing frames to Python avoids a
  "browser device ID vs. OpenCV index 0" mismatch and means Python opens no
  hardware.
- **The Python worker runs on demand.** It's reference-counted and started only
  when detection is needed, then stopped shortly after — no camera process runs
  in the background.
- **Detection is 1 frame/second on CPU.** Deliberately low: enough for focus
  tracking, cheap on battery, and it dodges GPU/driver headaches.
- **Local-only by design.** Both servers bind to `127.0.0.1`; the browser bridge
  requires a per-run token so web pages can't spoof activity.
- **Packaging bundles a *frozen* Python.** The dev venv can't be shipped (it's
  symlinked to a system Python), so PyInstaller freezes the worker into a
  standalone binary that's bundled into the app. See the build sections in the
  README.

---

## Honest notes / gotchas

- `main/session-manager.ts` and `main/notifier.ts` are **stubs** — the names are
  aspirational; the logic lives in renderer hooks.
- Some files under `renderer/pages/` and `renderer/components/deepSesh/` are part
  of the newer Deep Sesh UI; `App.tsx` is the source of truth for what's actually
  routed.
- `python/cv/detection_loop.py` is a standalone loop that opens its own camera —
  it's *not* part of the Electron ↔ worker flow (that goes through `main.py`).
  Useful for testing detection in isolation.

---

## Glossary

- **Main process** — the Electron process with full Node.js/OS access. Think
  "backend running on your machine." One per app.
- **Renderer process** — a Chromium window running your web app (React here).
  Sandboxed; can't touch the OS directly. Taskmaster has one main window plus a
  mini-timer window.
- **Preload script** — a small trusted bridge that safely exposes a limited API
  (`window.taskmaster.*`) from main to the renderer.
- **IPC (inter-process communication)** — how the renderer and main process send
  messages to each other, since they're separate processes.
- **WebSocket** — a persistent two-way connection. Used here to stream JPEG
  frames to Python and get detection events back in real time.
- **Native messaging host** — a small program a browser launches to talk to a
  local app; how the extension reaches Taskmaster.
- **asar** — Electron's app-bundle archive format. Some files (like the
  `active-win` native binary) must be "unpacked" from it to run.
- **YOLOX / COCO** — YOLOX is an object-detection model; COCO is the 80-class
  dataset it was trained on ("cell phone" is one class).
- **MediaPipe FaceLandmarker** — Google's model that finds face landmarks; we use
  it to estimate head pose (which way your face points).
