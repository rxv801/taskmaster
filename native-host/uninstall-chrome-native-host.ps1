# Unregisters the Taskmaster Browser Monitor native host from Chrome under HKCU.
# Generated files are left on disk so local debugging artifacts are not removed unexpectedly.

$ErrorActionPreference = "Stop"

$hostName = "com.taskmaster.browser_monitor"
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"

if (Test-Path $registryPath) {
  Remove-Item -LiteralPath $registryPath -Recurse -Force
  Write-Host "Unregistered $hostName"
} else {
  Write-Host "$hostName was not registered"
}
