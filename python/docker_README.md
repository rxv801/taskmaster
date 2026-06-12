# Taskmaster CV Worker

Computer vision worker responsible for phone detection and future focus monitoring features.

## Option 1: Docker (recommended)

No local Python setup required.

Build the image:

```bash
docker build -t taskmaster-cv-worker ./python
```

Run image-based detection:

```bash
docker run --rm taskmaster-cv-worker python cv/phone_image_test.py test_assets/phone_sample.jpg
```

Expected output:

```text
{'type': 'phone', 'status': 'detected', ...}
```

This uses a sample image and does not require a webcam.

---

## Option 2: Local development

Recommended for webcam testing.

Create a virtual environment:

```bash
cd python
python3.11 -m venv .venv
```

Activate it:

Linux/macOS:

```bash
source .venv/bin/activate
```

Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Download the model:

```bash
./setup.sh
```

Run webcam test:

```bash
python cv/phone_detect_test.py
```

Run detection loop:

```bash
python cv/detection_loop.py
```

---

## Install Docker

### Windows / macOS

Download Docker Desktop:

https://www.docker.com/products/docker-desktop/

Verify installation:

```bash
docker --version
docker run hello-world
```

### Ubuntu

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
```

Verify installation:

```bash
docker --version
docker run hello-world
```

---

## Notes

- Python 3.11 is required.
- The YOLOX-S model is not committed to Git.
- Docker downloads the model during image build.
- Docker is intended for environment consistency and automated testing.
- Webcam testing is currently easier to perform locally.