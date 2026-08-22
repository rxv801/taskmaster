/**
 * In-app Taskmaster settings section opened from the Deep Sesh cog.
 *
 * It starts small on purpose: each action sends the user back to the existing
 * onboarding screens that already own camera, app, and browser configuration.
 */

import '../styles/settings.css'

type SettingsPageProps = {
  onBack: () => void
  onOpenCameraSetup: () => void
  onOpenFocusRules: () => void
  onRerunSetup: () => void
}

export default function SettingsPage({
  onBack,
  onOpenCameraSetup,
  onOpenFocusRules,
  onRerunSetup,
}: SettingsPageProps) {
  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <header className="settings-corner-title">
        <p>Taskmaster</p>
        <span>Settings</span>
      </header>

      <button
        className="settings-back-button secondary-button"
        type="button"
        onClick={onBack}
      >
        Back
      </button>

      <main className="settings-main">
        <header className="settings-header">
          <p className="status-pill">Configuration</p>
          <h1 id="settings-title">Settings</h1>
          <p className="muted-text">
            Adjust the setup Taskmaster uses during focus sessions.
          </p>
        </header>

        <section className="settings-section surface-card">
          <div className="settings-section-copy">
            <span className="settings-section-kicker">Camera</span>
            <h2>Camera setup</h2>
            <p className="muted-text">
              Choose the camera and rerun the local face and phone checks.
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onOpenCameraSetup}>
            Configure
          </button>
        </section>

        <section className="settings-section surface-card">
          <div className="settings-section-copy">
            <span className="settings-section-kicker">Focus rules</span>
            <h2>Apps and browser activity</h2>
            <p className="muted-text">
              Manage allowed apps, blocked apps, and common website rules.
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onOpenFocusRules}>
            Manage
          </button>
        </section>

        <section className="settings-section surface-card">
          <div className="settings-section-copy">
            <span className="settings-section-kicker">Setup</span>
            <h2>Guided setup</h2>
            <p className="muted-text">
              Restart the full onboarding flow. Existing choices stay selected.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={onRerunSetup}>
            Rerun setup
          </button>
        </section>
      </main>
    </section>
  )
}
