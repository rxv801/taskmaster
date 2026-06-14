"""Manual visual test for the gaze detector.

Opens the webcam, runs gaze_detector.analyze_gaze() on each frame, and draws
the head-pose angles plus a big FOCUSED / DISTRACTED label. Use it to calibrate
YAW_LIMIT_DEG / PITCH_LIMIT_DEG in gaze_detector.py: turn your head until the
label flips, and read the angle where that happens.
Run it:
    cd python
    source .venv/bin/activate
    python cv/gaze_detect_test.py

Press 'q' (video window focused) or Ctrl+C to quit.
"""

import cv2

import gaze_detector


def main() -> None:
    capture = cv2.VideoCapture(0)
    if not capture.isOpened():
        raise RuntimeError("Could not open webcam (index 0).")

    print("Running. Look at the screen — the FIRST detected pose auto-sets as 0.")
    print("Turn your head away to see it flip. 'c' re-baselines, 'q'/Ctrl+C quits.\n")

    try:
        while True:
            ok, frame = capture.read()
            if not ok or frame is None:
                continue

            gaze = gaze_detector.analyze_gaze(frame)

            # Decide label + colour. Green when focused, red otherwise.
            if gaze["has_face"] and gaze["looking_at_screen"]:
                label, colour = "FOCUSED", (0, 200, 0)
            elif gaze["has_face"]:
                label, colour = "DISTRACTED (turned away)", (0, 0, 255)
            else:
                label, colour = "NO FACE", (0, 0, 255)

            cv2.putText(
                frame,
                label,
                (20, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                colour,
                2,
            )

            # Show the offset-from-reference angles (what the decision uses) and
            # whether we've calibrated yet.
            if gaze["has_face"]:
                offsets = (
                    f"yaw {gaze['yaw_offset']:+.0f}  pitch {gaze['pitch_offset']:+.0f}"
                )
                cv2.putText(
                    frame,
                    offsets,
                    (20, 90),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2,
                )

            cal_text = (
                "calibrated (c = re-baseline)"
                if gaze["is_calibrated"]
                else "waiting for face..."
            )
            cv2.putText(
                frame,
                cal_text,
                (20, 125),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (180, 180, 180),
                2,
            )

            # How many people are in frame — tracking only the locked user.
            faces_text = f"faces in frame: {gaze['face_count']}  (tracking user)"
            cv2.putText(
                frame,
                faces_text,
                (20, 155),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (180, 180, 180),
                2,
            )

            cv2.imshow("gaze detector test  (c=calibrate, q=quit)", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("c"):
                if gaze_detector.calibrate(frame):
                    print("\ncalibrated to current pose as 'looking at screen'")
                else:
                    print("\ncalibration failed — no face visible")

    except KeyboardInterrupt:
        pass
    finally:
        capture.release()
        cv2.destroyAllWindows()
        print("\nstopped.")


if __name__ == "__main__":
    main()
