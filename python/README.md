# Taskmaster — Python CV Worker

The computer-vision backend. It owns the webcam, runs the detectors
(phone now, gaze next), and will stream detection events to the Electron
app over a WebSocket.

## Requirements

- **Python 3.11** — MediaPipe has no wheels for 3.13/3.14, so the venv
  must be built with `python3.11`.
- Dependencies live in [`requirements.txt`](requirements.txt).

## Setup

From the repo root, the easiest path is `./setup.sh`. To do just the
Python side manually:

```bash
cd python
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

The venv lives at `python/.venv` and is gitignored.

## Running

```bash
source .venv/bin/activate
python cv/detection_loop.py        # Ctrl+C to stop
```

This opens the webcam, samples ~10 frames/sec, runs the phone detector on
each frame, and prints the result. The camera is always released cleanly
on exit.

## Module layout

```
python/
├── main.py                 # FastAPI + WebSocket server (not implemented yet)
└── cv/
    ├── camera.py           # owns the webcam handle: start / read / stop
    ├── detection_loop.py   # the loop: grab frame -> run detectors -> emit result
    ├── phone_detector.py   # detect_phone(frame) -> event dict (placeholder for now)
    └── gaze_detector.py    # gaze/face detection (planned)
```

### Design: why `camera.py` and `detection_loop.py` are separate

Each module should have **one reason to change**:

- `camera.py` is a **resource owner** — it only cares about the webcam
  hardware. It changes when capture concerns change.
- `detection_loop.py` is **orchestration/policy** — sampling rate, which
  detectors run, what happens to results. It changes when the detection
  pipeline changes.

The dependency arrow points one way: `detection_loop` imports `camera` and
the detectors; `camera` knows nothing about detection. This keeps the
camera reusable (onboarding preview, calibration) and lets each piece be
tested on its own.

## Detection event shape

Every detector returns a dict matching the WebSocket protocol in
[`PLAN.md`](../PLAN.md):

```python
{ "type": "phone", "status": "none" | "detected",
  "confidence": float, "timestamp": int }   # timestamp = ms since epoch
```

`phone_detector.detect_phone()` is currently a **placeholder** that always
returns `status: "none"`. The real MediaPipe Hands implementation slots in
behind the same function signature, so nothing that calls it has to change.
