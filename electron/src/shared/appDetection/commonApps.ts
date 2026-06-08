//
export type CommonAppCategory = 'productivity' | 'distraction' | 'browser'

export type CommonAppDefinition = {
  id: string
  displayName: string
  category: CommonAppCategory
  executableNames: string[]
  commonWindowsPaths: string[]
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
    defaultStatus: 'blocked',
  },
]

// Utility functions to get default app lists for onboarding
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

export function getDefaultBrowserOptions(): DefaultBrowserOption[] {
  return COMMON_APPS
    .filter((app) => app.category === 'browser')
    .map((app) => ({
      id: app.id,
      name: app.displayName,
    }))
}