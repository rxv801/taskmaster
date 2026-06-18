# Unregisters the Taskmaster Browser Monitor native host from Chromium browsers under HKCU.
# Generated files are left on disk so local debugging artifacts are not removed unexpectedly.

$ErrorActionPreference = "Stop"

$hostName = "com.taskmaster.browser_monitor"
$registryPaths = @(
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName",
  "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName"
)

foreach ($registryPath in $registryPaths) {
  if (Test-Path $registryPath) {
    Remove-Item -LiteralPath $registryPath -Recurse -Force
    Write-Host "Removed $registryPath"
  } else {
    Write-Host "Registry key was not present: $registryPath"
  }
}
