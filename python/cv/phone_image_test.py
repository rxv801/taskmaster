import sys
import cv2

from phone_detector import detect_phone


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python cv/phone_image_test.py <image_path>")

    image_path = sys.argv[1]
    frame = cv2.imread(image_path)

    if frame is None:
        raise SystemExit(f"Could not read image: {image_path}")

    result = detect_phone(frame)
    print(result)


if __name__ == "__main__":
    main()