// Detects which common apps are installed, using node fs APIs. Supports Windows
// (checks `.exe` paths) and macOS (checks `.app` bundle paths). Other platforms
// return nothing for now.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { COMMON_APPS } from "../../shared/appDetection/commonApps.ts"

export type DetectedApp = {
  id: string
  displayName: string
  category: 'productivity' | 'distraction' | 'browser'
  executablePath: string
  defaultStatus: 'allowed' | 'blocked'
}

// Expands a catalogue path for the current OS: Windows `%VAR%` environment
// variables, and a leading `~` to the user's home directory (macOS/Linux).
function expandPath(rawPath: string) {
  const withEnvVars = rawPath.replace(/%([^%]+)%/g, (_, variableName: string) => {
    return process.env[variableName] ?? ''
  })

  if (withEnvVars === '~' || withEnvVars.startsWith('~/')) {
    return path.join(os.homedir(), withEnvVars.slice(1))
  }

  return withEnvVars
}

function pathHasWildcard(filePath: string) {
  return filePath.includes('*')
}

function findWildcardPath(filePath: string) {
  const normalizedPath = path.normalize(filePath)
  const wildcardIndex = normalizedPath.indexOf('*')

  if (wildcardIndex === -1) {
    return fs.existsSync(normalizedPath) ? normalizedPath : null
  }

  const beforeWildcard = normalizedPath.slice(0, wildcardIndex)
  const afterWildcard = normalizedPath.slice(wildcardIndex + 1)

  const baseDirectory = path.dirname(beforeWildcard)
  const prefix = path.basename(beforeWildcard)

  try {
    if (!fs.existsSync(baseDirectory)) {
      return null
    }

    const entries = fs.readdirSync(baseDirectory, {
      withFileTypes: true,
    })

    const matchedDirectory = entries.find((entry) => {
      return entry.isDirectory() && entry.name.startsWith(prefix)
    })

    if (!matchedDirectory) {
      return null
    }

    const possiblePath = path.join(
      baseDirectory,
      matchedDirectory.name,
      afterWildcard
    )

    return fs.existsSync(possiblePath) ? possiblePath : null
  } catch (error) {
    console.warn('[Taskmaster] Could not scan wildcard path:', {
      filePath,
      baseDirectory,
      error,
    })

    return null
  }
}

function findExistingAppPath(candidatePaths: string[]) {
  for (const rawPath of candidatePaths) {
    const expandedPath = expandPath(rawPath)

    if (!expandedPath) {
      continue
    }

    if (pathHasWildcard(expandedPath)) {
      const matchedPath = findWildcardPath(expandedPath)

      if (matchedPath) {
        return matchedPath
      }

      continue
    }

    const normalizedPath = path.normalize(expandedPath)
    try {
      if (fs.existsSync(normalizedPath)) {
        return normalizedPath
      }
    } catch (error) {
      console.warn('[Taskmaster] Could not check path:', {
        normalizedPath,
        error,
      })
    }
  }

  return null
}

export function detectCommonApps(): DetectedApp[] {
  // Only Windows and macOS have catalogue paths to check; anything else (Linux)
  // has no entries yet, so report nothing rather than guessing.
  const isWindows = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  if (!isWindows && !isMac) {
    return []
  }

  return COMMON_APPS.flatMap((app) => {
    const candidatePaths = isMac ? app.commonMacPaths : app.commonWindowsPaths
    const executablePath = findExistingAppPath(candidatePaths)

    if (!executablePath) {
      return []
    }

    return [
      {
        id: app.id,
        displayName: app.displayName,
        category: app.category,
        executablePath,
        defaultStatus: app.defaultStatus,
      },
    ]
  })
}