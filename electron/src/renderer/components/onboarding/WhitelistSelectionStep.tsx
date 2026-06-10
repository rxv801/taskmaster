<<<<<<< HEAD
import { useFocusEnvironmentSettings } from '../../hooks/useFocusEnvironmentSettings'
import type {
  AppRuleStatus,
  FocusApp,
} from '../../hooks/useFocusEnvironmentSettings'

=======
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee
type FocusEnvironmentStepProps = {
  onBack: () => void
  onContinue: () => void
}

<<<<<<< HEAD
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
=======
const browserItems = [
  { label: 'Chrome: GitHub', allowed: true },
  { label: 'Chrome: YouTube', allowed: false },
  { label: 'Chrome: OnTrack', allowed: true },
]

const appItems = [
  { label: 'VS Code', allowed: true },
  { label: 'Discord', allowed: false },
]
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee

export default function FocusEnvironmentStep({
  onBack,
  onContinue,
}: FocusEnvironmentStepProps) {
<<<<<<< HEAD
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

=======
  return (
    <section className="onboarding-screen focus-environment-screen">
      <p className="status-pill onboarding-step-pill">Step 3</p>
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee
      <div className="focus-environment-layout">
        <header className="focus-environment-header">
          <div className="onboarding-header">
            <h1 className="onboarding-title focus-environment-title">
              Focus environment
            </h1>
            <p className="onboarding-subtitle">
<<<<<<< HEAD
              Choose which apps are allowed during your deep work sessions.
            </p>
          </div>

          <p className="focus-environment-explainer muted-text">
            Taskmaster checks the active app during focus sessions. Apps not
            recognised yet will be marked as unknown and can be reviewed after
            the session.
=======
              Choose which apps or tabs are allowed during your deep work
              sessions.
            </p>
          </div>
          <p className="focus-environment-explainer muted-text">
            Taskmaster will use this list to understand when you are working and
            when you might be drifting.
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee
          </p>
        </header>

        <section className="allowed-environment-panel surface-card">
          <div className="allowed-panel-top">
            <label className="focus-select-field">
<<<<<<< HEAD
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
=======
              <span>Browser</span>
              <select defaultValue="chrome">
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="opera">Opera</option>
              </select>
            </label>

            <button className="secondary-button" type="button" disabled>
              Recommended setup
            </button>
          </div>

          <div className="allowed-groups" aria-label="Allowed apps and tabs">
            <div className="allowed-group">
              <p>Browser tabs</p>
              <div className="allowed-compact-list">
                {browserItems.map((item) => (
                  <label className="allowed-compact-row" key={item.label}>
                    <span>{item.label}</span>
                    <input type="checkbox" defaultChecked={item.allowed} />
                  </label>
                ))}
              </div>
            </div>

            <div className="allowed-group">
              <p>Apps</p>
              <div className="allowed-compact-list">
                {appItems.map((item) => (
                  <label className="allowed-compact-row" key={item.label}>
                    <span>{item.label}</span>
                    <input type="checkbox" defaultChecked={item.allowed} />
                  </label>
                ))}
              </div>
            </div>
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee
          </div>
        </section>

        <div className="onboarding-actions onboarding-fixed-actions">
<<<<<<< HEAD
          <button className="secondary-button" type="button" onClick={handleBack}>
            Back
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={handleContinue}
          >
=======
          <button className="secondary-button" type="button" onClick={onBack}>
            Back
          </button>
          <button className="primary-button" type="button" onClick={onContinue}>
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee
            Continue
          </button>
        </div>
      </div>
    </section>
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> ae417e1a78fe12271a3d75d458c23a6093090bee
