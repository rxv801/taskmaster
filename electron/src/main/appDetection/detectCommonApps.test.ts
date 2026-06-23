// Manual check that cross-platform app detection works.
// Run from the electron/ folder:
//   node src/main/appDetection/detectCommonApps.test.ts
//
// It does not need Electron — the detector only uses node fs/path/os.
// Exit code 0 = all checks passed, 1 = something failed.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { COMMON_APPS } from '../../shared/appDetection/commonApps.ts'
import { detectCommonApps } from './detectCommonApps.ts'

let failures = 0
function check(label: string, ok: boolean) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) {
    failures += 1
  }
}

// Mirror the detector's `~` expansion so we can scan disk the same way it does
// (macOS catalogue paths only use a leading `~` or an absolute path).
function expandMac(rawPath: string) {
  if (rawPath === '~' || rawPath.startsWith('~/')) {
    return path.join(os.homedir(), rawPath.slice(1))
  }
  return rawPath
}

// 1. Data completeness: every catalogue app now defines macOS paths.
for (const app of COMMON_APPS) {
  check(`${app.id}: commonMacPaths is an array`, Array.isArray(app.commonMacPaths))
}

// 2. Detection runs and returns a list on this platform.
const detected = detectCommonApps()
check('detectCommonApps() returns an array', Array.isArray(detected))

// 3. No false positives: every reported path must actually exist on disk.
for (const app of detected) {
  check(
    `${app.id}: reported path exists -> ${app.executablePath}`,
    fs.existsSync(app.executablePath),
  )
}

// 4. On macOS, the detector's result must match a manual scan of the mac paths.
//    If a mac app is installed (e.g. Discord), this proves the darwin branch
//    ran and resolved paths correctly. If none are installed, both are empty.
if (process.platform === 'darwin') {
  const expectedIds = COMMON_APPS
    .filter((app) => app.commonMacPaths.some((p) => fs.existsSync(expandMac(p))))
    .map((app) => app.id)
    .sort()

  const detectedIds = detected.map((app) => app.id).sort()

  check(
    `detected ids match manual mac scan -> [${detectedIds.join(', ') || 'none'}]`,
    JSON.stringify(expectedIds) === JSON.stringify(detectedIds),
  )
}

console.log(`\n${detected.length} app(s) detected on ${process.platform}:`)
for (const app of detected) {
  console.log(`  - ${app.displayName} (${app.category}) @ ${app.executablePath}`)
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
