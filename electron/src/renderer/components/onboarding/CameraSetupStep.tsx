type CameraSetupStepProps = {
  onBack: () => void
  onContinue: () => void
}

export default function CameraSetupStep({
  onBack,
  onContinue,
}: CameraSetupStepProps) {
  return (
    <section className="onboarding-screen camera-setup-screen">
      <p className="status-pill onboarding-step-pill">Step 2</p>
      <div className="camera-setup-layout">

        <div className="camera-setup-panel surface-card">
          <div className="camera-preview-card">
            <div className="camera-preview-placeholder" aria-hidden="true">
              <div className="camera-placeholder-lens" />
              <div className="camera-placeholder-base" />
            </div>
            <p className="camera-preview-label muted-text">Preview placeholder</p>
          </div>

          <label className="camera-select-field">
            <span>Camera</span>
            <select defaultValue="built-in">
              <option value="built-in">Built-in Camera</option>
              <option value="external-usb">External USB Camera</option>
            </select>
          </label>

          <div className="camera-status-line">
            <span className="camera-status-dot" aria-hidden="true" />
            <span>Status: camera connected</span>
          </div>

          <p className="camera-privacy-note muted-text">
            Camera processing is local and used only for focus detection.
          </p>
        </div>

        
        <header className="camera-setup-header">
          <div className="onboarding-header">
            <h1 className="onboarding-title">Camera setup</h1>
            <p className="onboarding-subtitle">
              Choose the camera Taskmaster will use during focus sessions.
            </p>
          </div>
          <p className="camera-setup-explainer muted-text">
            Taskmaster uses your camera to estimate whether you are present
            during a focus session.
          </p>
        </header>


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
