# Taskmaster — Project Roadmap

## Phase 1: MVP (Current)

Core focus tracking loop — camera detects attention state, app enforces focus sessions.

### Features
- [x] Project scaffolding
- [ ] Python CV worker: webcam capture + MediaPipe gaze detection
- [ ] Python CV worker: phone-in-hand detection via MediaPipe Hands
- [ ] FastAPI WebSocket server streaming detection events
- [ ] Electron main process: spawn Python, connect WebSocket, forward events via IPC
- [ ] Electron main process: activity monitor (poll active window, check against allowlist)
- [ ] Electron main process: session manager (start/stop/pause, timers, config)
- [ ] Electron main process: notification system (fire after N seconds distracted)
- [ ] React UI: dashboard with live focus indicator + session stats
- [ ] React UI: session controls (start/stop, duration, allowed apps picker)
- [ ] React UI: settings page (notification prefs, distraction threshold, camera)

### WebSocket Protocol

```
Python → Electron:
  { type: "gaze",  status: "focused"|"distracted", confidence: float, timestamp: int }
  { type: "phone", status: "none"|"detected",      confidence: float, timestamp: int }

Electron → Python:
  { type: "start_camera" }
  { type: "stop_camera" }
```

---

## Phase 2: Data & Insights

Store session data locally and surface trends to help users understand their focus patterns.

### Features
- [ ] Local SQLite database for session history (timestamps, gaze %, distractions, app usage)
- [ ] Session history view — list of past sessions with summary stats
- [ ] Daily/weekly focus trends (charts)
- [ ] Export data (CSV / JSON)

---

## Phase 3: ML Intelligence

Train models on collected user data to provide personalized productivity insights.

### Features
- [ ] Mood inference from facial signals (blink rate, micro-expressions via Face Mesh 468 landmarks)
- [ ] Peak productivity prediction — time-series model (LSTM / Prophet) on session history
- [ ] Personalized recommendations ("Your best focus window is 9–11am")
- [ ] Adaptive distraction threshold — model learns what "distracted" means for each user
- [ ] All ML runs locally, no cloud — privacy first

---

## Phase 4: Polish & Distribution

Ship a real product.

### Features
- [ ] System tray mode (minimize to tray, run in background)
- [ ] Onboarding flow (camera permissions, initial calibration)
- [ ] Auto-start on login (optional)
- [ ] App packaging (electron-builder: .dmg for Mac, .exe for Windows)
- [ ] Auto-updater
- [ ] Landing page / download site
