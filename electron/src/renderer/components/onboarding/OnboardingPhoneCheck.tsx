/**
 * Phone check onboarding screen.
 *
 * Lets the user confirm that the phone module works by holding their phone up
 * to the camera. Streams the camera to the Python worker (via useCvDetection)
 * and lights up a green indicator when a phone is detected. Informational only
 * — Continue is never blocked.
 */
import { useEffect, useRef } from "react";
import { useCvDetection } from "../../hooks/useCvDetection";

type PhoneCheckStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

export default function PhoneCheckStep({
  onBack,
  onContinue,
}: PhoneCheckStepProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Run detection while this screen is mounted.
  const { stream, connected, phone } = useCvDetection(true);

  // The phone module reports status "detected" when it sees a phone.
  const phoneDetected = phone !== null && phone.status === "detected";

  const statusMessage = !connected
    ? "Status: connecting to detector…"
    : phoneDetected
      ? "Status: phone detected"
      : "Status: hold up your phone to test…";

  // React can't set srcObject through JSX, so attach the stream via the ref.
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <section className="onboarding-screen camera-setup-screen">
      <p className="status-pill onboarding-step-pill">Step 4</p>
      <div className="camera-setup-layout">

        <div className="camera-setup-panel surface-card">
          <div className="camera-preview-card">
            <video ref={videoRef} autoPlay playsInline muted />
            <p className="camera-preview-label muted-text">Live preview</p>
          </div>

          <div className="camera-status-line">
            <span
              className={`camera-status-dot ${
                phoneDetected
                  ? "camera-status-dot--connected"
                  : "camera-status-dot--error"
              }`}
              aria-hidden="true"
            />
            <span>{statusMessage}</span>
          </div>

          <p className="camera-privacy-note muted-text">
            Camera processing is local and used only for focus detection.
          </p>
        </div>

        <header className="camera-setup-header">
          <div className="onboarding-header">
            <h1 className="onboarding-title">Phone check</h1>
            <p className="onboarding-subtitle">
              Make sure Taskmaster can spot your phone.
            </p>
          </div>
          <p className="camera-setup-explainer muted-text">
            Hold your phone up to the camera — the indicator turns green when
            it's detected. You can continue even if it doesn't.
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
  );
}
