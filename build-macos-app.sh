#!/usr/bin/env bash
#
# Build a distributable macOS .app (and .dmg) for Taskmaster.
#
# Produces an arm64 (Apple Silicon), unsigned build with the Python CV worker
# bundled in, so the result runs on a Mac that has no Python or Node installed.
#
# Run ./setup.sh FIRST to install dependencies and download the models — this
# script only does the build/packaging steps and assumes setup is done.
#
# Usage (from the repo root):
#   ./setup.sh            # once, to install deps + models
#   ./build-macos-app.sh  # to build the app
#
# Output:
#   electron/release/Taskmaster-<version>-arm64.dmg
#   electron/release/mac-arm64/Taskmaster.app
#
# Prerequisites: macOS on Apple Silicon, Node.js, and python3.11.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# --- Sanity checks -----------------------------------------------------------
if [ "$(uname)" != "Darwin" ]; then
  echo "ERROR: this script builds a macOS app and only runs on macOS." >&2
  exit 1
fi

if [ "$(uname -m)" != "arm64" ]; then
  echo "ERROR: this build targets Apple Silicon (arm64) only. Building on an" >&2
  echo "       Intel Mac would produce a worker for the wrong architecture." >&2
  exit 1
fi

# setup.sh creates these; if they're missing, the user hasn't run it yet.
if [ ! -d "python/.venv" ] || [ ! -d "electron/node_modules" ]; then
  echo "ERROR: dependencies not found. Run ./setup.sh first." >&2
  exit 1
fi

if [ ! -f "python/models/yolox_s.onnx" ] || [ ! -f "python/models/face_landmarker.task" ]; then
  echo "ERROR: ML models not found in python/models/. Run ./setup.sh first." >&2
  exit 1
fi

# --- 1. PyInstaller ----------------------------------------------------------
# Only needed to build the app, so it's installed here rather than shipped in
# requirements.txt or setup.sh.
echo "==> [1/3] Installing PyInstaller into the venv"
python/.venv/bin/pip install --quiet --upgrade pyinstaller

# --- 2. Freeze the CV worker -------------------------------------------------
# Must run before packaging: electron-builder copies python/dist/taskmaster_worker
# into the .app, so the frozen worker has to exist first.
echo "==> [2/3] Freezing the Python CV worker (this takes a few minutes)"
( cd python && ./build_worker.sh )

# --- 3. Package the Electron app ---------------------------------------------
echo "==> [3/3] Packaging the Electron app"
( cd electron && npm run dist:mac )

# --- 4. Ad-hoc re-sign -------------------------------------------------------
# electron-builder skips signing without a Developer ID, leaving the default
# Electron "linker-signed" stub (Identifier=Electron, resources not sealed).
# macOS then can't attach a persistent permission (TCC) grant to the app, so it
# re-prompts for camera / accessibility every time. A proper deep ad-hoc sign
# seals the bundle under its real identifier (com.taskmaster.app) so the grants
# stick. This isn't a Developer ID — for sharing with others you still need one
# plus notarization — but it fixes the repeated prompts for local use.
APP="electron/release/mac-arm64/Taskmaster.app"
if [ -d "$APP" ]; then
  echo "==> [4/4] Ad-hoc signing so macOS remembers permissions"
  codesign --force --deep --sign - "$APP"
  codesign --verify --deep --strict "$APP" && echo "    signature OK"
fi

echo ""
echo "Done. Build output:"
ls -1 electron/release/*.dmg 2>/dev/null || true
echo "  electron/release/mac-arm64/Taskmaster.app"
echo ""
echo "First launch is unsigned to Apple: right-click the .app -> Open once."
