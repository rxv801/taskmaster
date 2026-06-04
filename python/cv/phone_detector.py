"""Phone-in-frame detection.

Perception only: given one webcam frame, decide whether a phone is visible.
Whether being on the phone *counts as distracted* (for how long, etc.) is
policy that lives elsewhere — this module just answers "phone in this frame?".

Backed by YOLOX-S (Apache-2.0) running locally via onnxruntime (MIT). Both
are permissively licensed and bundle cleanly into a shipped app — no PyTorch,
no AGPL.

Public API:
    find_phones(frame) -> list[(x1, y1, x2, y2, score)]   # raw boxes
    detect_phone(frame) -> dict                            # protocol event

The event dict matches the WebSocket protocol in PLAN.md:
    { "type": "phone", "status": "none"|"detected",
      "confidence": float, "timestamp": int }
"""

import os
import time

import cv2
import numpy as np
import onnxruntime as ort


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Model path resolved relative to this file (python/cv/), so it works no
# matter which directory the program is launched from.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_THIS_DIR, "..", "models", "yolox_s.onnx")

# YOLOX-S input resolution.
INPUT_SIZE = (640, 640)

# COCO class index for "cell phone" (class 67 of the model's 80).
CELL_PHONE_CLASS_ID = 67

# Minimum combined score (objectness * class prob) to believe a detection.
SCORE_THRESHOLD = 0.30

# IoU threshold for non-max suppression (drops duplicate overlapping boxes).
NMS_IOU_THRESHOLD = 0.45


# ---------------------------------------------------------------------------
# Module-level state: the model is loaded once and reused for every frame.
# Loading on every call would be unbearably slow.
# ---------------------------------------------------------------------------

_session: ort.InferenceSession | None = None


def _get_session() -> ort.InferenceSession:
    """Lazily create (and cache) the onnxruntime session."""
    global _session
    if _session is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"YOLOX model not found at {MODEL_PATH}. "
                "Run ./setup.sh (or download yolox_s.onnx into python/models/)."
            )
        _session = ort.InferenceSession(
            MODEL_PATH, providers=["CPUExecutionProvider"]
        )
    return _session


# ---------------------------------------------------------------------------
# Pre/post-processing
# ---------------------------------------------------------------------------


def _preprocess(frame_bgr: np.ndarray):
    """Resize a webcam frame into the exact input the YOLOX model wants.

    The model only accepts a (1, 3, 640, 640) float32 array. A webcam frame is
    a different size and shape, so we convert it here. We shrink the frame to
    fit a 640x640 box WITHOUT stretching it, then pad the leftover space with
    grey (this is called "letterboxing", like the bars around a widescreen
    movie). Stretching would distort the phone and hurt detection.

    Returns:
        input_tensor: the (1, 3, 640, 640) float32 array for the model.
        scale_ratio:  how much we shrank by, so detected boxes can later be
                      scaled back up onto the original full-size frame.
    """

    # 1. Measure the original webcam frame. A frame's shape is (height, width,
    #    channels), so shape[0] is height and shape[1] is width.
    original_height = frame_bgr.shape[0]
    original_width = frame_bgr.shape[1]

    # 2. The size the model wants (640 x 640).
    target_height = INPUT_SIZE[0]
    target_width = INPUT_SIZE[1]

    # 3. Work out how much to shrink. We need one scale factor that fits BOTH
    #    sides inside 640. Taking the smaller of the two keeps the aspect ratio
    #    and guarantees neither side spills past 640.
    height_scale = target_height / original_height
    width_scale = target_width / original_width
    scale_ratio = min(height_scale, width_scale)

    # 4. The frame's new size after shrinking by that factor.
    resized_width = int(original_width * scale_ratio)
    resized_height = int(original_height * scale_ratio)

    # 5. Actually shrink the frame to that size.
    #    Note: cv2.resize takes the size as (width, height) — width first.
    resized_frame = cv2.resize(
        frame_bgr,
        (resized_width, resized_height),
        interpolation=cv2.INTER_LINEAR,
    )

    # 6. Make a blank 640x640 grey canvas (every pixel = 114, a mid grey),
    #    then paste the shrunk frame into its top-left corner. The rest stays
    #    grey — that grey padding is the "letterbox".
    grey_value = 114
    letterboxed = np.full(
        (target_height, target_width, 3), grey_value, dtype=np.uint8
    )
    letterboxed[:resized_height, :resized_width] = resized_frame

    # 7. Reorder the axes from (height, width, channels) to (channels, height,
    #    width). OpenCV stores colour last; the model wants colour first.
    channels_first = letterboxed.transpose(2, 0, 1)

    # 8. Add a "batch" dimension at the front: (3, 640, 640) -> (1, 3, 640,
    #    640). Models process a batch of images at once; our batch is 1 image.
    batched = channels_first[np.newaxis, :, :, :]

    # 9. Convert the pixels from whole numbers to decimals (float32), the
    #    number type the model computes in. We do NOT divide by 255 here —
    #    YOLOX expects raw 0-255 values, unlike many other models.
    input_tensor = batched.astype(np.float32)

    # 10. transpose/newaxis above only relabelled the data without moving it,
    #     leaving it scattered in memory. onnxruntime needs it laid out in one
    #     contiguous block, so make a tidy packed copy.
    input_tensor = np.ascontiguousarray(input_tensor)

    return input_tensor, scale_ratio


def _decode(raw: np.ndarray) -> np.ndarray:
    """Turn the model's raw grid output into real pixel coordinates.

    The model does NOT output ready-to-use boxes. It mentally splits the
    640x640 image into grids of cells at three zoom levels (8, 16, and 32
    pixels per cell) and, for each cell, predicts a box as an OFFSET from that
    cell's position. To get real pixel coordinates we add each cell's position
    back and multiply by its stride (its pixels-per-cell). That is "decoding".

    `raw` has shape (8400, 85): 8400 candidate boxes, each row is
    [x_offset, y_offset, width_raw, height_raw, objectness, 80 class scores].
    """

    # For every one of the 8400 rows we need two matching facts:
    #   - which grid cell it came from (its column, row position)
    #   - the stride (pixels-per-cell) of the grid it belongs to
    all_cell_positions = []
    all_cell_strides = []

    # Three grids, fine to coarse. Stride 8 -> 80x80 cells, stride 16 -> 40x40,
    # stride 32 -> 20x20. 80*80 + 40*40 + 20*20 = 8400, matching raw's rows.
    for stride in (8, 16, 32):
        cells_across = INPUT_SIZE[1] // stride   # number of columns
        cells_down = INPUT_SIZE[0] // stride      # number of rows

        # Build the (column, row) index of every cell in this grid.
        column_index, row_index = np.meshgrid(
            np.arange(cells_across), np.arange(cells_down)
        )
        cell_positions = np.stack((column_index, row_index), axis=2).reshape(-1, 2)
        all_cell_positions.append(cell_positions)

        # Every cell in this grid shares the same stride.
        cell_count = cell_positions.shape[0]
        all_cell_strides.append(np.full((cell_count, 1), stride))

    # Glue the three grids into one long list lined up with raw's 8400 rows.
    cell_positions = np.concatenate(all_cell_positions, axis=0)
    cell_strides = np.concatenate(all_cell_strides, axis=0)

    # Box center: real_xy = (predicted_offset + cell_position) * stride
    raw[:, 0:2] = (raw[:, 0:2] + cell_positions) * cell_strides

    # Box size: real_wh = exp(predicted) * stride
    # (exp keeps width/height positive whatever the model outputs.)
    raw[:, 2:4] = np.exp(raw[:, 2:4]) * cell_strides

    return raw


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def find_phones(frame) -> list:
    """Detect phones in one frame.

    Returns a list of (x1, y1, x2, y2, score) tuples in the frame's pixel
    coordinates — empty if no phone is found or the frame is None.
    """
    # No frame (camera hiccup) -> nothing to detect.
    if frame is None:
        return []

    # 1. Load the model (once) and turn the frame into model input.
    session = _get_session()
    input_tensor, scale_ratio = _preprocess(frame)

    # 2. Run the model. It returns a list of outputs; we take the first output
    #    and the first (only) image in the batch -> shape (8400, 85).
    #    np.asarray pins the type to a normal array — the library's type hint
    #    says run() *might* return a non-indexable SparseTensor, which YOLOX
    #    never does — which keeps the type-checker quiet.
    model_outputs = session.run(None, {session.get_inputs()[0].name: input_tensor})
    raw_predictions = np.asarray(model_outputs[0])[0]

    # 3. Decode the raw grid output into real pixel boxes (center x/y, w, h).
    predictions = _decode(raw_predictions)

    # 4. For each of the 8400 candidates, compute how confident we are it is a
    #    PHONE: objectness (is anything here at all?) x phone-class probability.
    #    Column 4 is objectness; column 5 + 67 is the phone class score.
    objectness = predictions[:, 4]
    phone_class_score = predictions[:, 5 + CELL_PHONE_CLASS_ID]
    phone_confidence = objectness * phone_class_score

    # 5. Keep only candidates above our confidence bar. If none survive, there
    #    is no phone in this frame.
    is_confident_phone = phone_confidence > SCORE_THRESHOLD
    if not np.any(is_confident_phone):
        return []

    kept_boxes = predictions[is_confident_phone, :4]   # each row: cx, cy, w, h
    kept_scores = phone_confidence[is_confident_phone]

    # 6. Convert each box from (center_x, center_y, width, height) to corner
    #    form (x1, y1, x2, y2), and divide by scale_ratio to map it from the
    #    640x640 model space back onto the original full-size frame.
    center_x = kept_boxes[:, 0]
    center_y = kept_boxes[:, 1]
    width = kept_boxes[:, 2]
    height = kept_boxes[:, 3]

    corner_boxes = np.empty_like(kept_boxes)
    corner_boxes[:, 0] = (center_x - width / 2) / scale_ratio    # x1 (left)
    corner_boxes[:, 1] = (center_y - height / 2) / scale_ratio   # y1 (top)
    corner_boxes[:, 2] = (center_x + width / 2) / scale_ratio    # x2 (right)
    corner_boxes[:, 3] = (center_y + height / 2) / scale_ratio   # y2 (bottom)

    # 7. The model often fires several overlapping boxes for one phone.
    #    Non-Max Suppression keeps the strongest box and drops its duplicates.
    #    cv2.dnn.NMSBoxes wants each box as [x, y, width, height].
    boxes_for_nms = []
    for box in corner_boxes:
        x1, y1, x2, y2 = box
        boxes_for_nms.append([int(x1), int(y1), int(x2 - x1), int(y2 - y1)])

    kept_indices = cv2.dnn.NMSBoxes(
        boxes_for_nms, kept_scores.tolist(), SCORE_THRESHOLD, NMS_IOU_THRESHOLD
    )

    # 8. Build the final list of surviving phones in original-frame pixels.
    phones = []
    for index in np.array(kept_indices).flatten():
        x1, y1, x2, y2 = corner_boxes[index].astype(int)
        score = float(kept_scores[index])
        phones.append((int(x1), int(y1), int(x2), int(y2), score))
    return phones


def detect_phone(frame) -> dict:
    """High-level per-frame phone event, shaped for the WebSocket protocol.

    status is "detected" if any phone is found, else "none". confidence is
    the strongest phone score in the frame (0.0 when none).
    """
    timestamp_ms = int(time.time() * 1000)
    phones = find_phones(frame)

    if not phones:
        return _build_result("none", 0.0, timestamp_ms)

    # Each phone tuple is (x1, y1, x2, y2, score); we only want the score (idx 4).
    best_score = max(phone[4] for phone in phones)
    return _build_result("detected", best_score, timestamp_ms)


def _build_result(status: str, confidence: float, timestamp_ms: int) -> dict:
    """Assemble the protocol-shaped result dict in one place."""
    return {
        "type": "phone",
        "status": status,
        "confidence": confidence,
        "timestamp": timestamp_ms,
    }
