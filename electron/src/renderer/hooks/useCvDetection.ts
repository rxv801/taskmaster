/**
 * useCvDetection — streams webcam frames to the Python CV worker and returns
 * the latest phone / gaze results.
 *
 * The browser owns the camera (the one the user picked in onboarding), grabs
 * one frame per second, encodes it to JPEG, and sends it over a WebSocket to
 * the Python worker. The worker replies with detection events, which we expose
 * as React state.
 *
 * Usage:
 *   const { connected, phone, gaze } = useCvDetection(isSessionActive)
 *   // gaze?.status === "focused" | "distracted"
 *   // phone?.status === "none" | "detected"
 */

import { useEffect, useState } from "react";

// Where the Python worker's WebSocket lives (see python/main.py).
const WS_URL = "ws://127.0.0.1:8765/ws";

// Same localStorage key the onboarding camera step writes the chosen camera to.
const SELECTED_CAMERA_KEY = "taskmaster:selectedCameraId";

// Send one frame per second. Detection takes ~1s on CPU, so this is the natural
// rate and keeps CPU/bandwidth low.
const CAPTURE_INTERVAL_MS = 1000;

// Downscale frames to this width before sending — smaller = faster + lighter,
// and the detectors don't need full resolution.
const TARGET_WIDTH = 640;

// JPEG quality (0..1). 0.7 is a good size/clarity trade-off.
const JPEG_QUALITY = 0.7;

// One detection event from the worker (matches python/main.py / PLAN.md).
export type DetectionEvent = {
  type: "phone" | "gaze";
  status: string;
  confidence: number;
  timestamp: number;
};

// What the hook hands back to the UI.
export type CvStatus = {
  connected: boolean;
  phone: DetectionEvent | null;
  gaze: DetectionEvent | null;
  // The live camera stream, so a screen can show a preview of what's being sent.
  stream: MediaStream | null;
};

export function useCvDetection(enabled: boolean): CvStatus {
  const [status, setStatus] = useState<CvStatus>({
    connected: false,
    phone: null,
    gaze: null,
    stream: null,
  });

  useEffect(() => {
    // Only run detection when the caller turns it on (e.g. during a session).
    if (!enabled) {
      return;
    }

    // Ask the main process to start the Python worker (it's reference-counted
    // and started on demand). connectWithRetry below waits out its boot.
    window.taskmaster?.cv?.request();

    // `cancelled` guards against async work finishing after we've torn down.
    let cancelled = false;
    let socket: WebSocket | null = null;
    let stream: MediaStream | null = null;
    let intervalId: number | null = null;

    // Off-screen elements: a <video> to play the camera stream and a <canvas>
    // to draw + encode each frame. They never get added to the page.
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    async function start() {
      // 1. Open the camera the user selected in onboarding (or the default).
      const savedCameraId = localStorage.getItem(SELECTED_CAMERA_KEY);
      stream = await navigator.mediaDevices.getUserMedia({
        video: savedCameraId ? { deviceId: { exact: savedCameraId } } : true,
        audio: false,
      });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();

      // Expose the stream so a screen can show a live preview of it.
      setStatus((prev) => ({ ...prev, stream }));

      // 2. Connect to the Python worker. It may take a moment to boot, so retry.
      socket = await connectWithRetry(() => cancelled);
      if (cancelled || !socket) {
        return;
      }
      setStatus((prev) => ({ ...prev, connected: true }));

      // 3. Handle replies: each message is one event (phone or gaze). Store it
      //    under its type so the UI always has the latest of each.
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as DetectionEvent;
          setStatus((prev) => ({ ...prev, [event.type]: event }));
        } catch {
          // Ignore anything that isn't valid JSON.
        }
      };
      socket.onclose = () => {
        setStatus((prev) => ({ ...prev, connected: false }));
      };

      // 4. Once a second: draw the current frame, encode to JPEG, send it.
      intervalId = window.setInterval(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        if (!context || video.videoWidth === 0) return;

        // Downscale to TARGET_WIDTH, keeping the aspect ratio.
        const scale = TARGET_WIDTH / video.videoWidth;
        canvas.width = TARGET_WIDTH;
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // toBlob is async; send the JPEG bytes once they're ready.
        canvas.toBlob(
          (blob) => {
            if (blob && socket && socket.readyState === WebSocket.OPEN) {
              socket.send(blob);
            }
          },
          "image/jpeg",
          JPEG_QUALITY,
        );
      }, CAPTURE_INTERVAL_MS);
    }

    start().catch((error) => {
      console.error("[cv] could not start detection:", error);
    });

    // Cleanup on unmount / when `enabled` flips off: stop everything so the
    // camera light goes off and the socket closes.
    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      socket?.close();
      stream?.getTracks().forEach((track) => track.stop());
      // Let the main process know we no longer need the worker; it stops once
      // the last consumer releases (after a short grace period).
      window.taskmaster?.cv?.release();
    };
  }, [enabled]);

  return status;
}

/**
 * Open the WebSocket, retrying until it connects (the Python worker may still
 * be starting up). Gives up after a number of attempts, or if cancelled.
 */
function connectWithRetry(isCancelled: () => boolean): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20;

    const attempt = () => {
      if (isCancelled()) {
        resolve(null);
        return;
      }

      const ws = new WebSocket(WS_URL);

      ws.onopen = () => resolve(ws);

      ws.onerror = () => {
        ws.close();
        attempts += 1;
        if (attempts >= maxAttempts || isCancelled()) {
          resolve(null);
        } else {
          setTimeout(attempt, 500); // wait, then try again
        }
      };
    };

    attempt();
  });
}
