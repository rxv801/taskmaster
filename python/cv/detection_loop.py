"""Detection loop — the heartbeat that ties the camera to the detectors.

This module owns the repeating cycle:

    grab a frame  ->  run the phone detector on it  ->  hand off the result

For now it just prints each result so you can watch the pipeline work. Later
the same loop will push results over the WebSocket to the Electron app instead
of printing them, and it will also call the gaze detector alongside the phone
detector.

Run it directly to try it out (camera light should turn on):

    cd python
    source .venv/bin/activate
    python cv/detection_loop.py

Press Ctrl+C to stop — the camera is always released cleanly on the way out.
"""

# time — used to pace the loop so we don't pin the CPU at 100%.
import time

# Sibling modules in this same cv/ folder. When you run this file as a script,
# Python puts this folder on the import path, so these plain imports resolve.
import camera
import phone_detector


# How many times per second we sample the webcam. 10 fps is plenty for
# detecting something as slow as "is the user holding a phone", and it keeps
# CPU usage low. Derived sleep below is 1 / this.
FRAMES_PER_SECOND = 10
_SECONDS_PER_FRAME = 1.0 / FRAMES_PER_SECOND


def run_detection_loop(camera_device_index: int = 0) -> None:
    """Open the camera and run the detect-on-every-frame loop until stopped.

    camera_device_index = 0 means the default webcam (see camera.py).
    The loop runs forever; stop it with Ctrl+C (KeyboardInterrupt).
    """

    # Turn the webcam on. Raises if no camera is available, so if we get past
    # this line we know frames should be coming.
    camera.start_camera(camera_device_index)
    print(f"[detection_loop] camera started — sampling at {FRAMES_PER_SECOND} fps")
    print("[detection_loop] press Ctrl+C to stop\n")

    try:
        # The main loop. Keep going until the user interrupts us.
        while True:
            # 1) Grab the most recent frame from the webcam. May be None if a
            #    single read failed (driver hiccup) — the detector handles that.
            current_frame = camera.read_current_frame()

            # 2) Ask the phone detector what it sees in this frame.
            phone_result = phone_detector.detect_phone(current_frame)

            # 3) For now, just print it. Later: send over WebSocket instead.
            print(_format_result_for_console(phone_result))

            # 4) Wait a beat so we sample at roughly FRAMES_PER_SECOND, not as
            #    fast as the CPU can spin.
            time.sleep(_SECONDS_PER_FRAME)

    except KeyboardInterrupt:
        # Ctrl+C lands here. Not an error — it's the normal way to stop.
        print("\n[detection_loop] stop requested")

    finally:
        # Whatever happens (normal stop OR a crash), always free the webcam so
        # other apps — and the next run — can use it.
        camera.stop_camera()
        print("[detection_loop] camera released — bye")


def _format_result_for_console(result: dict) -> str:
    """Turn a detection dict into a short, readable one-line string."""
    return (
        f"phone={result['status']:<8} "
        f"confidence={result['confidence']:.2f} "
        f"t={result['timestamp']}"
    )


# Standard Python entry-point guard: this block only runs when the file is
# executed directly (python cv/detection_loop.py), not when it is imported.
if __name__ == "__main__":
    run_detection_loop()
