type FocusEnvironmentStepProps = {
  onBack: () => void
  onContinue: () => void
}

const browserItems = [
  { label: 'Chrome: GitHub', allowed: true },
  { label: 'Chrome: YouTube', allowed: false },
  { label: 'Chrome: OnTrack', allowed: true },
]

const appItems = [
  { label: 'VS Code', allowed: true },
  { label: 'Discord', allowed: false },
]

export default function FocusEnvironmentStep({
  onBack,
  onContinue,
}: FocusEnvironmentStepProps) {
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
              Choose which apps or tabs are allowed during your deep work
              sessions.
            </p>
          </div>
          <p className="focus-environment-explainer muted-text">
            Taskmaster will use this list to understand when you are working and
            when you might be drifting.
          </p>
        </header>

        <section className="allowed-environment-panel surface-card">
          <div className="allowed-panel-top">
            <label className="focus-select-field">
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
          </div>
        </section>

        <div className="onboarding-actions onboarding-fixed-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Back
          </button>
          <button className="primary-button" type="button" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </section>
  )
}
