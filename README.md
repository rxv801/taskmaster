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
| Build tooling | Vite, electron-builder |

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
│   └── cv/
│       ├── camera.py          # webcam capture (owns the camera handle)
│       ├── detection_loop.py  # camera -> detectors -> events loop
│       ├── phone_detector.py  # phone-in-frame detection
│       └── gaze_detector.py   # gaze/face detection (planned)
├── setup.sh                   # one-shot install for Python + Electron
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
./setup.sh
```

It creates the Python venv at `python/.venv` (Python 3.11), installs
`requirements.txt`, and runs `npm install` in `electron/`.

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

## License

MIT
