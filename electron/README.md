# Taskmaster — Electron App

This is the desktop app side of Taskmaster. It contains the Electron shell, the React UI, and the bridge to the Python CV worker.

## Stack

- **Electron** — desktop app shell (Chromium + Node.js)
- **React + TypeScript** — UI in the renderer process
- **Vite** — dev server and build tool for the renderer
- **Tailwind CSS** — utility-first styling
- **React Router** — client-side routing (HashRouter, since Electron loads files locally)

## Architecture overview

Electron splits the app into two cooperating processes:

```
┌────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                │
│  ──────────────────────────                            │
│  • Owns OS access (notifications, file system, tray)   │
│  • Spawns and talks to Python CV worker                │
│  • Manages session state and activity monitoring       │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ IPC (via Preload)
                 │
┌────────────────┴───────────────────────────────────────┐
│  Renderer Process (Chromium)                           │
│  ──────────────────────────                            │
│  • React UI                                            │
│  • Displays focus state, session stats, settings       │
│  • Sends user actions to main process via IPC          │
└────────────────────────────────────────────────────────┘
```

The renderer never touches Node.js APIs directly. All communication happens through the **preload script**, which exposes a controlled `window.taskmaster` API to React.

## Folder structure

```
electron/
├── src/
│   ├── main/                     ← Node.js side (invisible)
│   │   ├── index.ts              ← Electron entry, BrowserWindow + tray
│   │   ├── python-bridge.ts      ← Spawn + WebSocket to Python worker
│   │   ├── activity-monitor.ts   ← Poll active OS window
│   │   ├── session-manager.ts    ← Session state, pomodoro, focus logic
│   │   ├── notifier.ts           ← OS notifications wrapper
│   │   └── ipc-handlers.ts       ← Renderer ↔ main message handlers
│   │
│   ├── preload/
│   │   └── index.ts              ← Secure bridge exposing window.taskmaster
│   │
│   ├── shared/
│   │   └── protocol.ts           ← Shared types (IPC + WebSocket events)
│   │
│   └── renderer/                 ← React UI
│       ├── index.html            ← Vite entry
│       ├── main.tsx              ← React root
│       ├── App.tsx               ← Router + Layout shell
│       ├── index.css             ← Tailwind import
│       └── components/
│           ├── Onboarding.tsx        ← First-run flow + calibration
│           ├── Dashboard.tsx         ← Live focus indicator + stats
│           ├── SessionControls.tsx   ← Start/stop, pomodoro, duration
│           ├── SessionHistory.tsx    ← Past sessions + charts
│           └── Settings.tsx          ← Camera, notifications, whitelist
│
├── package.json
├── vite.config.ts                ← Vite config (renderer build)
├── tsconfig.json                 ← TypeScript config
└── README.md
```

## Process responsibilities

### Main process (`src/main/`)

The "brain" of the app. Owns everything the UI cannot do:

- **`index.ts`** — boots the app, creates the window, sets up the tray, wires all other modules.
- **`python-bridge.ts`** — spawns `python/main.py` as a child process and connects to its WebSocket. Forwards gaze and phone-detection events to the session manager.
- **`activity-monitor.ts`** — polls the active OS window every few seconds. Checks against the user's allowed-apps whitelist.
- **`session-manager.ts`** — central state for the current focus session. Knows when to fire notifications based on inputs from the bridge and monitor.
- **`notifier.ts`** — wrapper around Electron's `Notification` API.
- **`ipc-handlers.ts`** — registers handlers for every message the renderer can send. Single place to look for "what can the UI ask the backend to do?"

### Preload script (`src/preload/`)

A small, locked-down file that runs *before* the renderer loads. It uses `contextBridge.exposeInMainWorld()` to give React a safe API:

```ts
// In renderer:
window.taskmaster.startSession({ duration: 25 })
window.taskmaster.onFocusUpdate(callback)
```

This is the **only** way the UI can talk to the main process. Required for security — without context isolation, malicious code in the renderer could call Node APIs directly.

### Shared (`src/shared/`)

TypeScript types used by **both** processes. Keeps the IPC contract and WebSocket protocol in sync — change the type once, both sides update.

### Renderer (`src/renderer/`)

The React app. Pure UI layer — it displays state and sends user actions, but never owns business logic. All side effects (timers, notifications, monitoring) live in the main process.

## Development

Two terminals are needed during dev:

**Terminal 1** — Vite dev server (renderer with hot reload):
```bash
npm run dev
```

**Terminal 2** — Electron app (loads from Vite at `localhost:5173`):
```bash
npm run electron
```

## Build

Production build of the renderer:
```bash
npm run build
```

Output goes to `dist/renderer/`. Packaging the full Electron app into `.dmg` / `.exe` installers is planned for Phase 4 using `electron-builder`.

## Routes

| Path           | Component         | Notes                                     |
|----------------|-------------------|-------------------------------------------|
| `/`            | `Onboarding`      | Fullscreen, no sidebar — first-run only   |
| `/dashboard`   | `Dashboard`       | Live focus state during a session         |
| `/session`     | `SessionControls` | Start/stop, pomodoro config               |
| `/history`     | `SessionHistory`  | Past sessions + insights                  |
| `/settings`    | `Settings`        | Camera, notifications, app whitelist      |

`HashRouter` is used (not `BrowserRouter`) because Electron loads files directly from disk — there's no server to handle URL paths.

## Why Electron?

Taskmaster needs OS-level capabilities a web app cannot provide:

- Reading the currently focused app/window
- Native notifications
- System tray
- Spawning a Python subprocess for computer vision
- Eventually, auto-start on login and packaged installers

Electron's tradeoff (~150 MB bundle, higher memory than native) is accepted in exchange for the flexibility of using web tech for the UI.