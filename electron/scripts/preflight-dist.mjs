// Preflight check run before electron-builder packages the app.
//
// electron-builder's extraResources copies the frozen Python CV worker and the
// ML models into the .app. If those aren't present, packaging still "succeeds"
// but ships an app with broken/absent detection. This fails the build loudly
// instead, pointing at the step that was skipped.

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..', '..')

const required = [
  {
    label: 'frozen CV worker',
    file: path.join(repoRoot, 'python', 'dist', 'taskmaster_worker', 'taskmaster_worker'),
    hint: 'run python/build_worker.sh (or ./build-macos-app.sh from the repo root)',
  },
  {
    label: 'phone-detection model',
    file: path.join(repoRoot, 'python', 'models', 'yolox_s.onnx'),
    hint: 'run ./setup.sh to download the models',
  },
  {
    label: 'gaze model',
    file: path.join(repoRoot, 'python', 'models', 'face_landmarker.task'),
    hint: 'run ./setup.sh to download the models',
  },
]

const missing = required.filter((item) => !existsSync(item.file))

if (missing.length > 0) {
  console.error('\nCannot package: required CV resources are missing.\n')
  for (const item of missing) {
    console.error(`  - ${item.label}: ${item.file}`)
    console.error(`      ${item.hint}`)
  }
  console.error('')
  process.exit(1)
}

console.log('preflight: CV worker and models present.')
