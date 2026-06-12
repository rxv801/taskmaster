/**
 * Final onboarding options screen.
 *
 * This screen is currently a placeholder for future focus-session guardrails.
 * The options shown here are not fully wired into session behavior yet.
 */
type DistractionOptionsStepProps = {
  onBack: () => void
  onFinish: () => void
}

export default function DistractionOptionsStep({
  onBack,
  onFinish,
}: DistractionOptionsStepProps) {
  return (
    <section className="onboarding-screen distraction-options-screen">
      <p className="status-pill onboarding-step-pill">Step 4</p>
      <div className="distraction-options-layout">
        <header className="distraction-options-header">
          <div className="onboarding-header">
            <h1 className="onboarding-title focus-environment-title">
              Distraction options
            </h1>
            <p className="onboarding-subtitle">
              Choose how Taskmaster should respond when your focus session
              starts to drift.
            </p>
          </div>
          <p className="focus-environment-explainer muted-text">
            These options are placeholders for future app and browser behavior.
          </p>
        </header>

        <section className="focus-settings-card distraction-card surface-card">
          <div className="focus-card-header">
            <h2>Session guardrails</h2>
            <p className="muted-text">Future rules for focus session behavior.</p>
          </div>

          <div className="distraction-options">
            <label className="distraction-option">
              <input type="checkbox" defaultChecked />
              <span>Warn me when I open non-allowed apps</span>
            </label>

            <label className="distraction-option">
              <input type="checkbox" disabled />
              <span>Block YouTube recommendations</span>
              <span className="coming-soon-pill">Coming soon</span>
            </label>
          </div>
        </section>

        <div className="onboarding-actions onboarding-fixed-actions">
          <button className="secondary-button" type="button" onClick={onBack}>
            Back
          </button>
          <button className="primary-button" type="button" onClick={onFinish}>
            Finish setup
          </button>
        </div>
      </div>
    </section>
  )
}
