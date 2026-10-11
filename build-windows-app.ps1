# Build a distributable Windows app for Taskmaster.
#
# Produces an unsigned Windows installer plus an unpacked app folder with the
# frozen Python CV worker bundled in, so the app does not need system Python or
# Node when launched from the packaged output.
#
# Usage, from the repo root:
#   .\setup.ps1
#   .\build-windows-app.ps1

$ErrorActionPreference = 'Stop'

$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

$IsRunningOnWindows = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT

if (-not $IsRunningOnWindows) {
  Write-Error 'This script builds the Windows app and only runs on Windows.'
  exit 1
}

function Assert-PathExists {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path,
    [Parameter(Mandatory = $true)]
    [string] $Message
  )

  if (-not (Test-Path $Path)) {
    Write-Error $Message
    exit 1
  }
}

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Command,
    [string[]] $Arguments = @()
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
  }
}

function Test-VisualStudioBuildTools {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'

  if (-not (Test-Path $vswhere)) {
    return $false
  }

  $installationPath = & $vswhere `
    -latest `
    -products * `
    -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
    -property installationPath

  return $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($installationPath)
}

Assert-PathExists `
  -Path 'python\.venv' `
  -Message 'Python venv not found at python\.venv. Run .\setup.ps1 first.'

Assert-PathExists `
  -Path 'electron\node_modules' `
  -Message 'Electron dependencies not found at electron\node_modules. Run .\setup.ps1 first.'

Assert-PathExists `
  -Path 'python\models\yolox_s.onnx' `
  -Message 'Phone-detection model not found. Run .\setup.ps1 first.'

Assert-PathExists `
  -Path 'python\models\face_landmarker.task' `
  -Message 'Gaze model not found. Run .\setup.ps1 first.'

if (-not (Test-VisualStudioBuildTools)) {
  Write-Error 'Visual Studio Build Tools with the C++ toolchain were not found. Install "Build Tools for Visual Studio" with "Desktop development with C++", then rerun .\build-windows-app.ps1.'
  exit 1
}

Write-Host '==> [1/3] Installing PyInstaller into the venv'
Invoke-CheckedCommand `
  -Command '.\python\.venv\Scripts\python.exe' `
  -Arguments @('-m', 'pip', 'install', '--quiet', '--upgrade', 'pyinstaller')

Write-Host '==> [2/3] Freezing the Python CV worker'
Push-Location python
try {
  Invoke-CheckedCommand -Command '.\build_worker.ps1'
} finally {
  Pop-Location
}

Write-Host '==> [3/3] Packaging the Electron app'
Push-Location electron
try {
  Invoke-CheckedCommand -Command 'npm' -Arguments @('run', 'dist:win')
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'Done. Build output should include:'
Write-Host '  electron\release\Taskmaster Setup <version>.exe'
Write-Host '  electron\release\win-unpacked\Taskmaster.exe'
Write-Host ''
Write-Host 'The Windows build is unsigned, so SmartScreen may warn during testing.'
