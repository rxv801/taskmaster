import { useFocusEnvironmentSettings } from '../../hooks/useFocusEnvironmentSettings'
import type {
  AppRuleStatus,
  FocusApp,
} from '../../hooks/useFocusEnvironmentSettings'

type FocusEnvironmentStepProps = {
  onBack: () => void
  onContinue: () => void
}

type FocusAppRuleSectionProps = {
  title: string
  description: string
  apps: FocusApp[]
  onUpdateAppStatus: (appId: string, status: AppRuleStatus) => void
}

function FocusAppRuleSection({
  title,
  description,
  apps,
  onUpdateAppStatus,
}: FocusAppRuleSectionProps) {
  return (
    <div className="focus-app-rule-section">
      <div className="focus-app-rule-section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="focus-app-rule-list">
        {apps.map((app) => (
          <div className="focus-app-rule-row" key={app.id}>
            <span className="focus-app-rule-name">{app.name}</span>

            <label
              className={`focus-app-toggle ${
                app.status === 'blocked' ? 'focus-app-toggle--blocked' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={app.status === 'blocked'}
                onChange={(event) =>
                  onUpdateAppStatus(
                    app.id,
                    event.target.checked ? 'blocked' : 'allowed'
                  )
                }
                aria-label={`${app.status === 'blocked' ? 'Allow' : 'Block'} ${
                  app.name
                }`}
              />
              <span aria-hidden="true" />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FocusEnvironmentStep({
  onBack,
  onContinue,
}: FocusEnvironmentStepProps) {
  const {
    settings,
    browserOptions,
    productivityApps,
    distractionApps,
    shouldSplitAppRules,
    setSelectedBrowserId,
    setBlockSelectedBrowser,
    updateAppStatus,
    saveFocusEnvironmentSettings,
  } = useFocusEnvironmentSettings()

  function handleBack() {
    saveFocusEnvironmentSettings()
    onBack()
  }

  function handleContinue() {
    saveFocusEnvironmentSettings()
    onContinue()
  }

  return (
    <section className="onboarding-screen focus-environment-screen">
      <p className="status-pill onboarding-step-pill">Step 3</p>

      <div className="focus-environment-layout">
        <header className="focus-environment-header">
          <div className="onboarding-header">
            <h1 className="onboarding-title focus-environment-title">
              Focus environment
            </h1>
            <p className="onboarding-subtitle">
              Choose which apps are allowed during your deep work sessions.
            </p>
          </div>

          <p className="focus-environment-explainer muted-text">
            Taskmaster checks the active app during focus sessions. Apps not
            recognised yet will be marked as unknown and can be reviewed after
            the session.
          </p>
        </header>

        <section className="allowed-environment-panel surface-card">
          <div className="allowed-panel-top">
            <label className="focus-select-field">
              <span>Main browser</span>
              <select
                value={settings.selectedBrowserId}
                onChange={(event) => setSelectedBrowserId(event.target.value)}
              >
                {browserOptions.map((browser) => (
                  <option key={browser.id} value={browser.id}>
                    {browser.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="browser-block-toggle">
              <input
                type="checkbox"
                checked={settings.blockSelectedBrowser}
                onChange={(event) =>
                  setBlockSelectedBrowser(event.target.checked)
                }
              />
              <span>Block selected browser during focus sessions</span>
            </label>
          </div>

          <div className="focus-learning-note">
            <p>
              Taskmaster will also learn from apps you open during sessions.
              Unknown apps can be reviewed after each session.
            </p>
          </div>

          <div
            className={`focus-app-rules ${
              shouldSplitAppRules ? 'focus-app-rules--split' : ''
            }`}
            aria-label="Focus app rules"
          >
            <FocusAppRuleSection
              title="Productivity"
              description="Apps you usually use for focused work."
              apps={productivityApps}
              onUpdateAppStatus={updateAppStatus}
            />

            <FocusAppRuleSection
              title="Potential distractions"
              description="Apps Taskmaster should usually warn you about."
              apps={distractionApps}
              onUpdateAppStatus={updateAppStatus}
            />
          </div>
        </section>

        <div className="onboarding-actions onboarding-fixed-actions">
          <button className="secondary-button" type="button" onClick={handleBack}>
            Back
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={handleContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </section>
  )
}
