# Taskmaster

A desktop productivity app that uses computer vision to keep you focused. It detects if you're looking at the screen, spots phone usage, monitors app activity, and nudges you back on track with notifications.

## Architecture

```
Electron (TypeScript)                    Python (CV Worker)
┌──────────────────────┐                ┌──────────────────────┐
│ Main Process         │   WebSocket    │ FastAPI Server       │
│ ├─ Spawns Python     │◄──────────────►│ ├─ OpenCV capture    │
│ ├─ Activity monitor  │   localhost    │ ├─ MediaPipe Face    │
│ ├─ Session manager   │                │ ├─ MediaPipe Hands   │
│ ├─ Notifications     │                │ └─ Phone detector    │
│ └─ IPC to renderer   │                └──────────────────────┘
│                      │
│ Renderer (React+TS)  │
│ ├─ Dashboard         │
│ ├─ Session controls  │
│ └─ Settings          │
└──────────────────────┘
```

## Tech Stack

| Layer | Tech |
|-------|------|
| App shell | Electron + TypeScript |
| Frontend | React + TypeScript |
| CV / ML backend | Python (OpenCV, MediaPipe) |
| Communication | WebSocket (FastAPI + uvicorn) |
| Activity monitoring | `active-win`, `ps-list` (Node) |
| Build tooling | electron-vite, electron-builder, PyInstaller |

## MVP Features

- **Gaze detection** — MediaPipe Face Mesh detects if you're looking at the screen
- **Phone detection** — MediaPipe Hand Landmarks spots phone-holding gestures
- **App activity monitor** — tracks the active window and flags disallowed apps during focus sessions
- **Focus notifications** — system notification when you've been distracted for too long

## Project Structure

```
taskmaster/
├── electron/
│   └── src/
│       ├── main/              # Electron main process
│       │   ├── index.ts
│       │   ├── python-bridge.ts
│       │   ├── activity-monitor.ts
│       │   ├── session-manager.ts
│       │   └── notifier.ts
│       ├── renderer/          # React UI
│       │   ├── App.tsx
│       │   └── components/
│       └── preload/
│           └── index.ts
├── python/
│   ├── README.md              # CV worker docs
│   ├── requirements.txt       # Python deps (installed by setup.sh)
│   ├── main.py                # FastAPI + WebSocket server
│   ├── build_worker.sh        # freezes the CV worker into a standalone binary
│   ├── build_worker.ps1       # Windows version of the worker freeze step
│   ├── taskmaster_worker.spec # PyInstaller recipe for the frozen worker
│   └── cv/
│       ├── camera.py          # webcam capture (owns the camera handle)
│       ├── detection_loop.py  # camera -> detectors -> events loop
│       ├── phone_detector.py  # phone-in-frame detection
│       └── gaze_detector.py   # gaze/face detection (planned)
├── setup.sh                   # one-shot install for Python + Electron (macOS/Linux)
├── setup.ps1                  # same, for Windows PowerShell
├── build-macos-app.sh         # one-shot build of the distributable macOS .app
├── build-windows-app.ps1      # one-shot build of the distributable Windows app
├── PLAN.md
└── README.md
```

## Prerequisites

- Node.js >= 18
- **Python 3.11** (MediaPipe has no wheels for 3.13/3.14 yet)
- A webcam

## Setup

One command installs both the Python CV worker and the Electron app:

```bash
# macOS / Linux
./setup.sh

# Windows (PowerShell)
./setup.ps1
```

It creates the Python venv at `python/.venv` (Python 3.11), installs
`requirements.txt`, and runs `npm install` in `electron/`. The Electron app
expects the worker at that venv path, so run setup before `npm run dev`.

<details>
<summary>Manual setup (if you prefer)</summary>

```bash
# Python CV worker
cd python
python3.11 -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Electron app
cd electron
npm install
```

</details>

## Development

Run the CV detection loop directly (current entry point while the
WebSocket server is being built):

```bash
cd python
source .venv/bin/activate
python cv/detection_loop.py        # Ctrl+C to stop
```

Later, the FastAPI + WebSocket server will be the entry point instead:

```bash
cd python
uvicorn main:app --port 8765
```

Start the Electron app (in a separate terminal):

```bash
cd electron
npm run dev
```

## Building the desktop app (macOS)

To produce a double-clickable `Taskmaster.app` (and a `.dmg`) that runs on a Mac
with no Python or Node installed, run two scripts from the repo root — first
`setup.sh` to install everything (once), then `build-macos-app.sh` to build:

```bash
./setup.sh            # once: installs deps + downloads the models
./build-macos-app.sh  # builds the app
```

`build-macos-app.sh` is build-only (it does not install dependencies) and does
these steps in order:

1. installs PyInstaller into the venv
2. `python/build_worker.sh` — freezes the CV worker into a standalone binary
3. `npm run dist:mac` — bundles and packages the app with electron-builder

It checks up front that `setup.sh` has been run and exits with a clear message
if the venv, node modules, or models are missing.

The result lands in `electron/release/`:

- `Taskmaster-<version>-arm64.dmg`
- `mac-arm64/Taskmaster.app`

Notes:

- **Apple Silicon (arm64) only** for now. The build bundles a frozen CV worker
  that's architecture-specific, so it must be built on an arm64 Mac.
- The build is **unsigned**, so the first launch needs a right-click → **Open**
  to get past Gatekeeper. After that it opens normally.
- On first launch the app asks for **Camera** access (for gaze/phone detection),
  and live focus tracking also needs **Accessibility** and **Screen Recording**
  granted in System Settings.

If you only want to change one part, the steps can be run individually in the
same order — freezing the worker (`python/build_worker.sh`) must always happen
before packaging (`npm run dist:mac`), since the package copies the frozen
worker into the app.

## Building the desktop app (Windows)

To produce a Windows installer and unpacked app that run without system Python
or Node, run the setup script once and then the Windows build script from the
repo root:

```powershell
.\setup.ps1
.\build-windows-app.ps1
```

`build-windows-app.ps1` is build-only. It checks that setup has already created
the Python venv, installed Electron dependencies, and downloaded the ML models,
then runs these steps:

1. installs PyInstaller into the venv
2. `python\build_worker.ps1` — freezes the CV worker into a standalone `.exe`
3. `npm run dist:win` — bundles and packages the app with electron-builder

The result lands in `electron\release\`:

- `Taskmaster Setup <version>.exe`
- `win-unpacked\Taskmaster.exe`

Notes:

- The build is **unsigned**, so Windows SmartScreen may warn during testing.
- The packaged app includes the frozen CV worker and model files through
  electron-builder `extraResources`.
- Packaging rebuilds the native `active-win` dependency, so Windows needs
  **Build Tools for Visual Studio** with the **Desktop development with C++**
  workload installed.

## License

MIT
