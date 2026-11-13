import { useEffect, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'error';

function cameraErrorMessage(error: unknown): { status: CameraStatus; message: string } {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return { status: 'denied', message: 'Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi.' };
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return { status: 'unavailable', message: 'Kamera tidak ditemukan pada perangkat ini.' };
    }
    if (error.name === 'NotReadableError') {
      return { status: 'error', message: 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.' };
  }
  }
  return { status: 'error', message: 'Kamera tidak dapat dibuka. Periksa izin dan koneksi kamera perangkat.' };
}

export function useHiddenCamera(active: boolean) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [message, setMessage] = useState('Kamera belum dinyalakan.');

  useEffect(() => {
    if (!active) {
      setVideo(null);
      setStatus('idle');
      setMessage('Kamera belum dinyalakan.');
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;
    const hiddenVideo = document.createElement('video');
    hiddenVideo.muted = true;
    hiddenVideo.playsInline = true;
    hiddenVideo.autoplay = true;
    hiddenVideo.setAttribute('aria-hidden', 'true');
    hiddenVideo.style.position = 'fixed';
    hiddenVideo.style.width = '1px';
    hiddenVideo.style.height = '1px';
    hiddenVideo.style.opacity = '0';
    hiddenVideo.style.pointerEvents = 'none';
    hiddenVideo.style.left = '-10px';
    hiddenVideo.style.top = '-10px';
    document.body.appendChild(hiddenVideo);

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        setMessage('Browser tidak menyediakan akses kamera. Gunakan browser modern melalui localhost atau HTTPS.');
        return;
      }
      setStatus('requesting');
      setMessage('Meminta izin kamera…');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'environment' : 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        hiddenVideo.srcObject = stream;
        await hiddenVideo.play();
        if (cancelled) return;
        setVideo(hiddenVideo);
        setStatus('ready');
        setMessage('Kamera aktif. Arahkan telapak tangan ke kamera.');
      } catch (error) {
        const result = cameraErrorMessage(error);
        setStatus(result.status);
        setMessage(result.message);
      }
    }

    void start();
    return () => {
      cancelled = true;
      hiddenVideo.pause();
      hiddenVideo.srcObject = null;
      hiddenVideo.remove();
      stream?.getTracks().forEach((track) => track.stop());
      setVideo(null);
    };
  }, [active]);

  return { video, status, message };
}
