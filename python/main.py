"""Taskmaster CV worker — WebSocket server (frame-in, events-out).

The Electron front end owns the webcam (it uses the exact camera the user picked
during onboarding). It grabs ONE frame per second, sends it here, and we send
back the detection results. Python never opens a camera itself — which neatly
avoids the "browser deviceId vs OpenCV index" mismatch.

Flow per frame:
    client sends an encoded image (JPEG bytes)
      -> we decode it to a picture
      -> run detect_phone + detect_gaze on it
      -> send both results back as JSON

Run it:
    cd python
    source .venv/bin/activate
    uvicorn main:app --port 8765

WebSocket endpoint:  ws://127.0.0.1:8765/ws
Health check:        http://127.0.0.1:8765/

Messages we SEND back (one per detector), matching PLAN.md:
    { "type": "phone", "status": "none"|"detected",      "confidence": float, "timestamp": int }
    { "type": "gaze",  "status": "focused"|"distracted", "confidence": float, "timestamp": int }
"""

import json

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

# The detectors. They run on a single frame and return protocol-shaped dicts.
# Note: we do NOT import `camera` here — the browser is the camera now.
from cv import phone_detector
from cv import gaze_detector


# The FastAPI application. uvicorn looks for this (`uvicorn main:app`).
app = FastAPI()


# ---------------------------------------------------------------------------
# Plain HTTP health check — "is the server up?"
# ---------------------------------------------------------------------------


@app.get("/")
async def health_check() -> dict:
    """Open http://127.0.0.1:8765/ in a browser; if you see this, it's running."""
    return {"status": "ok", "service": "taskmaster-cv-worker"}


# ---------------------------------------------------------------------------
# Turn received image bytes into a picture the detectors understand
# ---------------------------------------------------------------------------


def decode_frame(frame_bytes: bytes):
    """Decode encoded image bytes (e.g. JPEG) into an OpenCV BGR image.

    Returns the image as a NumPy array, or None if the bytes weren't a valid
    image (the detectors handle None gracefully, so the loop stays alive).
    """
    # Wrap the raw bytes in a NumPy array of 8-bit numbers...
    byte_array = np.frombuffer(frame_bytes, dtype=np.uint8)
    # ...then let OpenCV decode that into an actual image (BGR colour).
    return cv2.imdecode(byte_array, cv2.IMREAD_COLOR)


# ---------------------------------------------------------------------------
# The WebSocket endpoint — receive frames, send back detections
# ---------------------------------------------------------------------------


@app.websocket("/ws")
async def detection_socket(websocket: WebSocket) -> None:
    """For each frame the client sends, reply with the phone + gaze results.

    The client (Electron) controls the pace — it sends ~1 frame per second, so
    we simply respond to each frame as it arrives. No timing loop needed here.
    """

    # Complete the handshake and open the connection.
    await websocket.accept()

    try:
        while True:
            # Wait for the next frame from the client. This blocks (cooperatively)
            # until a binary message arrives — so we only work when there's a
            # frame to process.
            frame_bytes = await websocket.receive_bytes()

            # Decode the bytes into an image. May be None if decoding failed.
            frame = decode_frame(frame_bytes)

            # Run both detectors on this one frame.
            phone_event = phone_detector.detect_phone(frame)
            gaze_event = gaze_detector.detect_gaze(frame)

            # Send the two results back to the client as JSON text messages.
            await websocket.send_text(json.dumps(phone_event))
            await websocket.send_text(json.dumps(gaze_event))

    except WebSocketDisconnect:
        # Normal: the client closed the connection. Nothing to clean up — we
        # never opened a camera or any other resource.
        pass


# ---------------------------------------------------------------------------
# Allow running directly with `python main.py` (uvicorn main:app is preferred).
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    # host 127.0.0.1 = localhost only (not exposed to the network).
    uvicorn.run(app, host="127.0.0.1", port=8765)
