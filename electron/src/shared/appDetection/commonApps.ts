/**
 * Common desktop app catalogue used by Taskmaster onboarding.
 *
 * These definitions describe known desktop apps (Windows + macOS) that
 * Taskmaster can try to detect on the user's computer.
 *
 * Browser websites/pages do not belong here. Browser activity rules live in:
 * shared/browserActivity/commonBrowserActivityRules.ts
 */

export type CommonAppCategory = 'productivity' | 'distraction' | 'browser'

export type CommonAppDefinition = {
  id: string
  displayName: string
  category: CommonAppCategory
  executableNames: string[]
  commonWindowsPaths: string[]
  // macOS install locations (.app bundles). `%VAR%` is not used here; a leading
  // `~` expands to the user's home. Empty when the app has no macOS build.
  commonMacPaths: string[]
  defaultStatus: 'allowed' | 'blocked'
}

export const COMMON_APPS: CommonAppDefinition[] = [
  {
    id: 'vscode',
    displayName: 'Visual Studio Code',
    category: 'productivity',
    executableNames: ['Code.exe'],
    commonWindowsPaths: [
      '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe',
      '%PROGRAMFILES%\\Microsoft VS Code\\Code.exe',
      '%PROGRAMFILES(X86)%\\Microsoft VS Code\\Code.exe',
    ],
    commonMacPaths: [
      '/Applications/Visual Studio Code.app',
      '~/Applications/Visual Studio Code.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'windows-terminal',
    displayName: 'Windows Terminal',
    category: 'productivity',
    executableNames: ['WindowsTerminal.exe', 'wt.exe'],
    commonWindowsPaths: [
      '%LOCALAPPDATA%\\Microsoft\\WindowsApps\\wt.exe',
    ],
    // No macOS build of Windows Terminal; Terminal.app is a separate product.
    commonMacPaths: [],
    defaultStatus: 'allowed',
  },
  {
    id: 'notion',
    displayName: 'Notion',
    category: 'productivity',
    executableNames: ['Notion.exe'],
    commonWindowsPaths: [
      '%LOCALAPPDATA%\\Programs\\Notion\\Notion.exe',
    ],
    commonMacPaths: [
      '/Applications/Notion.app',
      '~/Applications/Notion.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'electron',
    displayName: 'Electron',
    category: 'productivity',
    executableNames: ['electron.exe', 'Taskmaster.exe'],
    commonWindowsPaths: [
      '%LOCALAPPDATA%\\Programs\\Taskmaster\\Taskmaster.exe',
    ],
    commonMacPaths: [
      '/Applications/Taskmaster.app',
      '~/Applications/Taskmaster.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'chrome',
    displayName: 'Google Chrome',
    category: 'browser',
    executableNames: ['chrome.exe'],
    commonWindowsPaths: [
      '%PROGRAMFILES%\\Google\\Chrome\\Application\\chrome.exe',
      '%PROGRAMFILES(X86)%\\Google\\Chrome\\Application\\chrome.exe',
      '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
    ],
    commonMacPaths: [
      '/Applications/Google Chrome.app',
      '~/Applications/Google Chrome.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'edge',
    displayName: 'Microsoft Edge',
    category: 'browser',
    executableNames: ['msedge.exe'],
    commonWindowsPaths: [
      '%PROGRAMFILES(X86)%\\Microsoft\\Edge\\Application\\msedge.exe',
      '%PROGRAMFILES%\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    commonMacPaths: [
      '/Applications/Microsoft Edge.app',
      '~/Applications/Microsoft Edge.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'safari',
    displayName: 'Safari',
    category: 'browser',
    // Safari for Windows was discontinued long ago, so there is no Windows build.
    executableNames: [],
    commonWindowsPaths: [],
    commonMacPaths: [
      '/Applications/Safari.app',
      '/System/Applications/Safari.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'opera-gx',
    displayName: 'Opera GX',
    category: 'browser',
    executableNames: ['opera.exe', 'launcher.exe'],
    commonWindowsPaths: [
      '%LOCALAPPDATA%\\Programs\\Opera GX\\launcher.exe',
      '%LOCALAPPDATA%\\Programs\\Opera GX\\opera.exe',
    ],
    commonMacPaths: [
      '/Applications/Opera GX.app',
      '~/Applications/Opera GX.app',
    ],
    defaultStatus: 'allowed',
  },
  {
    id: 'discord',
    displayName: 'Discord',
    category: 'distraction',
    executableNames: ['Discord.exe'],
    commonWindowsPaths: [
      '%LOCALAPPDATA%\\Discord\\Update.exe',
      '%LOCALAPPDATA%\\Discord\\app-*\\Discord.exe',
    ],
    commonMacPaths: [
      '/Applications/Discord.app',
      '~/Applications/Discord.app',
    ],
    defaultStatus: 'blocked',
  },
  {
    id: 'spotify',
    displayName: 'Spotify',
    category: 'distraction',
    executableNames: ['Spotify.exe'],
    commonWindowsPaths: [
      '%APPDATA%\\Spotify\\Spotify.exe',
      '%LOCALAPPDATA%\\Microsoft\\WindowsApps\\Spotify.exe',
    ],
    commonMacPaths: [
      '/Applications/Spotify.app',
      '~/Applications/Spotify.app',
    ],
    defaultStatus: 'blocked',
  },
  {
    id: 'steam',
    displayName: 'Steam',
    category: 'distraction',
    executableNames: ['steam.exe'],
    commonWindowsPaths: [
      '%PROGRAMFILES(X86)%\\Steam\\steam.exe',
      '%PROGRAMFILES%\\Steam\\steam.exe',
    ],
    commonMacPaths: [
      '/Applications/Steam.app',
      '~/Applications/Steam.app',
    ],
    defaultStatus: 'blocked',
  },
]


/**
 * Converts the common app catalogue into the desktop app rules shown during
 * onboarding before real detection results are available.
 */
export type DefaultFocusApp = {
  id: string
  name: string
  category: 'productivity' | 'distraction'
  status: 'allowed' | 'blocked'
}

export type DefaultBrowserOption = {
  id: string
  name: string
}

export function getDefaultFocusApps(): DefaultFocusApp[] {
  return COMMON_APPS
    .filter((app) => app.category !== 'browser')
    .map((app) => ({
      id: app.id,
      name: app.displayName,
      category: app.category as 'productivity' | 'distraction',
      status: app.defaultStatus,
    }))
}


/**
 * Converts detected/common browser apps into options for the main browser
 * dropdown in onboarding.
 */
export function getDefaultBrowserOptions(): DefaultBrowserOption[] {
  return COMMON_APPS
    .filter((app) => app.category === 'browser')
    .map((app) => ({
      id: app.id,
      name: app.displayName,
    }))
}
