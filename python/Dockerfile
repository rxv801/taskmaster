FROM python:3.11-slim

WORKDIR /app

# Install system dependencies commonly needed by OpenCV/MediaPipe at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Download YOLOX-S phone detection model into the image
RUN mkdir -p models && \
    python -c "import urllib.request; urllib.request.urlretrieve('https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_s.onnx', 'models/yolox_s.onnx')"

COPY . .

CMD ["python", "-m", "compileall", "."]