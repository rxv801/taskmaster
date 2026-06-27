# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for the Taskmaster CV worker.
#
# Freezes python/main.py (the FastAPI/uvicorn WebSocket server) into a
# standalone --onedir bundle so the packaged Electron app can run gaze/phone
# detection without a system Python or the project venv.
#
# Build:  .venv/bin/pyinstaller taskmaster_worker.spec
# Output: dist/taskmaster_worker/taskmaster_worker
#
# The ML models (models/*.onnx, *.task) are intentionally NOT bundled here —
# they ship alongside the app via electron-builder extraResources and are
# located at runtime through the TASKMASTER_MODELS_DIR env var.

from PyInstaller.utils.hooks import collect_all

datas = []
binaries = []

# uvicorn loads its protocol/loop/lifespan implementations lazily by string
# name, so PyInstaller can't see them through normal import analysis.
hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "cv.phone_detector",
    "cv.gaze_detector",
]

# mediapipe ships runtime graph/model data (.binarypb, .tflite) and onnxruntime
# ships native provider libraries that aren't discovered by import analysis.
for package in ("mediapipe", "onnxruntime"):
    pkg_datas, pkg_binaries, pkg_hidden = collect_all(package)
    datas += pkg_datas
    binaries += pkg_binaries
    hiddenimports += pkg_hidden

a = Analysis(
    ["main.py"],
    pathex=["."],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="taskmaster_worker",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    target_arch="arm64",
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="taskmaster_worker",
)
