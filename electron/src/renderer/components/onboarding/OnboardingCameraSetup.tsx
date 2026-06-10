// === camera setup ===
import { useEffect, useRef } from "react";
import { useCameraDevices } from "../../hooks/useCameraDevices";

type CameraSetupStepProps = {
  onBack: () => void
  onContinue: () => void
}

// === UI for camera onboarding page ===

export default function CameraSetupStep({
  onBack,
  onContinue,
}: CameraSetupStepProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    cameras,
    selectedCameraId,
    selectCamera,
    stream,
    cameraStatus,
  } = useCameraDevices();

  const cameraStatusMessage = {
    checking: "Status: checking camera",
    connected: "Status: camera connected",
    "no-camera": "Status: no camera detected",
    "permission-denied": "Status: camera permission denied",
    error: "Status: camera error",
  }[cameraStatus];

const isCameraConnected = cameraStatus === "connected";

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <section className="onboarding-screen camera-setup-screen">
      <p className="status-pill onboarding-step-pill">Step 2</p>
      <div className="camera-setup-layout">

        <div className="camera-setup-panel surface-card">
          <div className="camera-preview-card">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
            <div className="camera-preview-placeholder" aria-hidden="true">
              <div className="camera-placeholder-lens" />
              <div className="camera-placeholder-base" />
            </div>
            <p className="camera-preview-label muted-text">Preview placeholder</p>
          </div>

          <label className="camera-select-field">
            
            <span>Camera</span>
            <select
              value={selectedCameraId}
              onChange={(e) => selectCamera(e.target.value)} 
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>

          </label>

          <div className="camera-status-line">
            <span
              className={`camera-status-dot ${
                isCameraConnected ? "camera-status-dot--connected" : "camera-status-dot--error"
              }`}
              aria-hidden="true"
            />
            <span>{cameraStatusMessage}</span>
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
