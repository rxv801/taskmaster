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
├── models/                 # detection model files (gitignored; fetched by setup.sh)
│   ├── yolox_s.onnx        # YOLOX-S phone detector (Apache-2.0)
│   └── face_landmarker.task# MediaPipe FaceLandmarker for gaze (Apache-2.0)
└── cv/
    ├── camera.py           # owns the webcam handle: start / read / stop
    ├── detection_loop.py   # the loop: grab frame -> run detectors -> emit result
    ├── phone_detector.py   # detect_phone(frame) -> event dict (YOLOX via onnxruntime)
    ├── phone_detect_test.py# manual visual test: draws boxes on the webcam feed
    ├── gaze_detector.py    # detect_gaze(frame) -> event dict (MediaPipe head pose)
    └── gaze_detect_test.py # manual visual test: FOCUSED/DISTRACTED + head angles
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

### Phone detection

`phone_detector.detect_phone()` runs **YOLOX-S** (general COCO detector,
Apache-2.0) locally via **onnxruntime** (MIT), and reports the `cell phone`
class. Both are permissively licensed and bundle into a shipped app — no
PyTorch, no AGPL (unlike Ultralytics YOLO).

- `find_phones(frame)` → list of `(x1, y1, x2, y2, score)` boxes (perception).
- `detect_phone(frame)` → the protocol event above.

The detector is **perception only** — it answers "is there a phone in this
frame?". Turning that into a *distracted* state (phone visible for N seconds)
is policy that belongs in the loop/state layer, not here.

The model file (`models/yolox_s.onnx`, ~34 MB) is gitignored and downloaded
by `setup.sh`.

### Gaze detection

`gaze_detector.detect_gaze()` decides whether the user is looking at the
screen, using **head pose** (which way the face points) from **MediaPipe
FaceLandmarker** (Apache-2.0, local). Head pose is far more robust than
eye/iris gaze to lighting, glasses, and distance.

- `analyze_gaze(frame)` → detailed facts (angles, offsets, face count) for the test UI.
- `detect_gaze(frame)` → the protocol event (`focused` / `distracted`).
- `calibrate(frame)` / `reset_reference()` → manage the reference pose.

Key behaviours:
- **Auto-calibration** — the first frame with a face becomes the "looking at
  screen" reference (0/0); later frames are judged as +/- deviation from it.
  This makes it work with any camera angle, including off to the side.
- **Multi-person tracking** — detects up to `NUM_FACES`, locks onto the
  intended user (biggest/closest face), and follows them by position so other
  people entering the frame don't steal the signal.
- **Perception only** — answers "looking at screen *right now*?". The
  "distracted after N seconds of looking away" timer is policy for the
  loop/state layer.

The model file (`models/face_landmarker.task`, ~3.6 MB) is gitignored and
downloaded by `setup.sh`.
