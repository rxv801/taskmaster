"""Manual visual test for the phone detector.

Opens the webcam, runs phone_detector.find_phones() on each frame, and draws
a red box + confidence around any phone it sees. Hold your phone up — it
should light up. This is just a visualiser; all the detection logic lives in
phone_detector.py.

Run it:
    cd python
    source .venv/bin/activate
    python cv/phone_detect_test.py

Press 'q' (video window focused) or Ctrl+C to quit.
"""

import cv2  # type: ignore

import phone_detector


def main() -> None:
    capture = cv2.VideoCapture(0)
    if not capture.isOpened():
        raise RuntimeError("Could not open webcam (index 0).")

    print("Running. Hold a phone up. Press 'q' or Ctrl+C to quit.\n")

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                continue

            phones = phone_detector.find_phones(frame)

            for x1, y1, x2, y2, score in phones:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(
                    frame, f"PHONE {score:.2f}", (x1, max(y1 - 8, 12)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2,
                )

            print("PHONE DETECTED" if phones else "...", end="\r", flush=True)

            cv2.imshow("phone detector test  (press q to quit)", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    except KeyboardInterrupt:
        pass
    finally:
        capture.release()
        cv2.destroyAllWindows()
        print("\nstopped.")


if __name__ == "__main__":
    main()
