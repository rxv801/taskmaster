import { useEffect, useState } from 'react'
import {
  getDefaultBrowserOptions,
  getDefaultFocusApps,
} from '../../shared/appDetection/commonApps.ts'

export type AppCategory = 'productivity' | 'distraction'
export type AppRuleStatus = 'allowed' | 'blocked'

export type FocusApp = {
  id: string
  name: string
  category: AppCategory
  status: AppRuleStatus
}

export type BrowserOption = {
  id: string
  name: string
}

export type BrowserActivityRuleStatus = 'allowed' | 'blocked' | 'ignored'

export type BrowserActivityRule = {
  id: string
  label: string
  matchText: string
  status: BrowserActivityRuleStatus
}

export type FocusEnvironmentSettings = {
  selectedBrowserId: string
  blockSelectedBrowser: boolean
  appRules: FocusApp[]
  browserActivityRules: BrowserActivityRule[]
}

type DetectedCommonApp = {
  id: string
  displayName: string
  category: 'productivity' | 'distraction' | 'browser'
  executablePath: string
  defaultStatus: 'allowed' | 'blocked'
}

const FOCUS_ENVIRONMENT_SETTINGS_KEY = 'taskmaster:focusEnvironmentSettings'

const defaultBrowserOptions: BrowserOption[] = getDefaultBrowserOptions()
const defaultFocusApps: FocusApp[] = getDefaultFocusApps()

function createDefaultSettings(): FocusEnvironmentSettings {
  return {
    selectedBrowserId: defaultBrowserOptions[0]?.id ?? '',
    blockSelectedBrowser: false,
    appRules: defaultFocusApps,
    browserActivityRules: [],
  }
}

function loadFocusEnvironmentSettings(): FocusEnvironmentSettings | null {
  const savedSettings = localStorage.getItem(FOCUS_ENVIRONMENT_SETTINGS_KEY)

  if (!savedSettings) {
    return null
  }

  try {
    return JSON.parse(savedSettings) as FocusEnvironmentSettings
  } catch {
    localStorage.removeItem(FOCUS_ENVIRONMENT_SETTINGS_KEY)
    return null
  }
}

function isDetectedFocusApp(
  app: DetectedCommonApp
): app is DetectedCommonApp & { category: AppCategory } {
  return app.category === 'productivity' || app.category === 'distraction'
}
// after this filter, category cannot be browser anymore

function convertDetectedAppsToFocusApps(
  detectedApps: DetectedCommonApp[]
): FocusApp[] {
  return detectedApps.filter(isDetectedFocusApp).map((app) => ({
    id: app.id,
    name: app.displayName,
    category: app.category,
    status: app.defaultStatus,
  }))
}

function convertDetectedAppsToBrowserOptions(
  detectedApps: DetectedCommonApp[]
): BrowserOption[] {
  return detectedApps
    .filter((app) => app.category === 'browser')
    .map((app) => ({
      id: app.id,
      name: app.displayName,
    }))
}

export function useFocusEnvironmentSettings() {
  const [hasSavedSettings] = useState(() => {
    return loadFocusEnvironmentSettings() !== null
  })

  const [settings, setSettings] = useState<FocusEnvironmentSettings>(() => {
    return loadFocusEnvironmentSettings() ?? createDefaultSettings()
  })

  const [browserOptions, setBrowserOptions] =
    useState<BrowserOption[]>(defaultBrowserOptions)

  useEffect(() => {
    async function loadDetectedApps() {
      if (hasSavedSettings) {
        return
      }

      if (!window.taskmaster?.detectCommonApps) {
        console.warn('Taskmaster preload API is not available')
        return
      }

      const detectedApps = await window.taskmaster.detectCommonApps()

      const detectedFocusApps = convertDetectedAppsToFocusApps(detectedApps)
      const detectedBrowserOptions =
        convertDetectedAppsToBrowserOptions(detectedApps)

      if (detectedBrowserOptions.length > 0) {
        setBrowserOptions(detectedBrowserOptions)
      }

      setSettings((currentSettings) => ({
        ...currentSettings,
        selectedBrowserId:
          detectedBrowserOptions[0]?.id ?? currentSettings.selectedBrowserId,
        appRules:
          detectedFocusApps.length > 0
            ? detectedFocusApps
            : currentSettings.appRules,
      }))
    }

    loadDetectedApps()
  }, [hasSavedSettings])

  const productivityApps = settings.appRules.filter(
    (app) => app.category === 'productivity'
  )

  const distractionApps = settings.appRules.filter(
    (app) => app.category === 'distraction'
  )

  const shouldSplitAppRules = settings.appRules.length > 6

  function setSelectedBrowserId(selectedBrowserId: string) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      selectedBrowserId,
    }))
  }

  function setBlockSelectedBrowser(blockSelectedBrowser: boolean) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      blockSelectedBrowser,
    }))
  }

  function updateAppStatus(appId: string, status: AppRuleStatus) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      appRules: currentSettings.appRules.map((app) =>
        app.id === appId
          ? {
              ...app,
              status,
            }
          : app
      ),
    }))
  }

  function saveFocusEnvironmentSettings() {
    localStorage.setItem(
      FOCUS_ENVIRONMENT_SETTINGS_KEY,
      JSON.stringify(settings)
    )
  }

  return {
    settings,
    browserOptions,
    productivityApps,
    distractionApps,
    shouldSplitAppRules,
    setSelectedBrowserId,
    setBlockSelectedBrowser,
    updateAppStatus,
    saveFocusEnvironmentSettings,
  }
}