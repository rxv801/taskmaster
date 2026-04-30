"""Webcam capture module.

Owns the single webcam handle for the whole Python worker.
Other modules import this file and call its public functions:
    start_camera() / read_current_frame() / stop_camera()
"""

# OpenCV — the library that talks to the webcam hardware
import cv2


# ---------------------------------------------------------------------------
# Module-level state (shared across the whole program)
# Underscore prefix means "private — do not touch from outside this file".
# ---------------------------------------------------------------------------

# Holds the active OpenCV VideoCapture object once the camera is opened.
# Starts as None because no camera is open when the program first loads.
_webcam_capture_handle: cv2.VideoCapture | None = None

# Tracks whether the webcam is currently streaming.
# Other modules can check this before asking for a frame.
_is_camera_currently_running: bool = False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def start_camera(camera_device_index: int = 0) -> None:
    """Open the webcam so frames can be read from it.

    camera_device_index = 0 means "use the default webcam".
    On laptops with multiple cameras you can pass 1, 2, etc.
    """

    # Tell Python we are modifying the module-level variables, not creating
    # new local ones with the same name inside this function.
    global _webcam_capture_handle, _is_camera_currently_running

    # If the camera is already running, do nothing — avoid opening it twice.
    if _is_camera_currently_running:
        return

    # Ask OpenCV to open the webcam at the given device index.
    # This returns a VideoCapture object we can later read frames from.
    _webcam_capture_handle = cv2.VideoCapture(camera_device_index)

    # Check that the camera was actually opened successfully.
    # If the user has no webcam, or another app is using it, this fails.
    if not _webcam_capture_handle.isOpened():
        raise RuntimeError(f"Could not open camera at index {camera_device_index}")

    # Mark the camera as running so other modules know it is ready.
    _is_camera_currently_running = True


def read_current_frame():
    """Grab the latest frame from the webcam.

    Returns the frame as a NumPy array (an image), or None if the camera
    is off or the read failed for any reason.
    """

    # If the camera is not running, there is nothing to read — bail out.
    if not _is_camera_currently_running or _webcam_capture_handle is None:
        return None

    # Ask OpenCV for the next frame.
    # cap.read() returns two values:
    #   was_read_successful  -> True if a frame came back, False otherwise
    #   captured_frame_image -> the actual image data (a NumPy array)
    was_read_successful, captured_frame_image = _webcam_capture_handle.read()

    # If reading failed (camera unplugged mid-session, driver hiccup, etc.),
    # return None so the caller can decide how to handle it.
    if not was_read_successful:
        return None

    # Hand the frame back to whoever asked for it (e.g. the detector).
    return captured_frame_image


def is_camera_running() -> bool:
    """Public read-only check: is the camera currently streaming?"""
    return _is_camera_currently_running


def stop_camera() -> None:
    """Release the webcam so other apps can use it again."""

    # We are about to mutate the module-level variables.
    global _webcam_capture_handle, _is_camera_currently_running

    # Only release if we actually have a capture handle to release.
    if _webcam_capture_handle is not None:
        # Tell OpenCV to free the webcam hardware.
        _webcam_capture_handle.release()

    # Clear the handle and the running flag so the module is back to idle.
    _webcam_capture_handle = None
    _is_camera_currently_running = False
