/**
 * Shared focus environment settings hook.
 *
 * This hook owns the onboarding settings for:
 * - selected main browser
 * - whether the selected browser is blocked during focus sessions
 * - detected desktop app rules
 * - common browser activity rules
 *
 * UI components should stay mostly presentational and call this hook instead
 * of owning local copies of the settings logic.
 */


import { useEffect, useState } from 'react'
import { getDefaultBrowserOptions, getDefaultFocusApps, } from '../../shared/appDetection/commonApps.ts'
import {
  getDefaultBrowserActivityRules,
  type BrowserActivityRule,
  type BrowserActivityRuleStatus,
} from '../../shared/browserActivity/commonBrowserActivityRules.ts'

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

export type FocusEnvironmentSettings = {
  selectedBrowserId: string
  blockSelectedBrowser: boolean
  appRules: FocusApp[]
  browserActivityRules: BrowserActivityRule[]
}

export type {
  BrowserActivityRule,
  BrowserActivityRuleStatus,
} from '../../shared/browserActivity/commonBrowserActivityRules.ts'

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
const defaultBrowserActivityRules: BrowserActivityRule[] = getDefaultBrowserActivityRules()

/**
 * Creates the fallback settings used before the real app detector returns data.
 *
 * Desktop apps can later be replaced by detected installed apps.
 * Browser activity rules are static defaults because websites are not installed
 * programs.
 */
function createDefaultSettings(): FocusEnvironmentSettings {
  return {
    selectedBrowserId: defaultBrowserOptions[0]?.id ?? '',
    blockSelectedBrowser: false,
    appRules: defaultFocusApps,
    browserActivityRules: defaultBrowserActivityRules,
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


/**
 * Narrows detected apps to desktop app rules.
 *
 * Browser apps are handled separately as browser options, so this prevents
 * TypeScript from treating the category as "browser" after filtering.
 */
function isDetectedFocusApp(
  app: DetectedCommonApp
): app is DetectedCommonApp & { category: AppCategory } {
  return app.category === 'productivity' || app.category === 'distraction'
}
// ====== \\


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



  /**
   * On first load, ask Electron main process to detect installed desktop apps.
   *
   * This only runs when there are no saved settings, so the user's previous
   * allowed/blocked choices are not overwritten.
   */
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
  // ===== \\

  /**
   * Derived desktop app groups for the desktop app whitelist UI.
   */
  const productivityApps = settings.appRules.filter(
    (app) => app.category === 'productivity'
  )

  const distractionApps = settings.appRules.filter(
    (app) => app.category === 'distraction'
  )
  // ===== \\

  /**
   * Browser activity groups shown by BrowserActivitySelectionStep.
   *
   * These are website/page rules, not installed desktop apps.
   * AI tools are separated because they can be productive or distracting
   * depending on the user's work.
   */
  const blockedBrowserActivityRules = settings.browserActivityRules.filter(
    (rule) => rule.id !== 'ai-tools'
  )

  const flexibleBrowserActivityRules = settings.browserActivityRules.filter(
    (rule) => rule.id === 'ai-tools'
  )

  const shouldSplitAppRules = settings.appRules.length > 6
  // ===== \\

  /**
   * Setting update helpers used by onboarding UI components.
   */
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

  function updateBrowserActivityRuleStatus(
    ruleId: string,
    status: BrowserActivityRuleStatus
  ) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      browserActivityRules: currentSettings.browserActivityRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              status,
            }
          : rule
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
    blockedBrowserActivityRules,
    flexibleBrowserActivityRules,
    updateBrowserActivityRuleStatus,
  }
}