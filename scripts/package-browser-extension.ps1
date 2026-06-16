# Packages the Taskmaster browser extension for manual Chrome Web Store upload.
# The script is dependency-free and includes only the extension runtime files.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$extensionDir = Join-Path $repoRoot "browser-extension"
$distDir = Join-Path $repoRoot "dist"
$zipPath = Join-Path $distDir "taskmaster-browser-monitor-extension.zip"
$stagingDir = Join-Path $distDir "taskmaster-browser-monitor-extension"

if (Test-Path $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $extensionDir "manifest.json") -Destination $stagingDir
Copy-Item -LiteralPath (Join-Path $extensionDir "background.js") -Destination $stagingDir

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath
Remove-Item -LiteralPath $stagingDir -Recurse -Force

Write-Host "Created $zipPath"
