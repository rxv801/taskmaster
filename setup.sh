#!/usr/bin/env bash
#
# Taskmaster one-shot setup.
# Installs BOTH halves of the app:
#   1. Python CV worker  -> venv at python/.venv + pip deps from python/requirements.txt
#   2. Electron app      -> npm deps in electron/
#
# Usage:
#   ./setup.sh
#
# Re-runnable: safe to run again; it reuses an existing venv and npm cache.

# Stop immediately if any command fails, and treat unset vars as errors.
set -euo pipefail

# Always operate relative to this script's own location, no matter where it
# is called from.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ---------------------------------------------------------------------------
# 1. Python CV worker
# ---------------------------------------------------------------------------
echo "==> [1/2] Python CV worker"

# MediaPipe has no wheels for Python 3.13/3.14, so we pin to 3.11 explicitly.
if ! command -v python3.11 >/dev/null 2>&1; then
  echo "ERROR: python3.11 not found. Install it (e.g. 'brew install python@3.11') and re-run." >&2
  exit 1
fi

# Create the venv only if it does not already exist.
if [ ! -d "python/.venv" ]; then
  echo "    creating venv at python/.venv (Python 3.11)"
  python3.11 -m venv python/.venv
else
  echo "    reusing existing venv at python/.venv"
fi

# Install dependencies into the venv using its own pip (no need to 'activate').
echo "    installing Python dependencies"
python/.venv/bin/pip install --upgrade pip
python/.venv/bin/pip install -r python/requirements.txt

# ---------------------------------------------------------------------------
# 2. Electron app
# ---------------------------------------------------------------------------
echo "==> [2/2] Electron app"

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm not found. Install Node.js >= 18 and re-run." >&2
  exit 1
fi

echo "    installing npm dependencies in electron/"
( cd electron && npm install )

# ---------------------------------------------------------------------------
echo ""
echo "Done. To run the CV worker:"
echo "    cd python && source .venv/bin/activate && python cv/detection_loop.py"
echo "To run the Electron app:"
echo "    cd electron && npm run dev"
