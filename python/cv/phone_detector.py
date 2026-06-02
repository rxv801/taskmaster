"""Phone-in-frame detection module.

Takes a single webcam frame and decides whether the user is holding /
looking at a phone. Right now this is a PLACEHOLDER: it always reports
"no phone". The real implementation (MediaPipe Hands + a phone heuristic,
or a small object-detection model) will slot in behind the same
`detect_phone()` function, so nothing that calls this file has to change
when we upgrade it.

Public API:
    detect_phone(frame) -> dict   # one detection result per frame

The returned dict matches the WebSocket protocol in PLAN.md exactly:
    { "type": "phone", "status": "none"|"detected",
      "confidence": float, "timestamp": int }
"""

# time — used to stamp each detection with the moment it was produced.
import time


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def detect_phone(frame) -> dict:
    """Look at one frame and report whether a phone is present.

    `frame` is a NumPy image array as returned by
    `camera.read_current_frame()`. It may also be None if the camera
    failed to produce a frame — we handle that gracefully.

    Returns a protocol-shaped dict (see module docstring).

    PLACEHOLDER BEHAVIOUR: always returns status "none" with confidence
    0.0. The frame is accepted but not yet analysed. When we wire up the
    real detector, only the body below changes — callers stay the same.
    """

    # Build the timestamp once so the whole result refers to the same instant.
    # Protocol wants an int; we use milliseconds since the Unix epoch.
    current_timestamp_ms = int(time.time() * 1000)

    # Guard: if there is no frame to inspect, we cannot claim to have seen
    # a phone. Report "none" so the pipeline keeps flowing without crashing.
    if frame is None:
        return _build_result("none", 0.0, current_timestamp_ms)

    # ----------------------------------------------------------------------
    # TODO(real detector): run MediaPipe Hands (and/or an object detector)
    # on `frame` here. If a phone-like object is found in/near a hand, set
    # status to "detected" and confidence to the model score. Until then we
    # always fall through to the "none" result below.
    # ----------------------------------------------------------------------

    return _build_result("none", 0.0, current_timestamp_ms)


# ---------------------------------------------------------------------------
# Internal helpers (underscore = private to this module)
# ---------------------------------------------------------------------------


def _build_result(status: str, confidence: float, timestamp_ms: int) -> dict:
    """Assemble the protocol-shaped result dict in one place.

    Keeping this in a single helper means every return path produces the
    exact same shape — no risk of one branch forgetting a field.
    """
    return {
        "type": "phone",
        "status": status,
        "confidence": confidence,
        "timestamp": timestamp_ms,
    }
