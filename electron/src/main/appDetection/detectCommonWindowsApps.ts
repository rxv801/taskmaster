// This file needs to be on main as we are using node APIs to detect if common apps are installed on the user's system. We will likely need to expand this in the future to support more apps and other platforms, but for now we are just focusing on a few common Windows apps.
import fs from 'node:fs'
import path from 'node:path'
import { COMMON_APPS } from "../../shared/appDetection/commonApps.ts"

export type DetectedWindowsApp = {
  id: string
  displayName: string
  category: 'productivity' | 'distraction' | 'browser'
  executablePath: string
  defaultStatus: 'allowed' | 'blocked'
}

function expandWindowsEnvironmentPath(rawPath: string) {
  return rawPath.replace(/%([^%]+)%/g, (_, variableName: string) => {
    return process.env[variableName] ?? ''
  })
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

function findExistingAppPath(commonWindowsPaths: string[]) {
  for (const rawPath of commonWindowsPaths) {
    const expandedPath = expandWindowsEnvironmentPath(rawPath)

    console.log('[Taskmaster] Checking path:', {
      rawPath,
      expandedPath,
    })

    if (!expandedPath) {
      continue
    }

    if (pathHasWildcard(expandedPath)) {
      const matchedPath = findWildcardPath(expandedPath)

      // --- debug log ---
      console.log('[Taskmaster] Wildcard path result:', {
        expandedPath,
        matchedPath,
      })
      // --- remove later ---

      if (matchedPath) {
        return matchedPath
      }

      continue
    }

    const normalizedPath = path.normalize(expandedPath)
    try {
      const exists = fs.existsSync(normalizedPath)

      console.log('[Taskmaster] Path exists result:', {
        normalizedPath,
        exists,
      })

      if (exists) {
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

export function detectCommonWindowsApps(): DetectedWindowsApp[] {
  if (process.platform !== 'win32') {
    return []
  }

  return COMMON_APPS.flatMap((app) => {
    const executablePath = findExistingAppPath(app.commonWindowsPaths)

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