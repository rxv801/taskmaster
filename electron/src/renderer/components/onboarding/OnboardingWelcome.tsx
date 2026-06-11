/**
 * First onboarding screen.
 *
 * This screen introduces Taskmaster and starts the setup flow. It does not own
 * any onboarding settings, it only sends the user to the next step.
 */
type WelcomeStepProps = {
  onStartSetup: () => void
}

export default function WelcomeStep({ onStartSetup }: WelcomeStepProps) {
  return (
    <section className="onboarding-screen onboarding-welcome-screen">
      <div className="onboarding-welcome-card">
        <div className="onboarding-welcome-content">
          <p className="onboarding-app-name accent-text">Taskmaster</p>
          <div className="onboarding-header">
            <h1 className="onboarding-title">Protect your deep work.</h1>
            <p className="onboarding-subtitle">
              Taskmaster helps you notice distractions before they take over your
              focus session.
            </p>
          </div>
          <p className="onboarding-privacy-line muted-text">
            A private focus assistant that runs locally and helps you stay
            present while working.
          </p>
          <div className="onboarding-actions">
            <button className="primary-button" type="button" onClick={onStartSetup}>
              Start setup
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
