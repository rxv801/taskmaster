# Registers the Taskmaster Browser Monitor native host for Chrome under HKCU.
# This does not require admin rights and writes a generated local manifest.

$ErrorActionPreference = "Stop"

$hostName = "com.taskmaster.browser_monitor"
$nativeHostDir = $PSScriptRoot
$generatedDir = Join-Path $nativeHostDir ".generated"
$generatedManifestPath = Join-Path $generatedDir "$hostName.chrome.json"
$generatedLauncherPath = Join-Path $generatedDir "taskmaster-browser-monitor-host.cmd"
$hostScriptPath = Join-Path $nativeHostDir "taskmaster-browser-monitor-host.js"
$nodePath = (Get-Command node -ErrorAction Stop).Source
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"

New-Item -ItemType Directory -Path $generatedDir -Force | Out-Null

$launcherContent = @"
@echo off
"$nodePath" "$hostScriptPath"
"@

Set-Content -LiteralPath $generatedLauncherPath -Value $launcherContent -Encoding ASCII

$manifest = @{
  name = $hostName
  description = "Taskmaster Browser Monitor Native Host"
  path = $generatedLauncherPath
  type = "stdio"
  allowed_origins = @(
    "chrome-extension://kibldolnfbpajohdnkbjfjefnemllapm/"
  )
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $generatedManifestPath -Encoding UTF8

New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $generatedManifestPath

Write-Host "Registered $hostName"
Write-Host "Manifest: $generatedManifestPath"
Write-Host "Registry: $registryPath"
