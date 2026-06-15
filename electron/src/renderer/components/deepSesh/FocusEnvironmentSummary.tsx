import { useFocusEnvironmentSettings } from '../../hooks/useFocusEnvironmentSettings'

/**
 * Displays the focus rules saved during onboarding.
 *
 * This is intentionally read-only for now. Editing stays in onboarding until
 * the setup cog gets its own flow.
 */
export default function FocusEnvironmentSummary() {
  const { settings, browserOptions } = useFocusEnvironmentSettings()
  const selectedBrowserName = getSelectedBrowserName({
    selectedBrowserId: settings.selectedBrowserId,
    browserOptions,
  })

  const allowedAppCount = countRulesByStatus(settings.appRules, 'allowed')
  const blockedAppCount = countRulesByStatus(settings.appRules, 'blocked')
  const blockedBrowserRuleCount = countRulesByStatus(
    settings.browserActivityRules,
    'blocked',
  )

  return (
    <div className="deep-sesh-summary-grid">
      <div>
        <span className="deep-sesh-summary-label">Main browser</span>
        <strong>{selectedBrowserName}</strong>
      </div>

      <div>
        <span className="deep-sesh-summary-label">Browser block</span>
        <strong>{settings.blockSelectedBrowser ? 'On' : 'Off'}</strong>
      </div>

      <div>
        <span className="deep-sesh-summary-label">Allowed apps</span>
        <strong>{formatCount(allowedAppCount, 'app')}</strong>
      </div>

      <div>
        <span className="deep-sesh-summary-label">Blocked apps</span>
        <strong>{formatCount(blockedAppCount, 'app')}</strong>
      </div>

      <div>
        <span className="deep-sesh-summary-label">Blocked sites</span>
        <strong>{formatCount(blockedBrowserRuleCount, 'rule')}</strong>
      </div>
    </div>
  )
}

/**
 * Finds the readable browser name for the saved browser id.
 *
 * If saved settings reference a detected browser that is not in the current
 * fallback options, show the id instead of hiding the user's choice.
 */
function getSelectedBrowserName({
  selectedBrowserId,
  browserOptions,
}: {
  selectedBrowserId: string
  browserOptions: { id: string; name: string }[]
}) {
  if (!selectedBrowserId) return 'Not selected'

  return (
    browserOptions.find((browser) => browser.id === selectedBrowserId)?.name ??
    selectedBrowserId
  )
}

/* Counts app and browser rules that share the same status field shape. */
function countRulesByStatus<T extends { status: string }>(
  rules: T[],
  status: T['status'],
) {
  return rules.filter((rule) => rule.status === status).length
}

/* Keeps summary values compact enough for the small Deep Sesh strip. */
function formatCount(count: number, label: string) {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}
