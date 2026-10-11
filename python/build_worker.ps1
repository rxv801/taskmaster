# Freezes the Taskmaster CV worker into a standalone Windows onedir bundle.
#
# Run from the python folder, or from any location:
#   .\build_worker.ps1
#
# Output:
#   dist\taskmaster_worker\taskmaster_worker.exe

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$PyInstaller = '.\.venv\Scripts\pyinstaller.exe'

if (-not (Test-Path $PyInstaller)) {
  Write-Error 'PyInstaller not found in .venv. Install it with: .\.venv\Scripts\python.exe -m pip install pyinstaller'
  exit 1
}

Remove-Item -Recurse -Force build, dist -ErrorAction SilentlyContinue
& $PyInstaller --noconfirm --clean taskmaster_worker.spec
if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller failed with exit code ${LASTEXITCODE}."
}

Write-Host 'Built dist\taskmaster_worker\taskmaster_worker.exe'
