/**
 * Face check onboarding screen.
 *
 * Lets the user confirm that the gaze module can actually see their face. It
 * streams the camera to the Python worker (via useCvDetection) and lights up a
 * green indicator when a face is detected. The check is informational only —
 * Continue is never blocked, so the user can move on either way.
 */
import { useEffect, useRef } from "react";
import { useCvDetection } from "../../hooks/useCvDetection";

type FaceCheckStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

export default function FaceCheckStep({
  onBack,
  onContinue,
}: FaceCheckStepProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Run detection while this screen is mounted.
  const { stream, connected, gaze } = useCvDetection(true);

  // The check passes only when the user is actually LOOKING AT THE SCREEN, not
  // just when a face is present. The gaze module reports status "focused" when
  // the head is turned toward the screen, "distracted" when turned away or no
  // face is in view.
  const lookingAtScreen = gaze !== null && gaze.status === "focused";

  const statusMessage = !connected
    ? "Status: connecting to detector…"
    : lookingAtScreen
      ? "Status: looking at the screen"
      : "Status: please look at the screen";

  // React can't set srcObject through JSX, so attach the stream via the ref.
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <section className="onboarding-screen camera-setup-screen">
      <p className="status-pill onboarding-step-pill">Step 3</p>
      <div className="camera-setup-layout">

        <div className="camera-setup-panel surface-card">
          <div className="camera-preview-card">
            <video ref={videoRef} autoPlay playsInline muted />
            <p className="camera-preview-label muted-text">Live preview</p>
          </div>

          <div className="camera-status-line">
            <span
              className={`camera-status-dot ${
                lookingAtScreen
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
            <h1 className="onboarding-title">Face check</h1>
            <p className="onboarding-subtitle">
              Make sure Taskmaster can tell when you're looking at the screen.
            </p>
          </div>
          <p className="camera-setup-explainer muted-text">
            Look at your screen — the indicator turns green when you're looking
            at it. You can continue even if it doesn't.
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
