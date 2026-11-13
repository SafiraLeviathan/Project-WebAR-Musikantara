import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { CalibrationSettings, GestureDelta } from '../types/app';

const WASM_ROOT = '/mediapipe/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type HandStatus = 'off' | 'loading' | 'ready' | 'not-found' | 'error';

export function useHandTracking(
  video: HTMLVideoElement | null,
  enabled: boolean,
  settings: CalibrationSettings,
  onGesture: (delta: GestureDelta) => void,
) {
  const [status, setStatus] = useState<HandStatus>('off');
  const [message, setMessage] = useState('Kontrol gestur nonaktif.');
  const callbackRef = useRef(onGesture);
  const settingsRef = useRef(settings);
  callbackRef.current = onGesture;
  settingsRef.current = settings;

  useEffect(() => {
    if (!enabled || !video) {
      setStatus('off');
      setMessage('Kontrol gestur nonaktif.');
      return;
    }

    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let disposed = false;
    let lastTime = -1;
    let previousCenter: { x: number; y: number } | null = null;
    let previousPinch: number | null = null;
    let smoothedX = 0;
    let smoothedY = 0;
    let noHandFrames = 0;
    let handPreviouslyVisible = false;
    let noHandStatusReported = false;

    async function initialize() {
      setStatus('loading');
      setMessage('Memuat model pengenal tangan…');
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
        try {
          landmarker = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.55,
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.55,
          });
        }
        if (disposed) {
          landmarker.close();
          return;
        }
        setStatus('not-found');
        setMessage('Model pengenal aktif. Tunjukkan telapak tangan ke kamera.');
        detectFrame();
      } catch (error) {
        if (disposed) return;
        console.error('MediaPipe initialization failed:', error);
        setStatus('error');
        setMessage('Model atau modul MediaPipe gagal dimuat. Periksa koneksi internet dan muat ulang aplikasi.');
      }
    }

    function detectFrame() {
      if (disposed || !landmarker) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const hand = result.landmarks?.[0];
        if (hand && hand.length >= 21) {
          noHandFrames = 0;
          const center = {
            x: (hand[0].x + hand[5].x + hand[9].x + hand[13].x + hand[17].x) / 5,
            y: (hand[0].y + hand[5].y + hand[9].y + hand[13].y + hand[17].y) / 5,
          };
          const pinch = Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y);
          if (previousCenter && previousPinch !== null) {
            const smoothing = settingsRef.current.smoothing;
            const alpha = 1 - smoothing;
            const dx = center.x - previousCenter.x;
            const dy = center.y - previousCenter.y;
            smoothedX = smoothedX * smoothing + dx * alpha;
            smoothedY = smoothedY * smoothing + dy * alpha;
            const deadZone = 0.0025;
            const correctedX = Math.abs(smoothedX) < deadZone ? 0 : smoothedX;
            const correctedY = Math.abs(smoothedY) < deadZone ? 0 : smoothedY;
            const pinchDelta = pinch - previousPinch;
            const scaleFactor = Math.abs(pinchDelta) < 0.0015
              ? 1
              : Math.min(1.04, Math.max(0.96, 1 + pinchDelta * settingsRef.current.scaleSensitivity * 0.85));
            callbackRef.current({
              rotation: correctedX * settingsRef.current.rotationSensitivity * 5.2,
              tilt: correctedY * settingsRef.current.movementSensitivity * 4.4,
              scaleFactor,
            });
          }
          previousCenter = center;
          previousPinch = pinch;
          if (!handPreviouslyVisible) {
            setStatus('ready');
            setMessage('Tangan terdeteksi. Gerakkan tangan untuk mengendalikan model.');
          }
          handPreviouslyVisible = true;
          noHandStatusReported = false;
        } else {
          noHandFrames += 1;
          previousCenter = null;
          previousPinch = null;
          smoothedX = 0;
          smoothedY = 0;
          if (noHandFrames > 12 && !noHandStatusReported) {
            handPreviouslyVisible = false;
            noHandStatusReported = true;
            setStatus('not-found');
            setMessage('Tangan belum terlihat. Letakkan satu tangan di depan kamera.');
          }
        }
      }
      rafId = requestAnimationFrame(detectFrame);
    }

    void initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      landmarker?.close();
    };
  }, [enabled, video]);

  return { status, message };
}
