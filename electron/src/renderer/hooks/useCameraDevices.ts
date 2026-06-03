// detect camera devices and manage camera stream for onboarding camera setup step
import { useEffect, useState } from "react";

type CameraStatus =
  | "checking"
  | "connected"
  | "no-camera"
  | "permission-denied"
  | "error";

export function useCameraDevices() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("checking");

  const SELECTED_CAMERA_KEY = "taskmaster:selectedCameraId";

  async function selectCamera(cameraId: string): Promise<void> {
    setSelectedCameraId(cameraId);
    localStorage.setItem(SELECTED_CAMERA_KEY, cameraId);
  }

  async function loadCameras(): Promise<void> {
    try {
      setCameraStatus("checking");

      const permissionStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      permissionStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      setCameras(videoDevices);

      if (videoDevices.length === 0) {
        setCameraStatus("no-camera");
        return;
      }

      const savedCameraId = localStorage.getItem(SELECTED_CAMERA_KEY);

      const savedCameraStillExists = videoDevices.some(
        (camera) => camera.deviceId === savedCameraId,
      );

      if (savedCameraId && savedCameraStillExists) {
        await selectCamera(savedCameraId);
      } else {
        await selectCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error("Error accessing cameras:", error);

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setCameraStatus("permission-denied");
      } else {
        setCameraStatus("error");
      }
    }
  }

  async function startCamera(deviceId: string): Promise<void> {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });

      setStream(newStream);
      setCameraStatus("connected");
    } catch (error) {
      console.error(error);
      setCameraStatus("error");
    }
  }

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    if (selectedCameraId) {
      startCamera(selectedCameraId);
    }
  }, [selectedCameraId]);

  return {
    cameras,
    selectedCameraId,
    selectCamera,
    stream,
		cameraStatus,
  };
}
