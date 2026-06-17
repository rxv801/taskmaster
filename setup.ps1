# Taskmaster one-shot setup (Windows / PowerShell).
# Mirror of setup.sh. Installs BOTH halves of the app:
#   1. Python CV worker  -> venv at python\.venv + pip deps from python\requirements.txt
#   2. Electron app      -> npm deps in electron\
#
# Usage (from a PowerShell prompt in the repo root):
#   ./setup.ps1
#
# If you hit an execution-policy error, run once:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#
# Re-runnable: safe to run again; it reuses an existing venv and npm cache.

# Stop immediately if any command fails.
$ErrorActionPreference = 'Stop'

# Always operate relative to this script's own location, no matter where it
# is called from.
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

# ---------------------------------------------------------------------------
# 1. Python CV worker
# ---------------------------------------------------------------------------
Write-Host '==> [1/2] Python CV worker'

# MediaPipe has no wheels for Python 3.13/3.14, so we pin to 3.11 explicitly.
# We resolve the interpreter to an executable plus any prefix args: the Windows
# Python launcher (`py`) needs `-3.11` to select the version, whereas a plain
# `python3.11` on PATH needs none.
$pythonExe = $null
$pythonPreArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) {
  # `py -3.11 --version` succeeds only if 3.11 is actually installed.
  & py -3.11 --version 2>$null
  if ($LASTEXITCODE -eq 0) {
    $pythonExe = 'py'
    $pythonPreArgs = @('-3.11')
  }
}
if (-not $pythonExe -and (Get-Command python3.11 -ErrorAction SilentlyContinue)) {
  $pythonExe = 'python3.11'
}
if (-not $pythonExe) {
  Write-Error "python3.11 not found. Install Python 3.11 (e.g. from python.org or 'winget install Python.Python.3.11') and re-run."
  exit 1
}

# Create the venv only if it does not already exist.
if (-not (Test-Path 'python\.venv')) {
  Write-Host '    creating venv at python\.venv (Python 3.11)'
  & $pythonExe @pythonPreArgs -m venv python\.venv
} else {
  Write-Host '    reusing existing venv at python\.venv'
}

# Install dependencies into the venv using its own pip (no need to 'activate').
Write-Host '    installing Python dependencies'
& python\.venv\Scripts\python.exe -m pip install --upgrade pip
& python\.venv\Scripts\python.exe -m pip install -r python\requirements.txt

# Download the phone-detection model (YOLOX-S, Apache-2.0). It is gitignored
# (~34 MB), so a fresh clone needs to fetch it once.
$phoneModel = 'python\models\yolox_s.onnx'
if (-not (Test-Path $phoneModel)) {
  Write-Host '    downloading phone-detection model (YOLOX-S)'
  New-Item -ItemType Directory -Force -Path 'python\models' | Out-Null
  Invoke-WebRequest -Uri 'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_s.onnx' -OutFile $phoneModel
} else {
  Write-Host '    phone-detection model already present'
}

# Download the gaze model (MediaPipe FaceLandmarker, Apache-2.0). Gitignored
# (~3.6 MB), fetched once on a fresh clone.
$gazeModel = 'python\models\face_landmarker.task'
if (-not (Test-Path $gazeModel)) {
  Write-Host '    downloading gaze model (FaceLandmarker)'
  New-Item -ItemType Directory -Force -Path 'python\models' | Out-Null
  Invoke-WebRequest -Uri 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task' -OutFile $gazeModel
} else {
  Write-Host '    gaze model already present'
}

# ---------------------------------------------------------------------------
# 2. Electron app
# ---------------------------------------------------------------------------
Write-Host '==> [2/2] Electron app'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error 'npm not found. Install Node.js >= 18 and re-run.'
  exit 1
}

Write-Host '    installing npm dependencies in electron\'
Push-Location electron
try {
  & npm install
} finally {
  Pop-Location
}

# ---------------------------------------------------------------------------
Write-Host ''
Write-Host 'Done. To run the app:'
Write-Host '    cd electron; npm run dev'
Write-Host 'Electron starts the Python CV worker automatically when detection is needed.'
Write-Host ''
Write-Host 'To run the CV worker by itself (e.g. for testing):'
Write-Host '    cd python; .\.venv\Scripts\Activate.ps1; python -m uvicorn main:app --port 8765'
