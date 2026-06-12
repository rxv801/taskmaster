"""Gaze detection — is the user looking at the screen?

Perception only: given one webcam frame, decide whether the user's face is
turned toward the screen ("focused") or away ("distracted"). Whether a brief
look-away should actually flip the app into a distracted *state* (and after how
many seconds) is policy that lives in the loop/state layer — not here.

We use head pose (which way the face points), not eye/iris direction: it is
far more robust to lighting, glasses, and distance, which matters for a tool
that runs all day on any laptop.

Backed by MediaPipe FaceLandmarker (Apache-2.0), running locally. It returns a
"facial transformation matrix" — a 4x4 matrix describing how the face is
rotated relative to the camera — from which we read the yaw/pitch angles.

Public API:
    analyze_gaze(frame) -> dict   # detailed per-frame facts (for the test UI)
    detect_gaze(frame)  -> dict   # protocol event

The event dict matches the WebSocket protocol in PLAN.md:
    { "type": "gaze", "status": "focused"|"distracted",
      "confidence": float, "timestamp": int }
"""

import math
import os
import time
from typing import Any

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Model path resolved relative to this file (python/cv/), so it works no
# matter which directory the program is launched from.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_THIS_DIR, "..", "models", "face_landmarker.task")

# How far the head may turn from facing-the-screen before we call it "away".
# Tune these against the live test: turn your head until it flips.
#   yaw   = left/right turn
#   pitch = up/down tilt
YAW_LIMIT_DEG = 35.0
PITCH_LIMIT_DEG = 25.0

# When True, the FIRST frame in which a face is found is automatically taken as
# the "looking at screen" reference (0/0). Every later frame is then judged as
# +/- deviation from that first pose. This makes it work with any camera angle
# with no manual step — it just assumes the user is looking at the screen when
# the module starts. calibrate() can still be called to re-baseline by hand.
AUTO_CALIBRATE_ON_FIRST_FACE = True

# How many faces to detect per frame. We need more than one so we can pick the
# intended user out of a crowd (see _select_user_face). 3 covers "someone walks
# behind you" while keeping worst-case compute low for a solo desk app.
NUM_FACES = 3

# Max distance (in normalised 0-1 frame coordinates) the tracked user's face may
# jump between frames before we decide it's gone / a different person. ~0.20 is
# a fifth of the frame — generous enough for normal movement, tight enough to
# not snap onto someone standing elsewhere.
MAX_FACE_JUMP = 0.20


# ---------------------------------------------------------------------------
# Module-level state: load the model once and reuse it for every frame.
# ---------------------------------------------------------------------------

# Typed as Any because MediaPipe ships no type stubs, so Pyright can't treat
# vision.FaceLandmarker as a type in an annotation.
_landmarker: Any = None

# Reference head pose = what "looking at the screen" looks like for THIS user's
# camera setup. Head-pose angles are measured relative to the camera, so if the
# camera sits off to the side, facing the screen is NOT yaw=0. We capture the
# user's pose while they look at the screen (see calibrate()) and then judge
# "looking at screen" by how far the head has turned AWAY from this reference,
# not away from the camera's centre. Defaults to 0/0 = assume camera is centred.
_reference_yaw: float = 0.0
_reference_pitch: float = 0.0
_is_calibrated: bool = False

# The intended user's face position, as (x, y) in normalised 0-1 frame coords.
# None until we lock onto someone. When multiple faces are visible we follow the
# face nearest this point so we keep tracking the same person, not whoever is
# biggest at the moment. Set when locking, updated every frame we track them.
_locked_face_center: tuple[float, float] | None = None


def _get_landmarker() -> Any:
    """Lazily create (and cache) the FaceLandmarker."""
    global _landmarker
    if _landmarker is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"FaceLandmarker model not found at {MODEL_PATH}. "
                "Run ./setup.sh (or download face_landmarker.task into python/models/)."
            )
        options = vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=NUM_FACES,  # detect several so we can pick the intended user
            # Ask for the 4x4 head-pose matrix — that's what we read angles from.
            output_facial_transformation_matrixes=True,
        )
        _landmarker = vision.FaceLandmarker.create_from_options(options)
    return _landmarker


# ---------------------------------------------------------------------------
# Head-pose maths
# ---------------------------------------------------------------------------


def _head_pose_angles(transformation_matrix: np.ndarray):
    """Read yaw, pitch, roll (degrees) out of the 4x4 face transform matrix.

    The 4x4 matrix packs both the head's rotation and its position. We only
    need orientation, which lives in the top-left 3x3 block (the rotation).

    A rotation matrix can be unpacked into three intuitive angles (Euler angles):
        yaw   = turning left / right   (shaking head "no")
        pitch = tilting up / down      (nodding "yes")
        roll  = tilting side to side   (ear toward shoulder)

    The formulas below are the standard way to recover those angles from the
    matrix's entries. (Exact axis/sign follows MediaPipe's convention; the live
    test prints them so the thresholds above can be tuned by eye.)
    """
    rotation = transformation_matrix[:3, :3]

    # Pull out the individual matrix entries we need, named r_<row><col> so the
    # formulas below read clearly instead of being full of [i, j] indexing.
    r00 = rotation[0, 0]
    r10 = rotation[1, 0]
    r20 = rotation[2, 0]
    r21 = rotation[2, 1]
    r22 = rotation[2, 2]

    # This magnitude (the length of the first column in the x-y plane) appears
    # in the yaw formula and equals the cosine of the pitch angle. Computing it
    # once also avoids a divide-by-zero when the head points straight up/down.
    cos_pitch = math.sqrt(r00 * r00 + r10 * r10)

    # atan2(y, x) returns the angle of the point (x, y) in radians, handling all
    # quadrants safely. We convert each result to degrees.
    pitch = math.degrees(math.atan2(r21, r22))
    yaw = math.degrees(math.atan2(-r20, cos_pitch))
    roll = math.degrees(math.atan2(r10, r00))

    return yaw, pitch, roll


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def _face_center(landmarks) -> tuple[float, float]:
    """Average (x, y) of all of a face's landmarks — its centre in 0-1 coords."""
    xs = [point.x for point in landmarks]
    ys = [point.y for point in landmarks]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def _face_size(landmarks) -> float:
    """Rough on-screen area of a face = its landmark bounding-box area (0-1).

    Bigger area = closer to the camera. Used to guess the user: the person at
    their own laptop is usually the closest, biggest face.
    """
    xs = [point.x for point in landmarks]
    ys = [point.y for point in landmarks]
    return (max(xs) - min(xs)) * (max(ys) - min(ys))


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Straight-line distance between two (x, y) points."""
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _select_user_face(result):
    """Out of all detected faces, return the pose matrix of the intended user.

    Rules:
      - No faces -> None.
      - Not locked onto anyone yet -> lock onto the BIGGEST face (closest to the
        camera = most likely the person at their own screen) and follow it.
      - Already locked -> pick the face whose centre is NEAREST our last known
        position, provided it hasn't jumped further than MAX_FACE_JUMP. This
        keeps us on the same person even when others enter the frame. If the
        nearest face is too far away, the user has likely left -> None.

    Updates _locked_face_center as we track. Returns a 4x4 numpy matrix or None.
    """
    global _locked_face_center

    matrices = result.facial_transformation_matrixes
    faces_landmarks = result.face_landmarks
    if not matrices or not faces_landmarks:
        return None

    # Centre point of every detected face, index-aligned with its pose matrix.
    centers = [_face_center(landmarks) for landmarks in faces_landmarks]

    # First lock: nobody is being tracked yet, so adopt the biggest face.
    if _locked_face_center is None:
        sizes = [_face_size(landmarks) for landmarks in faces_landmarks]
        chosen = max(range(len(sizes)), key=lambda i: sizes[i])
        _locked_face_center = centers[chosen]
        return np.array(matrices[chosen])

    # Already tracking. Copy to a local so the type checker knows it's not None
    # (the None case returned above) inside the closures below.
    locked = _locked_face_center

    # Take the face closest to where the user was last frame.
    nearest = min(
        range(len(centers)),
        key=lambda i: _distance(centers[i], locked),
    )

    # If even the closest face is far from the lock, the user isn't here now.
    if _distance(centers[nearest], locked) > MAX_FACE_JUMP:
        return None

    _locked_face_center = centers[nearest]  # follow them
    return np.array(matrices[nearest])


def _raw_head_pose(frame):
    """Run the model and return (has_face, yaw, pitch, roll, face_count).

    Picks the intended user out of any crowd (see _select_user_face) and reads
    that one face's raw angles — measured relative to the camera, before the
    calibrated reference is applied. Returns (False, 0, 0, 0, n) if no usable
    face. `face_count` is how many faces were detected in total (for the UI).
    """
    if frame is None:
        return False, 0.0, 0.0, 0.0, 0

    landmarker = _get_landmarker()

    # MediaPipe wants an RGB mp.Image; OpenCV frames are BGR.
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

    result = landmarker.detect(mp_image)
    face_count = len(result.face_landmarks)

    matrix = _select_user_face(result)
    if matrix is None:
        return False, 0.0, 0.0, 0.0, face_count

    yaw, pitch, roll = _head_pose_angles(matrix)
    return True, yaw, pitch, roll, face_count


def calibrate(frame) -> bool:
    """Capture the user's CURRENT head pose as the 'looking at screen' baseline.

    Call this once while the user is looking straight at the screen (e.g. during
    onboarding, or at session start). From then on, "looking at screen" is judged
    relative to this pose, so it works even when the camera is off to the side.

    Returns True if a face was found and the reference was stored, else False.
    """
    global _reference_yaw, _reference_pitch, _is_calibrated, _locked_face_center

    # Forget who we were tracking so this call re-locks onto the biggest face
    # (the user, re-centring themselves) before reading the reference pose.
    _locked_face_center = None

    has_face, yaw, pitch, _, _ = _raw_head_pose(frame)
    if not has_face:
        return False

    _reference_yaw = yaw
    _reference_pitch = pitch
    _is_calibrated = True
    return True


def reset_reference() -> None:
    """Clear calibration and tracking — back to a clean, uncalibrated state."""
    global _reference_yaw, _reference_pitch, _is_calibrated, _locked_face_center
    _reference_yaw = 0.0
    _reference_pitch = 0.0
    _is_calibrated = False
    _locked_face_center = None


def analyze_gaze(frame) -> dict:
    """Look at one frame and report detailed facts about the user's gaze.

    Returns a dict:
        {
          "has_face": bool,            # was a face found at all?
          "looking_at_screen": bool,   # within limits of the reference pose?
          "yaw": float, "pitch": float, "roll": float,   # raw angles (deg)
          "yaw_offset": float, "pitch_offset": float,    # deviation from reference
          "is_calibrated": bool,       # has a reference pose been set?
          "face_count": int,           # how many faces detected in the frame
        }

    When several faces are present, only the locked/tracked user's pose is
    reported (see _select_user_face); face_count still reflects the total.

    This is the richer output used by the visual test. detect_gaze() wraps it
    into the protocol event.
    """
    global _reference_yaw, _reference_pitch, _is_calibrated

    has_face, yaw, pitch, roll, face_count = _raw_head_pose(frame)

    if not has_face:
        return {
            "has_face": False,
            "looking_at_screen": False,
            "yaw": 0.0,
            "pitch": 0.0,
            "roll": 0.0,
            "yaw_offset": 0.0,
            "pitch_offset": 0.0,
            "is_calibrated": _is_calibrated,
            "face_count": face_count,
        }

    # First face we ever see becomes the reference (0/0), so all later frames
    # are measured as +/- from this starting pose — no manual calibration step.
    if AUTO_CALIBRATE_ON_FIRST_FACE and not _is_calibrated:
        _reference_yaw = yaw
        _reference_pitch = pitch
        _is_calibrated = True

    # How far the head has turned away from the reference "looking at screen"
    # pose.
    yaw_offset = yaw - _reference_yaw
    pitch_offset = pitch - _reference_pitch

    looking_at_screen = (
        abs(yaw_offset) <= YAW_LIMIT_DEG and abs(pitch_offset) <= PITCH_LIMIT_DEG
    )

    return {
        "has_face": True,
        "looking_at_screen": looking_at_screen,
        "yaw": yaw,
        "pitch": pitch,
        "roll": roll,
        "yaw_offset": yaw_offset,
        "pitch_offset": pitch_offset,
        "is_calibrated": _is_calibrated,
        "face_count": face_count,
    }


def detect_gaze(frame) -> dict:
    """High-level per-frame gaze event, shaped for the WebSocket protocol.

    status is "focused" when a face is found and turned toward the screen,
    otherwise "distracted" (turned away, or no face in view).
    """
    timestamp_ms = int(time.time() * 1000)
    gaze = analyze_gaze(frame)

    # Three distinct cases, written out explicitly:

    # 1. Face found AND turned toward the screen -> focused (confident).
    if gaze["has_face"] and gaze["looking_at_screen"]:
        return _build_result("focused", 1.0, timestamp_ms)

    # 2. Face found but turned away -> distracted (confident: we saw the face
    #    and measured its angle).
    if gaze["has_face"]:
        return _build_result("distracted", 1.0, timestamp_ms)

    # 3. No face at all -> distracted, but low confidence (0.0): we're only
    #    guessing the user is distracted because nobody is in view. The policy
    #    layer can use this to tell "looked away" apart from "walked away".
    return _build_result("distracted", 0.0, timestamp_ms)


def _build_result(status: str, confidence: float, timestamp_ms: int) -> dict:
    """Assemble the protocol-shaped result dict in one place."""
    return {
        "type": "gaze",
        "status": status,
        "confidence": confidence,
        "timestamp": timestamp_ms,
    }
