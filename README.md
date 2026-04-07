# Taskmaster

A desktop productivity app that uses computer vision to keep you focused. It detects if you're looking at the screen, spots phone usage, monitors app activity, and nudges you back on track with notifications.

## Architecture

```
Electron (TypeScript)                    Python (CV Worker)
┌──────────────────────┐                ┌──────────────────────┐
│ Main Process         │   WebSocket    │ FastAPI Server       │
│ ├─ Spawns Python     │◄──────────────►│ ├─ OpenCV capture    │
│ ├─ Activity monitor  │   localhost    │ ├─ MediaPipe Face    │
│ ├─ Session manager   │               │ ├─ MediaPipe Hands   │
│ ├─ Notifications     │               │ └─ Phone detector    │
│ └─ IPC to renderer   │               └──────────────────────┘
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
│   ├── main.py                # FastAPI + WebSocket server
│   └── cv/
│       ├── camera.py
│       ├── gaze_detector.py
│       └── phone_detector.py
├── PLAN.md
└── README.md
```

## Prerequisites

- Node.js >= 18
- Python >= 3.10
- A webcam

## Setup

### Python backend

```bash
cd python
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Electron app

```bash
cd electron
npm install
```

## Development

Start the Python CV server:

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
