#!/usr/bin/env bash
# Freezes the Taskmaster CV worker into a standalone --onedir bundle using
# PyInstaller, so the packaged Electron app can run detection without a system
# Python or the project venv.
#
# Run from the python/ folder:
#   ./build_worker.sh
#
# Output: dist/taskmaster_worker/taskmaster_worker  (+ its bundled libraries)
# The Electron build copies this into the .app via electron-builder extraResources.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$script_dir"

if [ ! -x ".venv/bin/pyinstaller" ]; then
  echo "PyInstaller not found in .venv. Install it with:" >&2
  echo "  .venv/bin/pip install pyinstaller" >&2
  exit 1
fi

rm -rf build dist
.venv/bin/pyinstaller --noconfirm --clean taskmaster_worker.spec

echo "Built dist/taskmaster_worker/taskmaster_worker"
