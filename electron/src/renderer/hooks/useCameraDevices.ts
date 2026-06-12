/**
 * Camera device hook for the onboarding camera setup step.
 *
 * This hook is responsible for:
 * - requesting camera permission
 * - listing available video input devices
 * - remembering the selected camera in localStorage
 * - opening a preview stream for the selected camera
 * - stopping the preview stream when the camera step unmounts
 *
 * Important:
 * This hook should only be used by the camera setup screen. When that screen is
 * no longer mounted, the cleanup effect stops the camera so the webcam light
 * turns off.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type CameraStatus =
  | "checking"
  | "connected"
  | "no-camera"
  | "permission-denied"
  | "error";

const SELECTED_CAMERA_KEY = "taskmaster:selectedCameraId";

export function useCameraDevices() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("checking");

  /**
   * Keep the active stream in a ref so cleanup functions can stop the latest
   * stream without depending on React state timing.
   */
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Stops the currently active camera stream.
   *
   * This is used when:
   * - switching from one camera to another
   * - leaving the camera setup step
   * - cancelling an async camera request after the component unmounts
   */
  const stopCurrentStream = useCallback(() => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  /**
   * Updates the selected camera and persists the choice.
   *
   * The actual camera stream is opened by the selectedCameraId effect below.
   */
  const selectCamera = useCallback((cameraId: string): void => {
    setSelectedCameraId(cameraId);
    localStorage.setItem(SELECTED_CAMERA_KEY, cameraId);
  }, []);


/**
 * On mount, request permission and load the list of available cameras.
 *
 * getUserMedia is called first because some browsers/Electron builds do not
 * reveal camera labels until permission has been granted.
 */
useEffect(() => {
    let isCancelled = false;

    async function detectCameras() {
      try {
        const permissionStream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

        /**
         * This stream is only used to unlock permission/device labels.
         * Stop it immediately because the selected camera preview is opened in
         * the next effect.
         */
        permissionStream.getTracks().forEach((track) => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        if (isCancelled) {
          return;
        }

        setCameras(videoDevices);

        if (videoDevices.length === 0) {
          setCameraStatus("no-camera");
          return;
        }

        const savedCameraId = localStorage.getItem(SELECTED_CAMERA_KEY);

        const savedCameraStillExists = videoDevices.some(
          (camera) => camera.deviceId === savedCameraId,
        );

        const cameraIdToUse =
          savedCameraId && savedCameraStillExists
            ? savedCameraId
            : videoDevices[0].deviceId;

        setSelectedCameraId(cameraIdToUse);
        localStorage.setItem(SELECTED_CAMERA_KEY, cameraIdToUse);
      } catch (error) {
        console.error("Error accessing cameras:", error);

        if (isCancelled) {
          return;
        }

        if (
          error instanceof DOMException &&
          error.name === "NotAllowedError"
        ) {
          setCameraStatus("permission-denied");
        } else {
          setCameraStatus("error");
        }
      }
    }

    void detectCameras();

    return () => {
      isCancelled = true;
    };
  }, []);

  /**
   * Open the preview stream whenever the selected camera changes.
   *
   * Leaving the camera step unmounts the component, which triggers the final
   * cleanup effect below and turns the camera off.
   */
  useEffect(() => {
    if (!selectedCameraId) {
      return;
    }

    let isCancelled = false;

    async function openSelectedCamera() {
      try {
        stopCurrentStream();

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCameraId } },
          audio: false,
        });

        if (isCancelled) {
          newStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = newStream;
        setStream(newStream);
        setCameraStatus("connected");
      } catch (error) {
        console.error("Error starting camera:", error);

        if (!isCancelled) {
          setCameraStatus("error");
        }
      }
    }

    void openSelectedCamera();

    return () => {
      isCancelled = true;
    };
  }, [selectedCameraId, stopCurrentStream]);

   /**
   * Final unmount cleanup.
   *
   * This is an important part for the onboarding flow:
   * when the user leaves the camera setup step, the preview stream stops and
   * the webcam is released.
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    cameras,
    selectedCameraId,
    selectCamera,
    stream,
    cameraStatus,
  };
}
